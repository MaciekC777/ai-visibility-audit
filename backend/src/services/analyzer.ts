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

  const userPrompt = `Brand: ${brandName}
Business type: ${profile.business_type}
Category: ${profile.category}
Seed competitors (known): ${seedCompetitors.slice(0, 10).join(', ') || 'none'}
Prompt category: ${response.promptCategory}
User prompt: "${response.promptText}"
Model: ${response.model}

AI Response:
"${response.response.slice(0, 3000)}"

Return JSON:
{
  "brand_mentioned": true/false,
  "brand_name_used": "exact brand name as used in response, or null",
  "visibility": {
    "mention_type": "recommended" | "listed" | "briefly_mentioned" | "not_found",
    "position": number | null,
    "total_items": number | null,
    "context": "brief snippet or null"
  },
  "sentiment": {
    "overall": "positive" | "neutral" | "negative" | "mixed",
    "strengths_mentioned": ["string"],
    "weaknesses_mentioned": ["string"],
    "recommendation_stance": "recommended" | "neutral" | "discouraged"
  },
  "competitors_in_response": [
    { "name": "string", "position": number | null, "sentiment": "positive" | "neutral" | "negative" }
  ],
  "positioning": {
    "vs_competitor": "competitor name if direct comparison, else null",
    "brand_advantage": "string or null",
    "competitor_advantage": "string or null",
    "ai_preference": "brand" | "competitor" | "neutral"
  },
  "claims": [
    { "statement": "factual claim about ${brandName}", "type": "pricing|feature|company_info|location|hours|service|contact|metric", "confidence": "stated_as_fact" | "hedged" | "speculative" }
  ]
}

Rules:
- brand_mentioned: true if brand name or clear alias appears in the response
- competitors_in_response: ALL named businesses/products mentioned as alternatives or options
- claims: ONLY factual claims about ${brandName} (not competitors)
- If brand not mentioned, visibility.mention_type = "not_found", sentiment and positioning can be null`;

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

    return {
      promptId: response.promptId,
      model: response.model,
      category: response.promptCategory,
      brand_mentioned: parsed.brand_mentioned ?? false,
      brand_name_used: parsed.brand_name_used ?? null,
      visibility: parsed.visibility,
      sentiment: parsed.sentiment,
      competitors_in_response: parsed.competitors_in_response ?? [],
      positioning: parsed.positioning?.vs_competitor ? parsed.positioning : undefined,
      claims: parsed.claims ?? [],
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
  validatedCompetitors: string[]
): AggregatedResults {
  const brandName = analyses[0] ? '' : ''; // not needed for aggregation

  // ── Visibility Analysis ──
  const discoveryAnalyses = analyses.filter(a =>
    a.category === 'discovery' || a.category === 'A_discovery' || a.category === 'D_recommendation' || a.category === 'K_keyword'
  );

  const mentionedDiscovery = discoveryAnalyses.filter(a => a.brand_mentioned);
  const mentionRate = discoveryAnalyses.length > 0
    ? mentionedDiscovery.length / discoveryAnalyses.length
    : 0;

  // Position score
  const positionScores: number[] = [];
  for (const a of analyses) {
    if (a.brand_mentioned && a.visibility?.position !== null && a.visibility?.total_items !== null) {
      const pos = a.visibility!.position!;
      const total = a.visibility!.total_items!;
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

  // mentionsByModel
  const mentionsByModel: Record<string, number> = {};
  const mentionsByCategory: Record<string, number> = {};
  for (const a of analyses.filter(a => a.brand_mentioned)) {
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

  const visibilityAnalysis: VisibilityAnalysis = {
    mentionRate,
    positionScore,
    modelCoverage,
    sentimentBonus: 0.5,
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
  const discoveryResponses = responses.filter(r =>
    r.promptCategory === 'discovery' || r.promptCategory === 'A_discovery' || r.promptCategory === 'D_recommendation'
  );

  const competitors: Competitor[] = validatedCompetitors.map(name => {
    const nameLower = name.toLowerCase();

    let totalMentions = 0;
    const models = new Set<string>();
    let coMentionCount = 0;
    let replacementCount = 0;

    for (const a of analyses) {
      const compList = a.competitors_in_response ?? [];
      const found = compList.find(c => c.name.toLowerCase() === nameLower);
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
  const { visibilityAnalysis } = aggregateAnalysis(analyses, responses, []);
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
