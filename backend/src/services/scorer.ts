import { VisibilityAnalysis, Hallucination, SentimentResult, Competitor, AuditScores } from '../types';
import { HALLUCINATION_PENALTIES, SCORING_WEIGHTS } from '../config/constants';

export function calculateVisibilityScore(analysis: VisibilityAnalysis): number {
  const w = SCORING_WEIGHTS.visibility;
  const score =
    analysis.mentionRate * w.mentionRate +
    analysis.modelCoverage * w.modelCoverage +
    (analysis.avgPositionScore / 100) * w.avgPosition +
    analysis.categoryBreadth * w.categoryBreadth;
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function calculateAccuracyScore(hallucinations: Hallucination[]): number {
  let score = 100;
  for (const h of hallucinations) {
    score -= HALLUCINATION_PENALTIES[h.verdict];
  }
  return Math.max(0, score);
}

export function calculatePerceptionScore(sentiments: SentimentResult[]): number {
  if (sentiments.length === 0) return 50;
  const w = SCORING_WEIGHTS.perception;
  const pos = sentiments.filter((s) => s.sentiment === 'positive').length;
  const neu = sentiments.filter((s) => s.sentiment === 'neutral').length;
  const total = sentiments.length;
  const score = (pos / total) * w.positive + (neu / total) * w.neutral + w.base;
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function calculateMarketRank(
  competitors: Competitor[],
  brandMentionCount: number
): number {
  const brandsAhead = competitors.filter((c) => c.mentionCount > brandMentionCount).length;
  return brandsAhead + 1;
}

export function calculateAllScores(
  visibilityAnalysis: VisibilityAnalysis,
  hallucinations: Hallucination[],
  sentiments: SentimentResult[],
  competitors: Competitor[],
  brandTotalMentions: number
): AuditScores {
  return {
    visibilityScore: calculateVisibilityScore(visibilityAnalysis),
    accuracyScore: calculateAccuracyScore(hallucinations),
    perceptionScore: calculatePerceptionScore(sentiments),
    marketRank: calculateMarketRank(competitors, brandTotalMentions),
  };
}
