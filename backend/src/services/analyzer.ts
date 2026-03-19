import OpenAI from 'openai';
import {
  ModelResponse,
  VisibilityAnalysis,
  SentimentResult,
  Competitor,
  MentionResult,
  PromptMentionResult,
  SourceAnalysis,
  BrandKnowledgeMap,
  UnifiedResponseAnalysis,
  ClaimForVerification,
  AggregatedResults,
} from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { LANGUAGE_NAMES } from '../config/constants';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// ─── Unified per-response analysis ───────────────────────────────────────────

async function analyzeOneResponse(
  response: ModelResponse,
  profile: BrandKnowledgeMap,
  seedCompetitors: string[]
): Promise<UnifiedResponseAnalysis> {
  const brandName = profile.brand_name;

  // Quick pre-filter
  if (!response.response || response.refused || response.explicit_unknown) {
    return {
      promptId: response.promptId,
      model: response.model,
      category: response.promptCategory,
      brand_mentioned: false,
      brand_name_used: null,
    };
  }

  const systemPrompt = `You are a brand analysis engine. Analyze an AI model's response and extract structured insights about brand visibility, sentiment, and competitors. Return ONLY valid JSON. No markdown.`;

  const userPrompt = `You are analyzing an AI model's response about the brand "${brandName}".

The user asked: "${response.promptText}"
Prompt category: ${response.promptCategory}
Business type: ${profile.business_type}
Category: ${profile.category}
Known competitors: ${seedCompetitors.slice(0, 10).join(', ') || 'none'}

The AI responded:
---
${response.response.slice(0, 3000)}
---

Analyze this response and return a JSON object with EXACTLY this structure:

{
  "mention_classification": "<one of: strong_recommend | recommended | listed | weak_mention | negative_mention | not_mentioned>",
  "position": <number (1-based position in any list) or null if not in a list>,
  "total_items_listed": <number of total items in the list or null>,
  "sentiment": "<positive | neutral | negative | mixed>",
  "has_authority_signals": <true if the response uses words like "leading", "popular", "trusted", "well-known", "established", "top", "best-in-class" about ${brandName}, false otherwise>,
  "competitors_mentioned": [<array of other brand/company names mentioned, excluding "${brandName}">],
  "claims": [
    {
      "text": "<specific factual claim about ${brandName}>",
      "category": "<pricing | feature | company_info | location | hours | service | contact | metric>",
      "verbatim_quote": <true if this is a direct quote from the response>
    }
  ],
  "brand_positioning": "<1 sentence: how does the AI position this brand, or null if not mentioned>"
}

Classification guide for mention_classification:
- "strong_recommend": AI explicitly and enthusiastically recommends ${brandName} as THE top/best choice.
- "recommended": AI recommends ${brandName} positively among good options, but not as the sole best.
- "listed": AI includes ${brandName} in a list or comparison neutrally, without strong endorsement or criticism.
- "weak_mention": AI mentions ${brandName} only briefly, tangentially, or in passing.
- "negative_mention": AI mentions ${brandName} in a critical or discouraging context.
- "not_mentioned": ${brandName} does not appear in the response.

For claims: extract ONLY specific, verifiable factual statements about ${brandName} (prices, features, dates, locations, integrations, team size, etc.). Do NOT extract opinions or subjective assessments.

Return ONLY valid JSON, no markdown, no explanation.`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 700,
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const raw = res.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);

    // ── Map new fields ──
    const mentionClassification = (parsed.mention_classification ?? 'not_mentioned') as string;
    const brandMentioned = mentionClassification !== 'not_mentioned';

    // Legacy mention_type derived from new classification
    const legacyMentionType = ((): 'recommended' | 'listed' | 'briefly_mentioned' | 'not_found' => {
      if (mentionClassification === 'strong_recommend' || mentionClassification === 'recommended') return 'recommended';
      if (mentionClassification === 'listed') return 'listed';
      if (mentionClassification === 'weak_mention' || mentionClassification === 'negative_mention') return 'briefly_mentioned';
      return 'not_found';
    })();

    // Legacy recommendation_stance derived from new classification
    const recommendationStance = ((): 'recommended' | 'neutral' | 'discouraged' => {
      if (mentionClassification === 'strong_recommend' || mentionClassification === 'recommended') return 'recommended';
      if (mentionClassification === 'negative_mention') return 'discouraged';
      return 'neutral';
    })();

    // Sentiment: new format is a flat string
    const flatSentiment = parsed.sentiment ?? 'neutral';
    const sentimentOverall = (['positive', 'neutral', 'negative', 'mixed'].includes(flatSentiment)
      ? flatSentiment : 'neutral') as 'positive' | 'neutral' | 'negative' | 'mixed';

    // Claims: map {text, category, verbatim_quote} → {statement, type, confidence}
    const claims = (parsed.claims ?? []).map((c: any) => ({
      statement: c.text ?? '',
      type: c.category ?? 'other',
      confidence: c.verbatim_quote ? 'stated_as_fact' : 'hedged',
    }));

    // Competitors: flat string[] → structured objects for legacy aggregation
    const competitorsInResponse = (parsed.competitors_mentioned ?? []).map((name: string) => ({
      name,
      position: null,
      sentiment: 'neutral' as const,
    }));

    return {
      promptId: response.promptId,
      model: response.model,
      category: response.promptCategory,
      brand_mentioned: brandMentioned,
      brand_name_used: brandMentioned ? brandName : null,
      // v2 fields
      mention_classification: mentionClassification as any,
      has_authority_signals: parsed.has_authority_signals ?? false,
      // legacy fields (derived from new data)
      visibility: {
        mention_type: legacyMentionType,
        position: parsed.position ?? null,
        total_items: parsed.total_items_listed ?? null,
        context: null,
      },
      sentiment: {
        overall: sentimentOverall,
        strengths_mentioned: [],
        weaknesses_mentioned: [],
        recommendation_stance: recommendationStance,
      },
      competitors_in_response: competitorsInResponse,
      positioning: undefined,
      claims,
    };
  } catch (e) {
    logger.error('Unified analysis LLM failed', { error: e, promptId: response.promptId });
    // Fallback: simple string check
    const brandLower = brandName.toLowerCase();
    const mentioned = response.response.toLowerCase().includes(brandLower);
    return {
      promptId: response.promptId,
      model: response.model,
      category: response.promptCategory,
      brand_mentioned: mentioned,
      brand_name_used: mentioned ? brandName : null,
      mention_classification: mentioned ? 'listed' : 'not_mentioned',
      has_authority_signals: false,
    };
  }
}

