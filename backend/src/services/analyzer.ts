import OpenAI from 'openai';
import {
  ModelResponse,
  VisibilityAnalysis,
  SentimentResult,
  Competitor,
  PromptItem,
  MentionResult,
  PromptMentionResult,
  SourceAnalysis,
  BrandProfile,
} from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { LANGUAGE_NAMES } from '../config/constants';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// ─── LLM-based visibility detection ──────────────────────────────────────────

async function detectMention(
  response: ModelResponse,
  brandName: string,
  category: string,
  city?: string
): Promise<MentionResult> {
  // Quick pre-filter: if brand not mentioned, skip LLM call
  if (!response.response || response.refused || response.explicit_unknown) {
    return {
      brand_mentioned: false,
      mention_type: 'not_found',
      position_in_list: null,
      total_items_in_list: null,
      competitors_mentioned: [],
      recommendation_strength: 'absent',
      context_snippet: null,
      sources_referenced: response.sources_cited,
    };
  }

  const systemPrompt = `You are a brand mention detection engine.
Return ONLY valid JSON. No explanation, no markdown.`;

  const userPrompt = `Brand to detect: ${brandName}
Known aliases: ${brandName.toLowerCase()}, ${brandName.replace(/\s+/g, '')}
Category: ${category}${city ? `\nLocation: ${city}` : ''}

AI Response:
"${response.response.slice(0, 2000)}"

Return JSON:
{
  "brand_mentioned": true/false,
  "mention_type": "recommended" | "listed" | "briefly_mentioned" | "not_found",
  "position_in_list": number | null,
  "total_items_in_list": number | null,
  "competitors_mentioned": ["string"],
  "recommendation_strength": "primary" | "one_of_many" | "mentioned_not_recommended" | "absent",
  "context_snippet": "string | null",
  "sources_referenced": ["string"]
}`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 400,
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    const raw = res.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as MentionResult;
    return {
      ...parsed,
      sources_referenced: [
        ...(parsed.sources_referenced ?? []),
        ...response.sources_cited,
      ].slice(0, 10),
    };
  } catch (e) {
    logger.error('Mention detection LLM failed', { error: e });
    // Fallback to string matching
    const brandLower = brandName.toLowerCase();
    const respLower = response.response.toLowerCase();
    const mentioned = respLower.includes(brandLower);
    return {
      brand_mentioned: mentioned,
      mention_type: mentioned ? 'briefly_mentioned' : 'not_found',
      position_in_list: null,
      total_items_in_list: null,
      competitors_mentioned: [],
      recommendation_strength: mentioned ? 'mentioned_not_recommended' : 'absent',
      context_snippet: null,
      sources_referenced: response.sources_cited,
    };
  }
}

// ─── Batch visibility analysis ────────────────────────────────────────────────

export async function analyzeVisibility(
  responses: ModelResponse[],
  profile: BrandProfile
): Promise<VisibilityAnalysis> {
  const brandName = profile.mode === 'saas' ? profile.brand.name : profile.brand.name;
  const category = profile.brand.category;
  const city = profile.mode === 'local' ? profile.location.city : undefined;

  // Only analyze A, D, K category prompts for visibility scoring
  const visibilityCategories = new Set(['A_discovery', 'D_recommendation', 'K_keyword']);
  const visibilityResponses = responses.filter(r =>
    visibilityCategories.has(r.promptCategory) && !r.error
  );

  // For sentiment bonus, analyze all responses
  const allValidResponses = responses.filter(r => !r.error);

  // Run mention detection in batches (to save costs)
  const promptMentions: PromptMentionResult[] = [];

  // Process in batches of 5 parallel calls
  const BATCH_SIZE = 5;
  for (let i = 0; i < visibilityResponses.length; i += BATCH_SIZE) {
    const batch = visibilityResponses.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(r => detectMention(r, brandName, category, city))
    );
    for (let j = 0; j < batch.length; j++) {
      promptMentions.push({
        ...batchResults[j],
        model: batch[j].model,
        promptId: batch[j].promptId,
      });
    }
  }

  // Calculate metrics
  const mentionedResults = promptMentions.filter(r => r.brand_mentioned);
  const mentionRate = visibilityResponses.length > 0
    ? mentionedResults.length / visibilityResponses.length
    : 0;

  // Position score: normalized (total_items - position + 1) / total_items
  const positionScores: number[] = [];
  for (const r of promptMentions) {
    if (r.brand_mentioned && r.position_in_list !== null && r.total_items_in_list !== null && r.total_items_in_list > 0) {
      positionScores.push((r.total_items_in_list - r.position_in_list + 1) / r.total_items_in_list);
    } else if (!r.brand_mentioned) {
      positionScores.push(0);
    }
  }
  const positionScore = positionScores.length > 0
    ? positionScores.reduce((a, b) => a + b, 0) / positionScores.length
    : 0;

  // Model coverage
  const models = [...new Set(responses.map(r => r.model))];
  const modelsWithMentions = new Set(mentionedResults.map(r => r.model));
  const modelCoverage = models.length > 0 ? modelsWithMentions.size / models.length : 0;

  // Sentiment bonus (computed from sentiments - placeholder, will be filled later)
  const sentimentBonus = 0.5; // default neutral; will be updated after sentiment analysis

  // mentionsByModel and mentionsByCategory
  const mentionsByModel: Record<string, number> = {};
  const mentionsByCategory: Record<string, number> = {};

  for (const r of mentionedResults) {
    mentionsByModel[r.model] = (mentionsByModel[r.model] ?? 0) + 1;
    const resp = visibilityResponses.find(vr => vr.promptId === r.promptId && vr.model === r.model);
    if (resp) {
      mentionsByCategory[resp.promptCategory] = (mentionsByCategory[resp.promptCategory] ?? 0) + 1;
    }
  }

  return {
    mentionRate,
    positionScore,
    modelCoverage,
    sentimentBonus,
    mentionsByModel,
    mentionsByCategory,
    promptMentions,
  };
}

