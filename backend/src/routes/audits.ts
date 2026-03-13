import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../utils/supabase';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { runAuditPipeline } from '../jobs/auditPipeline';
import { PLAN_LIMITS, REGION_LANGUAGE } from '../config/constants';
import { PlanType, BusinessMode, Region, Language } from '../types';
import { logger } from '../utils/logger';

const router = Router();

const createAuditSchema = z.object({
  domain: z.string().min(3).max(255),
  businessMode: z.enum(['saas', 'local']).default('saas'),
  region: z.enum(['global', 'germany', 'france', 'spain', 'poland', 'portugal']).default('global'),
  language: z.enum(['en', 'de', 'fr', 'es', 'pl', 'pt']).optional(),
  keywords: z.array(z.string().max(80)).max(10).optional(),
  // Legacy fields kept for backwards compat
  targetKeywords: z.array(z.string()).optional(),
  targetMarket: z.string().optional(),
  targetLanguage: z.string().optional(),
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

  const {
    domain,
    businessMode,
    region,
    keywords,
    targetKeywords,
    targetMarket,
  } = parsed.data;

  // Resolve language: explicit > auto from region > legacy > default en
  const resolvedLanguage: Language =
    (parsed.data.language as Language) ||
    (parsed.data.targetLanguage as Language) ||
    REGION_LANGUAGE[region as Region] ||
    'en';

  // Merge keywords
  const allKeywords = [
    ...(keywords ?? []),
    ...(targetKeywords ?? []),
  ].slice(0, 10);

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
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const { data: audit, error } = await supabaseAdmin
    .from('audits')
    .insert({
      user_id: userId,
      domain: cleanDomain,
      target_keywords: allKeywords.length > 0 ? allKeywords : null,
      target_market: region,
      target_language: resolvedLanguage,
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
  runAuditPipeline({
    auditId: audit.id,
    domain: cleanDomain,
    plan,
    businessMode: businessMode as BusinessMode,
    region: region as Region,
    language: resolvedLanguage,
    keywords: allKeywords,
  }).catch(err => logger.error('Pipeline error', { auditId: audit.id, err }));

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