export async function runUnifiedAnalysis(
  responses: ModelResponse[],
  profile: BrandKnowledgeMap,
  seedCompetitors: string[]
): Promise<UnifiedResponseAnalysis[]> {
  const results: UnifiedResponseAnalysis[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < responses.length; i += BATCH_SIZE) {
    const batch = responses.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(r => analyzeOneResponse(r, profile, seedCompetitors))
    );
    results.push(...batchResults);
  }

  return results;
}

// ─── Competitor validation ────────────────────────────────────────────────────

export async function validateCompetitors(
  rawCompetitors: Array<{ name: string; count: number }>,
  profile: BrandKnowledgeMap
): Promise<string[]> {
  if (rawCompetitors.length === 0) return [];

  const systemPrompt = `You validate whether named items are actual businesses/companies. Return ONLY valid JSON. No markdown.`;

  const userPrompt = `Context: We are auditing "${profile.brand_name}" (${profile.business_type}, ${profile.category}).

The following names were extracted from AI responses as potential competitors:
${rawCompetitors.map(c => `- "${c.name}" (mentioned ${c.count} times)`).join('\n')}

For each name, determine if it is an actual named business (not a dish name, generic term, technology name, or adjective).

Return JSON:
[{ "name": "string", "is_business": true/false }]`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const raw = res.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : (parsed.results ?? Object.values(parsed)[0] ?? []);

    return (arr as any[])
      .filter(item => item.is_business === true)
      .map(item => item.name as string);
  } catch (e) {
    logger.error('Competitor validation failed', { error: e });
    // Fallback: return all names
    return rawCompetitors.map(c => c.name);
  }
}

// ─── Aggregation (pure math, no AI) ──────────────────────────────────────────

