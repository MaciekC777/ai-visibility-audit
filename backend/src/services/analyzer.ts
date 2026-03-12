import { ModelResponse, VisibilityAnalysis, SentimentResult, Competitor } from '../types';
import { POSITION_SCORE_LATER, POSITION_SCORE_NONE, POSITION_SCORES } from '../config/constants';
import { PromptItem } from '../types';

function mentionPosition(text: string, brandName: string): number | null {
  const lower = text.toLowerCase();
  const brand = brandName.toLowerCase();
  if (!lower.includes(brand)) return null;

  // Find sentence/list index where brand first appears
  const sentences = lower.split(/[\n.!?]/);
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].includes(brand)) {
      // Estimate position (1-based) within listed items
      const listsBefore = lower.slice(0, lower.indexOf(brand)).split(/\d+\.|[-*•]/).length;
      return Math.max(1, listsBefore);
    }
  }
  return 1;
}

function positionToScore(pos: number | null): number {
  if (pos === null) return POSITION_SCORE_NONE;
  return POSITION_SCORES[pos] ?? POSITION_SCORE_LATER;
}

export function analyzeVisibility(
  responses: ModelResponse[],
  brandName: string,
  prompts: PromptItem[]
): VisibilityAnalysis {
  const models = [...new Set(responses.map((r) => r.model))];
  const mentionsByModel: Record<string, number> = {};
  const mentionsByCategory: Record<string, number> = {};
  const positionsByPrompt: Record<string, number | null> = {};

  for (const resp of responses) {
    const pos = mentionPosition(resp.response, brandName);
    const promptKey = `${resp.promptId}_${resp.model}`;
    positionsByPrompt[promptKey] = pos;

    if (pos !== null) {
      mentionsByModel[resp.model] = (mentionsByModel[resp.model] ?? 0) + 1;
      const prompt = prompts.find((p) => p.id === resp.promptId);
      if (prompt) {
        mentionsByCategory[prompt.category] = (mentionsByCategory[prompt.category] ?? 0) + 1;
      }
    }
  }

  const totalResponses = responses.filter((r) => !r.error).length;
  const mentionRate = totalResponses > 0
    ? Object.values(mentionsByModel).reduce((a, b) => a + b, 0) / totalResponses
    : 0;

  const modelCoverage = models.length > 0
    ? Object.keys(mentionsByModel).length / models.length
    : 0;

  const positionScores = Object.values(positionsByPrompt).map(positionToScore);
  const avgPositionScore = positionScores.length > 0
    ? positionScores.reduce((a, b) => a + b, 0) / positionScores.length
    : 0;

  const categories = [...new Set(prompts.map((p) => p.category))];
  const categoriesWithMentions = categories.filter((c) => (mentionsByCategory[c] ?? 0) > 0);
  const categoryBreadth = categories.length > 0
    ? categoriesWithMentions.length / categories.length
    : 0;

  return {
    mentionRate,
    modelCoverage,
    avgPositionScore,
    categoryBreadth,
    mentionsByModel,
    mentionsByCategory,
    positionsByPrompt,
  };
}

export function analyzeSentiment(
  responses: ModelResponse[],
  brandName: string
): SentimentResult[] {
  return responses.map((resp) => {
    const text = resp.response.toLowerCase();
    const brand = brandName.toLowerCase();

    if (!text.includes(brand)) {
      return { promptId: resp.promptId, model: resp.model, sentiment: 'neutral' as const, score: 0 };
    }

    const positiveWords = ['great', 'excellent', 'best', 'top', 'leading', 'popular', 'recommended', 'reliable', 'powerful', 'easy'];
    const negativeWords = ['poor', 'bad', 'worst', 'avoid', 'unreliable', 'expensive', 'limited', 'disappointing'];

    let score = 0;
    for (const w of positiveWords) if (text.includes(w)) score += 0.15;
    for (const w of negativeWords) if (text.includes(w)) score -= 0.2;
    score = Math.max(-1, Math.min(1, score));

    const sentiment = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';
    return { promptId: resp.promptId, model: resp.model, sentiment, score };
  });
}

export function extractCompetitors(
  responses: ModelResponse[],
  brandName: string
): Competitor[] {
  const brandLower = brandName.toLowerCase();
  const counts: Record<string, { count: number; models: Set<string> }> = {};

  for (const resp of responses) {
    const text = resp.response;
    // Extract capitalized multi-word phrases (likely brand names)
    const matches = text.match(/\b[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?\b/g) ?? [];
    for (const match of matches) {
      const lower = match.toLowerCase();
      if (lower === brandLower || lower.length < 3 || STOPWORDS.has(lower)) continue;
      if (!counts[match]) counts[match] = { count: 0, models: new Set() };
      counts[match].count++;
      counts[match].models.add(resp.model);
    }
  }

  return Object.entries(counts)
    .filter(([, v]) => v.count >= 2)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 15)
    .map(([name, v]) => ({ name, mentionCount: v.count, models: [...v.models] }));
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'you', 'are', 'this', 'that', 'with', 'have', 'from',
  'they', 'will', 'your', 'can', 'more', 'here', 'some', 'also', 'such',
  'when', 'what', 'how', 'its', 'been', 'has', 'was', 'had', 'not', 'but',
  'all', 'one', 'may', 'use', 'used', 'tool', 'tools', 'software', 'platform',
  'company', 'product', 'service', 'solution', 'option', 'choice', 'way',
]);
