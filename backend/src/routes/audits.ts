import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../utils/supabase';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { runAuditPipeline } from '../jobs/auditPipeline';
import { PLAN_LIMITS } from '../config/constants';
import { PlanType } from '../types';
import { logger } from '../utils/logger';

const router = Router();

const createAuditSchema = z.object({
  domain: z.string().min(3).max(255),
  targetKeywords: z.array(z.string()).optional(),
  targetMarket: z.string().default('global'),
  targetLanguage: z.string().default('en'),
});

router.use(authMiddleware);
router.use(rateLimiter);

// POST /audits — create and start audit
router.post('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const plan = ((req as any).userPlan ?? 'free') as PlanType;

  const parsed = createAuditSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { domain, targetKeywords, targetMarket, targetLanguage } = parsed.data;

  // Check monthly limit
  const limits = PLAN_LIMITS[plan];
  if (limits.auditsPerMonth !== Infinity) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabaseAdmin
      .from('audits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if ((count ?? 0) >= limits.auditsPerMonth) {
      res.status(429).json({ error: 'Monthly audit limit reached. Please upgrade your plan.' });
      return;
    }
  }

  // Create audit row
  const { data: audit, error } = await supabaseAdmin
    .from('audits')
    .insert({
      user_id: userId,
      domain: domain.replace(/^https?:\/\//, ''),
      target_keywords: targetKeywords,
      target_market: targetMarket,
      target_language: targetLanguage,
      plan,
      status: 'pending',
    })
    .select()
    .single();

  if (error || !audit) {
    logger.error('Failed to create audit row', { error });
    res.status(500).json({ error: 'Failed to create audit' });
    return;
  }

  // Fire pipeline async
  runAuditPipeline(audit.id, domain, plan, targetLanguage).catch((err) =>
    logger.error('Pipeline error', { auditId: audit.id, err })
  );

  res.status(201).json({ audit });
});

// GET /audits — list user audits
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { data, error } = await supabaseAdmin
    .from('audits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    res.status(500).json({ error: 'Failed to fetch audits' });
    return;
  }
  res.json({ audits: data });
});

// GET /audits/:id — get single audit + results
router.get('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const { data: audit, error } = await supabaseAdmin
    .from('audits')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !audit) {
    res.status(404).json({ error: 'Audit not found' });
    return;
  }

  const { data: results } = await supabaseAdmin
    .from('audit_results')
    .select('*')
    .eq('audit_id', id);

  res.json({ audit, results: results ?? [] });
});

// DELETE /audits/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('audits')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    res.status(500).json({ error: 'Failed to delete audit' });
    return;
  }
  res.json({ success: true });
});

export default router;