export function aggregateAnalysis(
  analyses: UnifiedResponseAnalysis[],
  responses: ModelResponse[],
  validatedCompetitors: string[],
  brandName: string = ''
): AggregatedResults {

  // ── Visibility Analysis ──
  // Discovery = prompts where the brand name does NOT appear in the question
  // (A_discovery, D_recommendation, K_keyword, F_local_list)
  const DISCOVERY_CATEGORIES = new Set([
    'discovery', 'A_discovery', 'D_recommendation', 'K_keyword', 'F_local_list',
  ]);
  const discoveryAnalyses = analyses.filter(a => DISCOVERY_CATEGORIES.has(a.category));

  const mentionedDiscovery = discoveryAnalyses.filter(a => a.brand_mentioned);
  const mentionRate = discoveryAnalyses.length > 0
    ? mentionedDiscovery.length / discoveryAnalyses.length
    : 0;

  // Position score
  const positionScores: number[] = [];
  for (const a of analyses) {
    if (a.brand_mentioned && a.visibility != null && a.visibility.position != null && a.visibility.total_items != null) {
      const pos = a.visibility.position;
      const total = a.visibility.total_items;
      if (total > 0) {
        positionScores.push(1 - (pos - 1) / total);
      }
    } else if (!a.brand_mentioned) {
      positionScores.push(0);
    }
  }
  const positionScore = positionScores.length > 0
    ? positionScores.reduce((acc, v) => acc + v, 0) / positionScores.length
    : 0;

  // Model coverage (discovery only)
  const allModels = [...new Set(responses.map(r => r.model))];
  const modelsWithDiscoveryMention = new Set(
    discoveryAnalyses.filter(a => a.brand_mentioned).map(a => a.model)
  );
  const modelCoverage = allModels.length > 0
    ? modelsWithDiscoveryMention.size / allModels.length
    : 0;

  // mentionsByModel — only count organic mentions (exclude prompts that already contain the brand name)
  const mentionsByModel: Record<string, number> = {};
  const mentionsByCategory: Record<string, number> = {};
  const brandLower = brandName.toLowerCase();
  const directPromptKeys = new Set(
    brandName
      ? responses
          .filter(r => brandLower && r.promptText.toLowerCase().includes(brandLower))
          .map(r => `${r.promptId}_${r.model}`)
      : []
  );
  for (const a of analyses.filter(a => a.brand_mentioned)) {
    const key = `${a.promptId}_${a.model}`;
    if (directPromptKeys.has(key)) continue; // skip — brand was named in the prompt itself
    mentionsByModel[a.model] = (mentionsByModel[a.model] ?? 0) + 1;
    mentionsByCategory[a.category] = (mentionsByCategory[a.category] ?? 0) + 1;
  }

  // Build PromptMentionResult[] for backward compat
  const promptMentions: PromptMentionResult[] = discoveryAnalyses.map(a => ({
    brand_mentioned: a.brand_mentioned,
    mention_type: a.visibility?.mention_type ?? (a.brand_mentioned ? 'briefly_mentioned' : 'not_found'),
    position_in_list: a.visibility?.position ?? null,
    total_items_in_list: a.visibility?.total_items ?? null,
    competitors_mentioned: (a.competitors_in_response ?? []).map(c => c.name),
    recommendation_strength: a.brand_mentioned ? 'one_of_many' : 'absent',
    context_snippet: a.visibility?.context ?? null,
    sources_referenced: responses.find(r => r.promptId === a.promptId && r.model === a.model)?.sources_cited ?? [],
    model: a.model,
    promptId: a.promptId,
  }));

  // Category breadth: % of distinct prompt categories with ≥1 organic brand mention
  const allCategories = new Set(analyses.map(a => a.category));
  const categoriesWithMention = new Set(
    analyses.filter(a => a.brand_mentioned).map(a => a.category)
  );
  const categoryBreadth = allCategories.size > 0
    ? categoriesWithMention.size / allCategories.size
    : 0;

  const visibilityAnalysis: VisibilityAnalysis = {
    mentionRate,
    positionScore,
    modelCoverage,
    categoryBreadth,
    mentionsByModel,
    mentionsByCategory,
    promptMentions,
    allPromptMentions: promptMentions,
  };

  // ── Sentiment Results ──
  const sentimentResults: SentimentResult[] = analyses
    .filter(a => a.sentiment)
    .map(a => ({
      promptId: a.promptId,
      model: a.model,
      overall_sentiment: a.sentiment!.overall,
      tone: 'unknown' as const,
      specific_praise: a.sentiment!.strengths_mentioned ?? [],
      specific_criticism: a.sentiment!.weaknesses_mentioned ?? [],
      fabricated_opinions: false,
      fabricated_opinions_detail: null,
      recommendation_stance: a.sentiment!.recommendation_stance,
    }));

  // Add neutral defaults for analyses without sentiment
  const withSentiment = new Set(sentimentResults.map(s => `${s.promptId}_${s.model}`));
  for (const r of responses) {
    const key = `${r.promptId}_${r.model}`;
    if (!withSentiment.has(key)) {
      sentimentResults.push({
        promptId: r.promptId,
        model: r.model,
        overall_sentiment: 'neutral',
        tone: 'unknown',
        specific_praise: [],
        specific_criticism: [],
        fabricated_opinions: false,
        fabricated_opinions_detail: null,
      });
    }
  }

  // ── Competitors ──
  const totalResponses = responses.length || 1;
  const discoveryResponses = responses.filter(r => DISCOVERY_CATEGORIES.has(r.promptCategory));

  const competitors: Competitor[] = validatedCompetitors.map(name => {
    const nameLower = name.toLowerCase();

    let totalMentions = 0;
    const models = new Set<string>();
    let coMentionCount = 0;
    let replacementCount = 0;

    for (const a of analyses) {
      const compList = a.competitors_in_response ?? [];
      const found = compList.find(c => c.name?.toLowerCase() === nameLower);
      if (found) {
        totalMentions++;
        models.add(a.model);
        if (a.brand_mentioned) coMentionCount++;
        else replacementCount++;
      }
    }

    const discoverWithComp = discoveryAnalyses.filter(a =>
      (a.competitors_in_response ?? []).some(c => c.name.toLowerCase() === nameLower)
    );
    const discNotMentioned = discoverWithComp.filter(a => !a.brand_mentioned).length;

    return {
      name,
      total_mentions: totalMentions,
      co_mention_rate: coMentionCount / totalResponses,
      replacement_rate: discoveryResponses.length > 0
        ? discNotMentioned / discoveryResponses.length
        : replacementCount / totalResponses,
      avg_position: 0,
      models: [...models],
    };
  }).filter(c => c.total_mentions > 0)
    .sort((a, b) => b.total_mentions - a.total_mentions);

  // ── Claims ──
  const claimTexts = new Set<string>();
  const claims: ClaimForVerification[] = [];
  for (const a of analyses) {
    for (const claim of (a.claims ?? [])) {
      if (!claim.statement) continue;
      const key = claim.statement.toLowerCase().trim();
      if (!claimTexts.has(key)) {
        claimTexts.add(key);
        claims.push({
          statement: claim.statement,
          type: claim.type,
          confidence: claim.confidence,
          source_model: a.model,
          source_prompt_id: a.promptId,
        });
      }
    }
  }

  return { visibilityAnalysis, sentimentResults, competitors, claims };
}

