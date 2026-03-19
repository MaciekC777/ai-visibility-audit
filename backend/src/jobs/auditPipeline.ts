import { supabaseAdmin } from '../utils/supabase';
import { logger } from '../utils/logger';
import {
  scrapeBrandProfile,
  scrapeRawData,
  analyzeWebsiteReadiness,
} from '../services/scraper';
import { checkThirdPartyPresence } from '../services/thirdPartyChecker';
import { generatePrompts } from '../services/promptGenerator';
import { queryAllModels } from '../services/aiQueryService';
import {
  analyzeSourcesCited,
  runCategoryAnalysis,
  fuzzyMatch,
} from '../services/analyzer';
import { calculateAllScoresV3 } from '../services/scorer';
import { generateRecommendations } from '../services/recommendationGenerator';
import { generateSummary } from '../services/summaryGenerator';
import { findCompetitorsViaSearch } from '../services/competitorFinder';
import { evaluateChecklist } from '../services/checklistEvaluator';
import { PLAN_LIMITS } from '../config/constants';
import {
  AuditInput,
  AuditStatus,
  ChecklistResult,
  BrandKnowledgeMap,
} from '../types';

// ─── BrandKnowledgeMap → legacy BrandProfile adapter ─────────────────────────
// Old services (recommendations, summary, hallucinations, prompts) expect
// profile.brand.name, profile.features.core etc. This adapter shims those fields.

