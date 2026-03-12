import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { authMiddleware } from '../middleware/auth';
import { env } from '../config/env';
import { supabaseAdmin } from '../utils/supabase';
import { logger } from '../utils/logger';

const router = Router();
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  starter: env.STRIPE_STARTER_PRICE_ID,
  pro: env.STRIPE_PRO_PRICE_ID,
  agency: env.STRIPE_AGENCY_PRICE_ID,
};

// POST /stripe/checkout — create Stripe checkout session
router.post('/checkout', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { plan } = req.body as { plan: string };

  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId) {
    res.status(400).json({ error: 'Invalid plan' });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.FRONTEND_URL}/settings?checkout=success`,
      cancel_url: `${env.FRONTEND_URL}/pricing`,
      metadata: { userId, plan },
    });
    res.json({ url: session.url });
  } catch (e) {
    logger.error('Stripe checkout error', { e });
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /stripe/portal — billing portal
router.post('/portal', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  if (!sub?.stripe_customer_id) {
    res.status(400).json({ error: 'No subscription found' });
    return;
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${env.FRONTEND_URL}/settings`,
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

// POST /stripe/webhook — Stripe webhooks
router.post(
  '/webhook',
  // Raw body needed for signature verification — apply before json middleware
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (e) {
      res.status(400).json({ error: `Webhook signature failed: ${(e as Error).message}` });
      return;
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, plan } = session.metadata ?? {};
        if (userId && plan) {
          await supabaseAdmin.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan,
            status: 'active',
          });
        }
      } else if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object as Stripe.Subscription;
        await supabaseAdmin
          .from('subscriptions')
          .update({ plan: 'free', status: 'canceled' })
          .eq('stripe_subscription_id', sub.id);
      } else if (event.type === 'customer.subscription.updated') {
        const sub = event.data.object as Stripe.Subscription;
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);
      }
    } catch (e) {
      logger.error('Webhook handler error', { e });
    }

    res.json({ received: true });
  }
);

export default router;