// ─── Legacy backward-compat wrappers ─────────────────────────────────────────

export async function analyzeVisibility(
  responses: ModelResponse[],
  profile: any
): Promise<VisibilityAnalysis> {
  const brandName = profile.brand_name ?? profile.brand?.name ?? 'Unknown';
  const knowledgeMap: BrandKnowledgeMap = profile.brand_name
    ? profile
    : {
        brand_name: brandName,
        business_type: profile.mode === 'local' ? 'local_business' : 'saas',
        one_liner: profile.brand?.description ?? '',
        category: profile.brand?.category ?? 'Business',
        subcategories: profile.brand?.subcategories ?? [],
        target_audience: [],
        core_offerings: [],
        key_features: [],
        signature_items: [],
        unique_selling_points: [],
        associated_concepts: [],
        typical_occasions: [],
        target_customer_situations: [],
        pricing: { model: '', plans: [], price_range: '' },
        location: { city: profile.location?.city ?? null, region: null, country: profile.location?.country ?? null, neighborhood: null, nearby_landmarks: [], service_area: '' },
        competitors_from_website: [],
        competitors_likely: [],
        contact_info: { email: null, phone: profile.contact?.phone ?? null, address: profile.location?.address ?? null, hours: null },
        social_proof: { customer_count: null, notable_customers: [], awards_certifications: [], review_platforms_mentioned: [] },
        integrations: [],
        founding_year: null,
        team_size_signal: '',
        verifiable_facts: { pricing_details: [], feature_claims: [], metrics_claimed: [], factual_details: [], contact_details: [] },
      };

  const analyses = await runUnifiedAnalysis(responses, knowledgeMap, []);
  const { visibilityAnalysis } = aggregateAnalysis(analyses, responses, [], brandName);
  return visibilityAnalysis;
}

export async function analyzeSentiment(
  responses: ModelResponse[],
  brandName: string,
  language: string = 'en'
): Promise<SentimentResult[]> {
  const languageName = LANGUAGE_NAMES[language as keyof typeof LANGUAGE_NAMES] ?? 'English';

  const evalResponses = responses.filter(r =>
    (r.promptCategory === 'E_evaluation' || r.promptCategory === 'C_comparison' ||
     r.promptCategory === 'evaluation' || r.promptCategory === 'comparative') &&
    !r.error && r.response
  );

  if (evalResponses.length === 0) {
    return responses.map(r => ({
      promptId: r.promptId,
      model: r.model,
      overall_sentiment: 'neutral' as const,
      tone: 'unknown' as const,
      specific_praise: [],
      specific_criticism: [],
      fabricated_opinions: false,
      fabricated_opinions_detail: null,
    }));
  }

  const systemPrompt = `You are a sentiment analysis engine for brand perception.
Return ONLY a valid JSON array. No markdown, no explanation.`;

  const userPrompt = `Brand: ${brandName}

Analyze each response and return a JSON array:
[{
  "promptId": "string",
  "model": "string",
  "overall_sentiment": "positive" | "neutral" | "negative" | "mixed",
  "tone": "enthusiastic" | "balanced" | "cautious" | "dismissive" | "unknown",
  "specific_praise": ["string"],
  "specific_criticism": ["string"],
  "fabricated_opinions": true/false,
  "fabricated_opinions_detail": "string | null"
}]

Responses to analyze:
${evalResponses.map(r => `[promptId:${r.promptId}][model:${r.model}]: ${r.response.slice(0, 500)}`).join('\n\n')}

Write all text fields in ${languageName}.`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0,
    });
    const raw = res.choices[0]?.message?.content ?? '[]';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as SentimentResult[];

    const evalIds = new Set(evalResponses.map(r => `${r.promptId}_${r.model}`));
    const allResults: SentimentResult[] = [...parsed];
    for (const r of responses) {
      const key = `${r.promptId}_${r.model}`;
      if (!evalIds.has(key)) {
        allResults.push({
          promptId: r.promptId,
          model: r.model,
          overall_sentiment: 'neutral',
          tone: 'unknown',
          specific_praise: [],
          specific_criticism: [],
          fabricated_opinions: false,
          fabricated_opinions_detail: null,
        });
      }
    }
    return allResults;
  } catch (e) {
    logger.error('Sentiment analysis failed', { error: e });
    return responses.map(r => ({
      promptId: r.promptId,
      model: r.model,
      overall_sentiment: 'neutral' as const,
      tone: 'unknown' as const,
      specific_praise: [],
      specific_criticism: [],
      fabricated_opinions: false,
      fabricated_opinions_detail: null,
    }));
  }
}