function toCompatProfile(p: BrandKnowledgeMap): any {
  return {
    ...p,
    // legacy nested shape
    brand: {
      name: p.brand_name,
      domain: '',
      description: p.one_liner,
      tagline: p.one_liner,
      category: p.category,
      subcategories: p.subcategories ?? [],
      founded_year: p.founding_year ?? '',
      headquarters: p.location?.city ?? '',
    },
    mode: (p.business_type === 'local_business' || p.business_type === 'restaurant') ? 'local' : 'saas',
    features: {
      core: p.key_features ?? [],
      differentiators: p.unique_selling_points ?? [],
      integrations: p.integrations ?? [],
      platforms: [],
    },
    pricing: {
      currency: 'USD',
      model: p.pricing?.model ?? 'unknown',
      plans: (p.pricing?.plans ?? []).map((pl: any) => ({
        name: pl.name,
        price: pl.price,
        billing_period: 'month',
        key_limits: pl.highlights ?? [],
      })),
      free_trial: false,
      enterprise: false,
    },
    location: {
      address: p.contact_info?.address ?? '',
      city: p.location?.city ?? '',
      region: p.location?.region ?? '',
      country: p.location?.country ?? '',
      postal_code: '',
    },
    contact: {
      phone: p.contact_info?.phone ?? '',
      email: p.contact_info?.email ?? '',
      opening_hours: {},
    },
    services: {
      primary: p.core_offerings ?? [],
      secondary: [],
      specialties: p.signature_items ?? [],
    },
    competitors: {
      direct: p.competitors_from_website ?? [],
      indirect: p.competitors_likely ?? [],
      local: p.competitors_from_website ?? [],
      chains: p.competitors_likely ?? [],
    },
    verifiable_facts: p.verifiable_facts ?? [],
    website_meta: {
      has_schema_org: false,
      schema_types_found: [],
      has_llms_txt: false,
      has_sitemap: false,
      has_robots_txt: false,
      ai_bots_allowed: 'unknown',
      ssl: false,
      has_faq: false,
      has_pricing_page: (p.pricing?.plans?.length ?? 0) > 0,
      languages_detected: ['en'],
    },
  };
}

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

  logger.info('Starting audit pipeline (v2)', { auditId, domain, region, language });

  try {
    // ── STEP 1: Scrape + LLM extraction ──
    await setStatus(auditId, 'scraping');

    let rawData = await (async () => {
      try {
        return await scrapeRawData(domain);
      } catch (e) {
        logger.error('Raw scrape failed', { auditId, error: e });
        return {
          domain,
          pages: [] as any[],
          nav_links: [] as string[],
          technical_signals: {
            ssl: false, sitemap_exists: false, robots_txt: '', gptbot_allowed: true,
            claudebot_allowed: true, perplexitybot_allowed: true, google_extended_allowed: true,
            llms_txt_exists: false, hreflang_tags: [], schema_types: [], has_opengraph: false,
          },
        };
      }
    })();

    const profile: BrandKnowledgeMap = await scrapeBrandProfile(domain);
    const compatProfile = toCompatProfile(profile);  // adapter for legacy services
    await saveResult(auditId, 'brand_profile', profile);
    await supabaseAdmin.from('audits').update({ brand_name: profile.brand_name }).eq('id', auditId);

    // ── STEP 1b: Website readiness ──
    let websiteReadiness;
    try {
      websiteReadiness = await analyzeWebsiteReadiness(domain, profile.business_type, profile, rawData);
    } catch (e) {
      logger.error('Website readiness failed', { auditId, error: e });
      websiteReadiness = { mode: profile.business_type, checks: [], score: 0 };
    }
    await saveResult(auditId, 'website_readiness', websiteReadiness);

    // ── STEP 2b: Competitor seed ──
    let competitorSearch = { competitors: [] as Array<{ name: string }>, searchQueries: [] as string[] };
    try {
      competitorSearch = await findCompetitorsViaSearch(profile, language);
    } catch (e) {
      logger.error('Competitor search failed', { auditId, error: e });
    }
    await saveResult(auditId, 'competitor_search', competitorSearch);
    const seedCompetitors = (competitorSearch.competitors ?? []).map(c => c.name).filter(Boolean);

    // ── STEP 3: Third-party check ──
    await setStatus(auditId, 'third_party_check');
    let thirdParty: any[] = [];
    try {
      thirdParty = await checkThirdPartyPresence(domain, profile.business_type, plan);
    } catch (e) {
      logger.error('Third-party check failed', { auditId, error: e });
    }
    await saveResult(auditId, 'third_party', thirdParty);

    // ── STEP 3b: Checklist ──
    let checklistGaps: ChecklistResult[] = [];
    try {
      const checklistEval = evaluateChecklist(profile as any, thirdParty);
      await saveResult(auditId, 'checklist', checklistEval);
      checklistGaps = checklistEval.gaps;
      logger.info('Checklist evaluated', { auditId, score: checklistEval.score, gaps: checklistEval.gaps.length });
    } catch (e) {
      logger.warn('Checklist evaluation failed', { auditId, error: e });
    }

    // ── STEP 4: Generate prompts (or reuse from domain_prompts table) ──
    await setStatus(auditId, 'generating_prompts');
    let prompts: any[] = [];
    try {
      // Try to reuse existing prompts for this domain+language to ensure repeatability
      let reused = false;
      try {
        const { data: existingPrompts } = await supabaseAdmin
          .from('domain_prompts')
          .select('*')
          .eq('domain', domain)
          .eq('language', language);

        const NEW_CATEGORIES = new Set(['services', 'opinions', 'competitors']);
        const hasNewCategories = (existingPrompts ?? []).some((p: any) => NEW_CATEGORIES.has(p.category));
        if (existingPrompts && existingPrompts.length >= 8 && hasNewCategories) {
          prompts = existingPrompts.map((p: any) => ({
            id: p.id,
            promptCategory: p.category,
            text: p.prompt_text,
            prompt: p.prompt_text,
            language: p.language,
          }));
          reused = true;
          logger.info('Reusing domain prompts', { auditId, domain, count: prompts.length });
        }
      } catch {
        // domain_prompts table may not exist yet — fall through to generation
      }

      if (!reused) {
        prompts = await generatePrompts(compatProfile, plan, language, region, keywords, seedCompetitors);
        // Save prompts for future reuse
        try {
          const promptsToInsert = prompts.map((p: any) => ({
            domain,
            first_audit_id: auditId,
            category: p.promptCategory ?? 'discovery',
            prompt_text: p.text ?? p.prompt,
            language,
          }));
          await supabaseAdmin
            .from('domain_prompts')
            .upsert(promptsToInsert, { onConflict: 'domain,prompt_text' });
        } catch {
          // Non-fatal: table may not exist, skip silently
        }
      }
    } catch (e) {
      logger.error('Prompt generation failed', { auditId, error: e });
      throw e; // fatal — can't continue without prompts
    }
    await supabaseAdmin.from('audits').update({ total_prompts: prompts.length }).eq('id', auditId);
    logger.info('Generated prompts', { auditId, count: prompts.length });

    // ── STEP 5: Query models ──
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

    // ── STEP 6: Category analysis ──
    await setStatus(auditId, 'analyzing');

    let categoryResult: import('../types').CategoryAnalysisResult = {
      discovery: [], services: [], opinions: [], competitors: [], anchorList: [],
    };

    try {
      categoryResult = await runCategoryAnalysis(responses, profile);
      logger.info('Category analysis complete', {
        auditId,
        discovery: categoryResult.discovery.length,
        services: categoryResult.services.length,
        opinions: categoryResult.opinions.length,
        competitors: categoryResult.competitors.length,
        anchorList: categoryResult.anchorList.length,
      });
    } catch (e) {
      logger.error('Category analysis failed', { auditId, error: e });
    }

    // Save category extractions
    await saveResult(auditId, 'category_analysis', categoryResult);

    // Build competitors from anchor list (backward-compat Competitor[] shape)
    const competitors: import('../types').Competitor[] = categoryResult.anchorList.map(anchor => ({
      name: anchor.name,
      total_mentions: anchor.mention_count,
      co_mention_rate: categoryResult.competitors.filter(e => e.brand_mentioned && e.competitors.some(c => fuzzyMatch(c.name, anchor.name))).length / Math.max(categoryResult.competitors.length, 1),
      replacement_rate: categoryResult.competitors.filter(e => e.replacement_suggested && e.competitors.some(c => fuzzyMatch(c.name, anchor.name))).length / Math.max(categoryResult.competitors.length, 1),
      avg_position: 0,
      models: [...new Set(categoryResult.competitors.filter(e => e.competitors.some(c => fuzzyMatch(c.name, anchor.name))).map(e => e._model ?? 'unknown'))],
    }));

    // Build hallucinations from services extraction (backward-compat VerifiedClaim[] shape)
    const hallucinations: import('../types').VerifiedClaim[] = categoryResult.services.flatMap(ext =>
      (ext.hallucinations ?? []).map(h => ({
        claim_text: h.claim,
        claim_type: 'feature' as const,
        verifiable: true,
        model: ext._model ?? 'unknown',
        promptId: ext._promptId ?? 'unknown',
        mapped_fact_id: 'no_match',
        verdict: 'incorrect' as const,
        severity: (h.severity === 'critical' ? 'high' : h.severity === 'low' ? 'low' : 'medium') as 'high' | 'medium' | 'low',
        explanation: h.claim,
        correction: h.reality,
      }))
    );

    // Build sentiment from opinions extraction (backward-compat SentimentResult[] shape)
    const sentimentResults: import('../types').SentimentResult[] = categoryResult.opinions.map(ext => ({
      promptId: ext._promptId ?? 'unknown',
      model: ext._model ?? 'unknown',
      overall_sentiment: ext.overall_sentiment,
      tone: 'unknown' as const,
      specific_praise: ext.pros,
      specific_criticism: ext.cons,
      fabricated_opinions: false,
      fabricated_opinions_detail: null,
      recommendation_stance: (['strong_recommend', 'soft_recommend'].includes(ext.recommendation_strength)
        ? 'recommended' : ext.recommendation_strength === 'neutral' ? 'neutral' : 'discouraged') as 'recommended' | 'neutral' | 'discouraged',
    }));

    // Build visibility analysis from discovery (backward-compat VisibilityAnalysis shape)
    const brandFoundCount = categoryResult.discovery.filter(e => e.brand_found).length;
    const mentionRate = categoryResult.discovery.length > 0 ? brandFoundCount / categoryResult.discovery.length : 0;
    const allModels = [...new Set(responses.map(r => r.model))];
    const modelsWithMention = new Set(categoryResult.discovery.filter(e => e.brand_found).map(e => e._model ?? '')).size;
    const visibilityAnalysis: import('../types').VisibilityAnalysis = {
      mentionRate,
      positionScore: categoryResult.discovery.filter(e => e.brand_position).length > 0
        ? categoryResult.discovery.filter(e => e.brand_position).reduce((s, e) => s + (1 - (e.brand_position! - 1) / Math.max(e.total_mentioned - 1, 1)), 0) / categoryResult.discovery.filter(e => e.brand_position).length
        : 0,
      modelCoverage: allModels.length > 0 ? modelsWithMention / allModels.length : 0,
      categoryBreadth: 1,
      mentionsByModel: {},
      mentionsByCategory: { discovery: brandFoundCount },
      promptMentions: [],
      allPromptMentions: [],
    };

    const sourceAnalysis = analyzeSourcesCited(responses, domain);

    await saveResult(auditId, 'visibility_analysis', visibilityAnalysis);
    await saveResult(auditId, 'sentiment', sentimentResults);
    await saveResult(auditId, 'competitors', competitors);
    await saveResult(auditId, 'hallucinations', hallucinations);
    await saveResult(auditId, 'source_analysis', sourceAnalysis);

    // ── STEP 7: Scores ──
    await setStatus(auditId, 'scoring');

    const scores = calculateAllScoresV3(
      categoryResult,
      PLAN_LIMITS[plan].models,
      profile.brand_name
    );
    await saveResult(auditId, 'scores', scores);

    // Recommendations
    let recommendations: any[] = [];
    try {
      recommendations = await generateRecommendations(
        compatProfile,
        scores,
        websiteReadiness as any,
        thirdParty,
        hallucinations,
        competitors,
        sourceAnalysis,
        language,
        checklistGaps
      );
    } catch (e) {
      logger.error('Recommendation generation failed', { auditId, error: e });
    }
    await saveResult(auditId, 'recommendations', recommendations);

    // Summary
    let summary: any = null;
    try {
      summary = await generateSummary(
        compatProfile,
        scores,
        competitors,
        sentimentResults,
        hallucinations,
        language
      );
    } catch (e) {
      logger.error('Summary generation failed', { auditId, error: e });
    }
    if (summary) await saveResult(auditId, 'summary', summary);

    // ── Complete ──
    await setStatus(auditId, 'completed', {
      visibility_score: scores.visibilityScore,
      accuracy_score: scores.accuracyScore,
      perception_score: scores.perceptionScore,
      market_rank: scores.marketRank,
      completed_at: new Date().toISOString(),
    });

    logger.info('Audit pipeline v2 completed', { auditId, scores });
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
