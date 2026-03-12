import { supabaseAdmin } from '../utils/supabase';
import { logger } from '../utils/logger';
import { scrapeBrandProfile, analyzeWebsiteReadiness } from '../services/scraper';
import { checkThirdPartyPresence } from '../services/thirdPartyChecker';
import { generatePrompts } from '../services/promptGenerator';
import { queryAllModels } from '../services/aiQueryService';
import { analyzeVisibility, analyzeSentiment, extractCompetitors } from '../services/analyzer';
import { detectHallucinations } from '../services/hallucinationDetector';
import { calculateAllScores } from '../services/scorer';
import { generateRecommendations } from '../services/recommendationGenerator';
import { PLAN_LIMITS } from '../config/constants';
import { PlanType, AuditStatus } from '../types';
import { SCRAPE_PATHS } from '../config/constants';

async function setStatus(auditId: string, status: AuditStatus, extra?: Record<string, unknown>) {
  await supabaseAdmin
    .from('audits')
    .update({ status, ...extra })
    .eq('id', auditId);
}

async function saveResult(auditId: string, resultType: string, data: unknown) {
  await supabaseAdmin.from('audit_results').insert({
    audit_id: auditId,
    result_type: resultType,
    data,
  });
}

export async function runAuditPipeline(
  auditId: string,
  domain: string,
  plan: PlanType,
  targetLanguage = 'en'
) {
  logger.info(`Starting audit pipeline`, { auditId, domain });

  try {
    // Step 1: Scrape
    await setStatus(auditId, 'scraping');
    const profile = await scrapeBrandProfile(domain);
    await saveResult(auditId, 'brand_profile', profile);

    // Also analyze website readiness during scrape
    const pages: Record<string, string> = {};
    for (const path of SCRAPE_PATHS) {
      try {
        const res = await fetch(
          `${domain.startsWith('http') ? domain : `https://${domain}`}${path}`,
          { signal: AbortSignal.timeout(10_000) }
        );
        if (res.ok) pages[path] = await res.text();
      } catch {}
    }
    const websiteReadiness = await analyzeWebsiteReadiness(domain, pages);
    await saveResult(auditId, 'website_readiness', websiteReadiness);

    // Update brand_name in audit row
    await supabaseAdmin
      .from('audits')
      .update({ brand_name: profile.brandName })
      .eq('id', auditId);

    // Step 2: Third-party check
    await setStatus(auditId, 'third_party_check');
    const thirdParty = await checkThirdPartyPresence(domain);
    await saveResult(auditId, 'third_party', thirdParty);

    // Step 3: Generate prompts
    await setStatus(auditId, 'generating_prompts');
    const prompts = generatePrompts(profile, plan, targetLanguage);
    await supabaseAdmin
      .from('audits')
      .update({ total_prompts: prompts.length })
      .eq('id', auditId);

    // Step 4: Query models
    await setStatus(auditId, 'querying_models');
    const models = PLAN_LIMITS[plan].models;
    const responses = await queryAllModels(prompts, models);
    await saveResult(auditId, 'prompt_results', responses);
    await supabaseAdmin
      .from('audits')
      .update({ models_queried: models })
      .eq('id', auditId);

    // Step 5: Analyze visibility
    await setStatus(auditId, 'analyzing');
    const visibilityAnalysis = analyzeVisibility(responses, profile.brandName, prompts);
    await saveResult(auditId, 'visibility_analysis', visibilityAnalysis);

    // Step 6: Detect hallucinations
    const hallucinations = await detectHallucinations(responses, profile);
    await saveResult(auditId, 'hallucinations', hallucinations);

    // Step 7: Analyze sentiment
    const sentiments = analyzeSentiment(responses, profile.brandName);
    await saveResult(auditId, 'sentiment', sentiments);

    // Step 8: Extract competitors
    const competitors = extractCompetitors(responses, profile.brandName);
    await saveResult(auditId, 'competitors', competitors);

    // Step 9: Score + Recommendations
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
      thirdParty
    );
    await saveResult(auditId, 'recommendations', recommendations);

    await setStatus(auditId, 'completed', {
      visibility_score: scores.visibilityScore,
      accuracy_score: scores.accuracyScore,
      perception_score: scores.perceptionScore,
      market_rank: scores.marketRank,
      completed_at: new Date().toISOString(),
    });

    logger.info(`Audit pipeline completed`, { auditId, scores });
  } catch (err) {
    logger.error(`Audit pipeline failed`, { auditId, error: err });
    await supabaseAdmin
      .from('audits')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq('id', auditId);
  }
}