export function extractCompetitors(
  responses: ModelResponse[],
  brandName: string,
  _promptMentions: PromptMentionResult[],
  seedCompetitors: string[] = []
): Competitor[] {
  const brandLower = brandName.toLowerCase();

  const uniqueSeeds = seedCompetitors.filter(
    (name, idx, arr) =>
      name.toLowerCase() !== brandLower &&
      arr.findIndex(n => n.toLowerCase() === name.toLowerCase()) === idx
  );

  if (uniqueSeeds.length === 0) return [];

  const counts: Record<string, {
    total_mentions: number;
    models: Set<string>;
    co_mention_count: number;
    replacement_count: number;
  }> = {};

  for (const name of uniqueSeeds) {
    counts[name] = { total_mentions: 0, models: new Set(), co_mention_count: 0, replacement_count: 0 };
  }

  for (const resp of responses) {
    if (!resp.response) continue;
    const textLower = resp.response.toLowerCase();
    const brandPresent = textLower.includes(brandLower);

    for (const name of uniqueSeeds) {
      const nameLower = name.toLowerCase();
      if (textLower.includes(nameLower)) {
        counts[name].total_mentions++;
        counts[name].models.add(resp.model);
        if (brandPresent) counts[name].co_mention_count++;
        else counts[name].replacement_count++;
      }
    }
  }

  const totalResponses = responses.length || 1;

  return Object.entries(counts)
    .filter(([, v]) => v.total_mentions > 0)
    .sort(([, a], [, b]) => b.total_mentions - a.total_mentions)
    .slice(0, 15)
    .map(([name, v]) => ({
      name,
      total_mentions: v.total_mentions,
      co_mention_rate: v.co_mention_count / totalResponses,
      replacement_rate: v.replacement_count / totalResponses,
      avg_position: 0,
      models: [...v.models],
    }));
}

export function analyzeSourcesCited(
  responses: ModelResponse[],
  brandDomain: string
): SourceAnalysis {
  const cleanDomain = brandDomain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const allSources = responses.flatMap(r => r.sources_cited ?? []);

  const brandSources = allSources.filter(s => s.includes(cleanDomain));
  const urlCounts: Record<string, number> = {};

  for (const source of allSources) {
    try {
      const hostname = new URL(source).hostname.replace(/^www\./, '');
      if (!hostname.includes(cleanDomain)) {
        urlCounts[hostname] = (urlCounts[hostname] ?? 0) + 1;
      }
    } catch {}
  }

  const thirdPartySources = Object.entries(urlCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([url, count]) => ({ url, count }));

  return {
    brand_site_cited: brandSources.length > 0,
    brand_site_citation_count: brandSources.length,
    third_party_sources: thirdPartySources,
    competitor_sites_cited: [],
    total_sources: allSources.length,
  };
}

// ─── v3 Category-specific extraction ─────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

export function fuzzyMatch(a: string, b: string, threshold: number = 0.85): boolean {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const longer = na.length >= nb.length ? na : nb;
  if (longer.length === 0) return true;
  const distance = levenshtein(na, nb);
  return (1 - distance / longer.length) >= threshold;
}

