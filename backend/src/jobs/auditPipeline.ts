import { supabaseAdmin } from '../utils/supabase';
import { logger } from '../utils/logger';
import { scrapeBrandProfile } from '../services/scraper';
import { generatePrompts } from '../services/promptGenerator';
import { queryAllModels } from '../services/aiQueryService';
import { PLAN_LIMITS } from '../config/constants';
import { AuditInput, AuditStatus, BrandKnowledgeMap } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function setStatus(
  auditId: string,
  status: AuditStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  await supabaseAdmin
    .from('audits')
    .update({ status, ...extra })
    .eq('id', auditId);
}

async function saveResult(auditId: string, resultType: string, data: unknown): Promise<void> {
  await supabaseAdmin.from('audit_results').insert({
    audit_id: auditId,
    result_type: resultType,
    data,
  });
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function runAuditPipeline(input: AuditInput): Promise<void> {
  const { auditId, domain, plan, region, language, keywords = [] } = input;

  logger.info('Starting audit pipeline (simplified)', { auditId, domain, region, language });

  try {
    // ── STEP 1: Scrape ──
    await setStatus(auditId, 'scraping');
    const profile: BrandKnowledgeMap = await scrapeBrandProfile(domain);
    await saveResult(auditId, 'brand_profile', profile);
    await supabaseAdmin.from('audits').update({ brand_name: profile.brand_name }).eq('id', auditId);

    // ── STEP 2: Generate prompts ──
    await setStatus(auditId, 'generating_prompts');
    let prompts: any[] = [];
    try {
      prompts = await generatePrompts(profile, plan, language, region, keywords, []);
    } catch (e) {
      logger.error('Prompt generation failed', { auditId, error: e });
      throw e;
    }
    await supabaseAdmin.from('audits').update({ total_prompts: prompts.length }).eq('id', auditId);
    logger.info('Generated prompts', { auditId, count: prompts.length });

    // ── STEP 3: Query models ──
    await setStatus(auditId, 'querying_models');
    const models = PLAN_LIMITS[plan].models;
    let responses: any[] = [];
    try {
      responses = await queryAllModels(prompts, models);
    } catch (e) {
      logger.error('Model querying failed', { auditId, error: e });
      throw e;
    }
    await saveResult(auditId, 'prompt_results', responses);
    await supabaseAdmin.from('audits').update({ models_queried: models }).eq('id', auditId);
    logger.info('Queried models', { auditId, responseCount: responses.length });

    // ── STEP 4: Complete ──
    await setStatus(auditId, 'completed', {
      completed_at: new Date().toISOString(),
    });

    logger.info('Audit pipeline completed', { auditId });
  } catch (err) {
    logger.error('Audit pipeline failed', { auditId, error: err });
    await supabaseAdmin
      .from('audits')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq('id', auditId);
  }
}
