import { supabaseAdmin } from '../utils/supabase';
import { logger } from '../utils/logger';
import { scrapeBrandProfile, analyzeWebsiteReadiness } from '../services/scraper';
import { checkThirdPartyPresence } from '../services/thirdPartyChecker';
import { generatePrompts } from '../services/promptGenerator';
import { queryAllModels } from '../services/aiQueryService';
import {
  analyzeVisibility,
  analyzeSentiment,
  extractCompetitors,
  analyzeSourcesCited,
} from '../services/analyzer';
import { detectHallucinations } from '../services/hallucinationDetector';
import { calculateAllScores } from '../services/scorer';
import { generateRecommendations } from '../services/recommendationGenerator';
import { generateSummary } from '../services/summaryGenerator';
import { findCompetitorsViaSearch } from '../services/competitorFinder';
import { PLAN_LIMITS } from '../config/constants';
import { AuditInput, AuditStatus, VisibilityAnalysis } from '../types';

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
  const { auditId, domain, plan, businessMode, region, language, keywords = [] } = input;

  logger.info('Starting audit pipeline', { auditId, domain, businessMode, region, language });

  try {
    // ── STEP 1: Scrape ── (0-15%)
    await setStatus(auditId, 'scraping');
    const profile = await scrapeBrandProfile(domain, businessMode);
    await saveResult(auditId, 'brand_profile', profile);

    // Update brand_name in audit row
    await supabaseAdmin
      .from('audits')
      .update({ brand_name: profile.brand.name })
      .eq('id', auditId);

    // ── STEP 2: Website Readiness ──
    const websiteReadiness = await analyzeWebsiteReadiness(domain, businessMode, profile);
    await saveResult(auditId, 'website_readiness', websiteReadiness);

    // ── STEP 2b: Competitor search (web) ──
    const competitorSearch = await findCompetitorsViaSearch(profile, language);
    await saveResult(auditId, 'competitor_search', competitorSearch);

    // ── STEP 3: Third-party check ── (15-25%)
    await setStatus(auditId, 'third_party_check');
    const thirdParty = await checkThirdPartyPresence(domain, businessMode, plan);
    await saveResult(auditId, 'third_party', thirdParty);

    // ── STEP 4: Generate prompts ── (25-30%)
    await setStatus(auditId, 'generating_prompts');
    const prompts = await generatePrompts(profile, plan, language, region, keywords);
    await supabaseAdmin
      .from('audits')
      .update({ total_prompts: prompts.length })
      .eq('id', auditId);

    logger.info('Generated prompts', { auditId, count: prompts.length });

    // ── STEP 5: Query AI models with web search ── (30-65%)
    await setStatus(auditId, 'querying_models');
    const models = PLAN_LIMITS[plan].models;
    const responses = await queryAllModels(prompts, models);
    await saveResult(auditId, 'prompt_results', responses);
    await supabaseAdmin
      .from('audits')
      .update({ models_queried: models })
      .eq('id', auditId);

    logger.info('Queried models', { auditId, responseCount: responses.length });

    // ── STEP 6: Analyze ── (65-78%)
    await setStatus(auditId, 'analyzing');

    // Visibility analysis (LLM-based mention detection)
    const visibilityAnalysis = await analyzeVisibility(responses, profile);
    await saveResult(auditId, 'visibility_analysis', visibilityAnalysis);

    // Sentiment analysis
    const sentiments = await analyzeSentiment(responses, profile.brand.name, language);
    await saveResult(auditId, 'sentiment', sentiments);

    // Competitor mapping
    const competitors = extractCompetitors(responses, profile.brand.name, visibilityAnalysis.promptMentions);
    await saveResult(auditId, 'competitors', competitors);

    // Source analysis
    const sourceAnalysis = analyzeSourcesCited(responses, domain);
    await saveResult(auditId, 'source_analysis', sourceAnalysis);

    // Hallucination detection (2-step)
    const hallucinations = await detectHallucinations(responses, profile, language);
    await saveResult(auditId, 'hallucinations', hallucinations);

    // ── STEP 7: Score + Recommendations ── (78-98%)
    await setStatus(auditId, 'scoring');

    const brandTotalMentions = Object.values(visibilityAnalysis.mentionsByModel).reduce(
      (a, b) => a + b,
      0
    );
    const scores = calculateAllScores(
      visibilityAnalysis,
      hallucinations,
      sentiments,
      competitors,
      brandTotalMentions
    );

    const recommendations = await generateRecommendations(
      profile,
      scores,
      websiteReadiness,
      thirdParty,
      hallucinations,
      competitors,
      sourceAnalysis,
      language
    );
    await saveResult(auditId, 'recommendations', recommendations);

    const summary = await generateSummary(
      profile,
      scores,
      competitors,
      sentiments,
      hallucinations,
      language
    );
    await saveResult(auditId, 'summary', summary);

    // ── Complete ──
    await setStatus(auditId, 'completed', {
      visibility_score: scores.visibilityScore,
      accuracy_score: scores.accuracyScore,
      perception_score: scores.perceptionScore,
      market_rank: scores.marketRank,
      completed_at: new Date().toISOString(),
    });

    logger.info('Audit pipeline completed', { auditId, scores });
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