async function extractDiscovery(
  rawResponse: string,
  brandName: string,
  prompt: string
): Promise<import('../types').DiscoveryExtraction> {
  const systemPrompt = `You are a business extraction engine. Return ONLY valid JSON, no markdown.`;
  const userPrompt = `Analyze this AI response to a user query about finding businesses/services.

User query: "${prompt}"
AI response: "${rawResponse.slice(0, 3000)}"
Brand being audited: "${brandName}"

Extract ALL businesses/brands mentioned. For each:
- name: exact business name as written
- position: order of mention (1 = first)
- location: address or area if mentioned, null if not
- services: list of services/features mentioned for this business
- sentiment: tone of the mention (positive/neutral/negative)

CRITICAL: Only extract actual business/brand proper names. NOT generic descriptions, dish names, cuisine types, neighborhoods, or product categories. A business name is a proper noun identifying a specific establishment.

Also determine:
- brand_found: is "${brandName}" (or obvious variant) in the list?
- brand_position: its position number if found, null if not
- total_mentioned: total count of businesses extracted

Return JSON only:
{
  "businesses_mentioned": [{"name":"","position":1,"location":null,"services":[],"sentiment":"neutral"}],
  "brand_found": false,
  "brand_position": null,
  "total_mentioned": 0
}`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      max_tokens: 800,
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}');
    return {
      businesses_mentioned: parsed.businesses_mentioned ?? [],
      brand_found: parsed.brand_found ?? false,
      brand_position: parsed.brand_position ?? null,
      total_mentioned: parsed.total_mentioned ?? 0,
    };
  } catch (e) {
    logger.error('Discovery extraction failed', { error: e });
    const brandLower = brandName.toLowerCase();
    const found = rawResponse.toLowerCase().includes(brandLower);
    return { businesses_mentioned: [], brand_found: found, brand_position: found ? 1 : null, total_mentioned: 0 };
  }
}

async function extractServices(
  rawResponse: string,
  brandName: string,
  brandProfile: BrandKnowledgeMap,
  prompt: string
): Promise<import('../types').ServicesExtraction> {
  const systemPrompt = `You are a brand services extraction engine. Return ONLY valid JSON, no markdown.`;

  const profileSummary = [
    `Category: ${brandProfile.category}`,
    brandProfile.core_offerings?.length ? `Core offerings: ${brandProfile.core_offerings.slice(0, 5).join(', ')}` : '',
    brandProfile.key_features?.length ? `Key features: ${brandProfile.key_features.slice(0, 5).join(', ')}` : '',
    brandProfile.pricing?.price_range ? `Price range: ${brandProfile.pricing.price_range}` : '',
    brandProfile.verifiable_facts?.pricing_details?.length
      ? `Pricing facts: ${brandProfile.verifiable_facts.pricing_details.slice(0, 3).join('; ')}`
      : '',
  ].filter(Boolean).join('\n');

  const userPrompt = `Analyze this AI response about a brand's services/offerings.

User query: "${prompt}"
AI response: "${rawResponse.slice(0, 3000)}"

Brand profile (verified facts):
Name: ${brandName}
${profileSummary}

Extract:
1. services_mentioned: Each service/product/feature the AI mentioned for this brand.
   Compare against brand profile: "correct"=matches verified info, "incorrect"=contradicts it (hallucination), "unverifiable"=not in profile.
   Include source_claim (exact quote from AI).

2. pricing_mentioned: Did AI mention pricing? Is it correct per profile?

3. overall_completeness: "comprehensive"|"partial"|"minimal"

4. hallucinations: ONLY claims that are INCORRECT per brand profile.
   Severity: "critical"=wrong price/address/closed (causes lost customers), "high"=wrong core service/feature, "medium"=minor error, "low"=vague/imprecise.

Return JSON only:
{
  "services_mentioned": [{"service":"","description":"","accuracy":"correct","source_claim":""}],
  "pricing_mentioned": {"mentioned":false,"details":null,"accuracy":"unverifiable"},
  "overall_completeness": "partial",
  "hallucinations": [{"claim":"","reality":"","severity":"medium"}]
}`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      max_tokens: 1000,
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}');
    return {
      services_mentioned: parsed.services_mentioned ?? [],
      pricing_mentioned: parsed.pricing_mentioned ?? { mentioned: false, details: null, accuracy: 'unverifiable' },
      overall_completeness: parsed.overall_completeness ?? 'minimal',
      hallucinations: parsed.hallucinations ?? [],
    };
  } catch (e) {
    logger.error('Services extraction failed', { error: e });
    return { services_mentioned: [], pricing_mentioned: { mentioned: false, details: null, accuracy: 'unverifiable' }, overall_completeness: 'minimal', hallucinations: [] };
  }
}

