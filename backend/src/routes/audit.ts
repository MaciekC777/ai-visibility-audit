import { Router } from 'express';
import { z } from 'zod';
import { runAuditInit } from '../modules/audit/auditInit';
import { logger } from '../utils/logger';

const router = Router();

// Domain must be a valid hostname (no protocol, no path)
const DOMAIN_RE = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

const initBodySchema = z.object({
  domain: z
    .string({ required_error: 'domain is required' })
    .min(3)
    .max(253)
    .transform(v =>
      v.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, ''),
    )
    .refine(v => DOMAIN_RE.test(v), { message: 'Invalid domain format' }),

  keywords: z
    .array(z.string().max(50, 'Keyword too long (max 50 chars)'))
    .max(5, 'Maximum 5 keywords allowed')
    .optional()
    .default([]),

  businessType: z.enum(['saas', 'local_business'], {
    required_error: 'businessType is required',
    invalid_type_error: 'businessType must be "saas" or "local_business"',
  }),
});

/**
 * POST /audit/init
 * Scrapes the domain and returns 8 generated audit prompts + scraping metadata.
 * Does NOT run prompts against AI models — that is a separate step.
 */
router.post('/init', async (req, res) => {
  const parsed = initBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const result = await runAuditInit(parsed.data);
    return res.status(200).json(result);
  } catch (err) {
    logger.error('POST /audit/init failed', { error: err });
    return res.status(500).json({ error: 'Audit initialization failed' });
  }
});

export default router;