// ─── LLM-based Sentiment Analysis ────────────────────────────────────────────

export async function analyzeSentiment(
  responses: ModelResponse[],
  brandName: string,
  language: string = 'en'
): Promise<SentimentResult[]> {
  // Filter E (evaluation) responses + any with brand mentioned
  const evalResponses = responses.filter(r =>
    (r.promptCategory === 'E_evaluation' || r.promptCategory === 'C_comparison') &&
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

  const languageName = LANGUAGE_NAMES[language as keyof typeof LANGUAGE_NAMES] ?? 'English';

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

Analyze regardless of response language. Write all text fields (specific_praise, specific_criticism, fabricated_opinions_detail) in ${languageName}.`;

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
    // Strip markdown if present
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as SentimentResult[];

    // For responses not in eval set, add neutral defaults
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

// ─── Competitor extraction ────────────────────────────────────────────────────

export function extractCompetitors(
  responses: ModelResponse[],
  brandName: string,
  promptMentions: PromptMentionResult[]
): Competitor[] {
  const brandLower = brandName.toLowerCase();
  const allCompetitorMentions: string[] = [];

  // Collect from LLM-detected competitors only (regex extraction removed — too noisy for non-English text)
  for (const pm of promptMentions) {
    allCompetitorMentions.push(...pm.competitors_mentioned);
  }

  // Count occurrences
  const counts: Record<string, {
    total_mentions: number;
    models: Set<string>;
    co_mention_count: number;
    replacement_count: number;
    positions: number[];
  }> = {};

  for (const name of allCompetitorMentions) {
    if (!counts[name]) {
      counts[name] = { total_mentions: 0, models: new Set(), co_mention_count: 0, replacement_count: 0, positions: [] };
    }
    counts[name].total_mentions++;
  }

  // Add model attribution and co-mention/replacement data from promptMentions
  for (const pm of promptMentions) {
    const resp = responses.find(r => r.promptId === pm.promptId && r.model === pm.model);
    if (!resp) continue;

    for (const comp of pm.competitors_mentioned) {
      if (!counts[comp]) {
        counts[comp] = { total_mentions: 0, models: new Set(), co_mention_count: 0, replacement_count: 0, positions: [] };
      }
      counts[comp].models.add(resp.model);
      if (pm.brand_mentioned) counts[comp].co_mention_count++;
      if (!pm.brand_mentioned && pm.recommendation_strength !== 'absent') {
        counts[comp].replacement_count++;
      }
    }
  }

  const totalResponses = responses.length || 1;

  return Object.entries(counts)
    .filter(([, v]) => v.total_mentions >= 2)
    .sort(([, a], [, b]) => b.total_mentions - a.total_mentions)
    .slice(0, 15)
    .map(([name, v]) => ({
      name,
      total_mentions: v.total_mentions,
      co_mention_rate: v.co_mention_count / totalResponses,
      replacement_rate: v.replacement_count / totalResponses,
      avg_position: 0, // TODO: track position per competitor
      models: [...v.models],
    }));
}

// ─── Source analysis ──────────────────────────────────────────────────────────

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

const STOPWORDS = new Set([
  'the', 'and', 'for', 'you', 'are', 'this', 'that', 'with', 'have', 'from',
  'they', 'will', 'your', 'can', 'more', 'here', 'some', 'also', 'such',
  'when', 'what', 'how', 'its', 'been', 'has', 'was', 'had', 'not', 'but',
  'all', 'one', 'may', 'use', 'used', 'tool', 'tools', 'software', 'platform',
  'company', 'product', 'service', 'solution', 'option', 'choice', 'way',
  'best', 'top', 'good', 'great', 'many', 'most', 'help', 'provide',
  'include', 'offer', 'also', 'well', 'need', 'want', 'like', 'using',
  'user', 'users', 'business', 'businesses', 'features', 'options',
]);