async function extractOpinions(
  rawResponse: string,
  brandName: string,
  prompt: string
): Promise<import('../types').OpinionsExtraction> {
  const systemPrompt = `You are a sentiment extraction engine. Return ONLY valid JSON, no markdown.`;
  const userPrompt = `Analyze this AI response about opinions/reviews of a brand.

User query: "${prompt}"
AI response: "${rawResponse.slice(0, 3000)}"
Brand: "${brandName}"

Extract:
1. overall_sentiment: positive/neutral/negative/mixed
2. sentiment_score: -1.0 (very negative) to 1.0 (very positive)
3. pros: list of positive aspects mentioned
4. cons: list of negative aspects mentioned
5. recommendation_strength: strong_recommend|soft_recommend|neutral|soft_discourage|strong_discourage
6. authority_signals: words/phrases signaling authority (e.g., "leading", "popular", "trusted", "established")
7. sources_cited: any review sources AI references
8. key_quote: the single most impactful sentence about the brand's reputation (or null)

Return JSON only:
{
  "overall_sentiment": "neutral",
  "sentiment_score": 0.0,
  "pros": [],
  "cons": [],
  "recommendation_strength": "neutral",
  "authority_signals": [],
  "sources_cited": [],
  "key_quote": null
}`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      max_tokens: 700,
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}');
    return {
      overall_sentiment: parsed.overall_sentiment ?? 'neutral',
      sentiment_score: typeof parsed.sentiment_score === 'number' ? Math.max(-1, Math.min(1, parsed.sentiment_score)) : 0,
      pros: parsed.pros ?? [],
      cons: parsed.cons ?? [],
      recommendation_strength: parsed.recommendation_strength ?? 'neutral',
      authority_signals: parsed.authority_signals ?? [],
      sources_cited: parsed.sources_cited ?? [],
      key_quote: parsed.key_quote ?? null,
    };
  } catch (e) {
    logger.error('Opinions extraction failed', { error: e });
    return { overall_sentiment: 'neutral', sentiment_score: 0, pros: [], cons: [], recommendation_strength: 'neutral', authority_signals: [], sources_cited: [], key_quote: null };
  }
}

async function extractCompetitorsV3(
  rawResponse: string,
  brandName: string,
  prompt: string
): Promise<import('../types').CompetitorsExtraction> {
  const systemPrompt = `You are a competitor extraction engine. Return ONLY valid JSON, no markdown.`;
  const userPrompt = `Analyze this AI response about alternatives/competitors to a brand.

User query: "${prompt}"
AI response: "${rawResponse.slice(0, 3000)}"
Brand being audited: "${brandName}"

Extract ALL competitor brands/businesses mentioned as alternatives.
For each:
- name: exact business/brand name (MUST be a real business entity, not a generic category)
- position: order of mention (1 = first)
- context: one-sentence summary of how it was described
- sentiment_vs_brand: preferred|equal|inferior|neutral (how AI positions this vs audited brand)

CRITICAL: Only extract actual business/brand/company names. NOT cuisine types, product categories, generic descriptions, or dish names.

Also:
- brand_mentioned: does AI mention "${brandName}" in this response?
- replacement_suggested: does AI suggest switching away from "${brandName}"?
- total_alternatives: how many distinct competitors mentioned

Return JSON only:
{
  "competitors": [{"name":"","position":1,"context":"","sentiment_vs_brand":"neutral"}],
  "brand_mentioned": false,
  "replacement_suggested": false,
  "total_alternatives": 0
}`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      max_tokens: 800,
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}');
    return {
      competitors: parsed.competitors ?? [],
      brand_mentioned: parsed.brand_mentioned ?? false,
      replacement_suggested: parsed.replacement_suggested ?? false,
      total_alternatives: parsed.total_alternatives ?? 0,
    };
  } catch (e) {
    logger.error('Competitors extraction failed', { error: e });
    return { competitors: [], brand_mentioned: false, replacement_suggested: false, total_alternatives: 0 };
  }
}

function buildAnchorList(extractions: import('../types').CompetitorsExtraction[]): import('../types').AnchorCompetitor[] {
  const all = new Map<string, { count: number; contexts: string[]; sentiments: string[] }>();
  for (const ext of extractions) {
    for (const comp of ext.competitors) {
      const key = comp.name.toLowerCase().trim();
      if (!all.has(key)) all.set(key, { count: 0, contexts: [], sentiments: [] });
      const entry = all.get(key)!;
      entry.count++;
      entry.contexts.push(comp.context);
      entry.sentiments.push(comp.sentiment_vs_brand);
    }
  }
  return Array.from(all.entries()).map(([name, data]) => ({
    name: extractions.flatMap(e => e.competitors).find(c => c.name.toLowerCase().trim() === name)?.name ?? name,
    mention_count: data.count,
    contexts: data.contexts,
    sentiments: data.sentiments,
  }));
}

export async function runCategoryAnalysis(
  responses: ModelResponse[],
  profile: BrandKnowledgeMap,
): Promise<import('../types').CategoryAnalysisResult> {
  const brandName = profile.brand_name;

  const byCategory: Record<string, ModelResponse[]> = {
    discovery: [], services: [], opinions: [], competitors: [],
  };

  for (const r of responses) {
    const cat = r.promptCategory?.toLowerCase() ?? '';
    if (byCategory[cat]) byCategory[cat].push(r);
    else {
      // Fallback category mapping for old-style categories
      if (cat.includes('discovery') || cat.includes('A_discovery')) byCategory.discovery.push(r);
      else if (cat.includes('factual') || cat.includes('B_factual') || cat.includes('practical')) byCategory.services.push(r);
      else if (cat.includes('evaluation') || cat.includes('E_evaluation') || cat.includes('comparative') || cat.includes('C_comparison')) byCategory.opinions.push(r);
      else byCategory.discovery.push(r);
    }
  }

  // STEP A: Process competitors first → build anchor list
  const competitorExtractions: import('../types').CompetitorsExtraction[] = [];
  const BATCH = 5;

  for (let i = 0; i < byCategory.competitors.length; i += BATCH) {
    const batch = byCategory.competitors.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async r => {
        if (!r.response || r.refused || r.explicit_unknown) {
          return { competitors: [], brand_mentioned: false, replacement_suggested: false, total_alternatives: 0, _model: r.model, _promptId: r.promptId };
        }
        const ext = await extractCompetitorsV3(r.response, brandName, r.promptText);
        return { ...ext, _model: r.model, _promptId: r.promptId };
      })
    );
    competitorExtractions.push(...results);
  }

  const anchorList = buildAnchorList(competitorExtractions);

  // STEP B: Process discovery
  const discoveryExtractions: import('../types').DiscoveryExtraction[] = [];
  for (let i = 0; i < byCategory.discovery.length; i += BATCH) {
    const batch = byCategory.discovery.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async r => {
        if (!r.response || r.refused || r.explicit_unknown) {
          return { businesses_mentioned: [], brand_found: false, brand_position: null, total_mentioned: 0, _model: r.model, _promptId: r.promptId, _rawResponse: '' };
        }
        const ext = await extractDiscovery(r.response, brandName, r.promptText);
        return { ...ext, _model: r.model, _promptId: r.promptId, _rawResponse: r.response };
      })
    );

    // STEP C: Validate discovery against anchor list
    for (const ext of results) {
      ext.businesses_mentioned = ext.businesses_mentioned.filter(biz => {
        const isOnAnchorList = anchorList.some(anchor => fuzzyMatch(anchor.name, biz.name, 0.85));
        const isAuditedBrand = fuzzyMatch(brandName, biz.name, 0.85);
        const existsInRaw = ext._rawResponse
          ? ext._rawResponse.toLowerCase().includes(biz.name.toLowerCase())
          : false;
        return (isOnAnchorList || isAuditedBrand) && existsInRaw;
      });
      ext.brand_found = ext.businesses_mentioned.some(b => fuzzyMatch(brandName, b.name, 0.85));
      ext.brand_position = ext.brand_found
        ? (ext.businesses_mentioned.findIndex(b => fuzzyMatch(brandName, b.name, 0.85)) + 1)
        : null;
      ext.total_mentioned = ext.businesses_mentioned.length;
    }

    discoveryExtractions.push(...results);
  }

  // STEP D: Process services
  const servicesExtractions: import('../types').ServicesExtraction[] = [];
  for (let i = 0; i < byCategory.services.length; i += BATCH) {
    const batch = byCategory.services.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async r => {
        if (!r.response || r.refused || r.explicit_unknown) {
          return { services_mentioned: [], pricing_mentioned: { mentioned: false, details: null, accuracy: 'unverifiable' as const }, overall_completeness: 'minimal' as const, hallucinations: [], _model: r.model, _promptId: r.promptId };
        }
        const ext = await extractServices(r.response, brandName, profile, r.promptText);
        return { ...ext, _model: r.model, _promptId: r.promptId };
      })
    );
    servicesExtractions.push(...results);
  }

  // STEP E: Process opinions
  const opinionsExtractions: import('../types').OpinionsExtraction[] = [];
  for (let i = 0; i < byCategory.opinions.length; i += BATCH) {
    const batch = byCategory.opinions.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async r => {
        if (!r.response || r.refused || r.explicit_unknown) {
          return { overall_sentiment: 'neutral' as const, sentiment_score: 0, pros: [], cons: [], recommendation_strength: 'neutral' as const, authority_signals: [], sources_cited: [], key_quote: null, _model: r.model, _promptId: r.promptId };
        }
        const ext = await extractOpinions(r.response, brandName, r.promptText);
        return { ...ext, _model: r.model, _promptId: r.promptId };
      })
    );
    opinionsExtractions.push(...results);
  }

  return {
    discovery: discoveryExtractions,
    services: servicesExtractions,
    opinions: opinionsExtractions,
    competitors: competitorExtractions,
    anchorList,
  };
}
