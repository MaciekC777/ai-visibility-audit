import {
  VisibilityAnalysis,
  VerifiedClaim,
  SentimentResult,
  Competitor,
  AuditScores,
} from '../types';

// ─── Visibility Score (0-100) ─────────────────────────────────────────────────
// VISIBILITY = (mention_rate × 40) + (position_score × 30) + (model_coverage × 20) + (sentiment_bonus × 10)

export function calculateVisibilityScore(
  analysis: VisibilityAnalysis,
  sentiments: SentimentResult[]
): number {
  const sentimentBonus = calculateSentimentBonus(sentiments);

  const score =
    analysis.mentionRate * 40 +
    analysis.positionScore * 30 +
    analysis.modelCoverage * 20 +
    sentimentBonus * 10;

  return Math.round(Math.min(100, Math.max(0, score)));
}

function calculateSentimentBonus(sentiments: SentimentResult[]): number {
  if (sentiments.length === 0) return 0.3;
  const counts = { positive: 0, mixed: 0, neutral: 0, negative: 0 };
  for (const s of sentiments) {
    counts[s.overall_sentiment] = (counts[s.overall_sentiment] ?? 0) + 1;
  }
  const total = sentiments.length;
  const weighted =
    (counts.positive / total) * 1.0 +
    (counts.mixed / total) * 0.7 +
    (counts.neutral / total) * 0.5 +
    (counts.negative / total) * 0.2;
  return weighted;
}

// ─── Accuracy Score (0-100 or null) ──────────────────────────────────────────
// ACCURACY = max(0, 100 - Σ penalties)
// HIGH: -15, MEDIUM: -8, LOW: -3

const SEVERITY_PENALTIES: Record<string, number> = {
  high: 15,
  medium: 8,
  low: 3,
};

export function calculateAccuracyScore(claims: VerifiedClaim[]): number | null {
  const issues = claims.filter(c =>
    c.verdict === 'incorrect' || c.verdict === 'partially_correct' || c.verdict === 'outdated'
  );

  if (claims.length === 0) return null; // No verifiable data found

  let score = 100;
  for (const claim of issues) {
    score -= SEVERITY_PENALTIES[claim.severity] ?? 3;
  }
  return Math.max(0, score);
}

// ─── Perception Score (0-100) ─────────────────────────────────────────────────
// positive_pct × 60 + neutral_pct × 30 + negative_pct × 0 + 10 (base)

export function calculatePerceptionScore(sentiments: SentimentResult[]): number {
  const withBrand = sentiments.filter(s =>
    s.overall_sentiment !== 'neutral' || s.specific_praise.length > 0
  );
  if (withBrand.length === 0) {
    if (sentiments.length === 0) return 50;
    // All neutral — still return base score
    return 40;
  }

  const total = withBrand.length;
  const pos = withBrand.filter(s => s.overall_sentiment === 'positive').length;
  const neu = withBrand.filter(s => s.overall_sentiment === 'neutral' || s.overall_sentiment === 'mixed').length;

  const score = (pos / total) * 60 + (neu / total) * 30 + 10;
  return Math.round(Math.min(100, Math.max(0, score)));
}

// ─── Composite Score (0-100) ──────────────────────────────────────────────────
// COMPOSITE = VISIBILITY × 0.6 + ACCURACY × 0.4
// If ACCURACY = null: COMPOSITE = VISIBILITY

export function calculateCompositeScore(
  visibilityScore: number,
  accuracyScore: number | null
): number {
  if (accuracyScore === null) return visibilityScore;
  return Math.round(visibilityScore * 0.6 + accuracyScore * 0.4);
}

// ─── Market Rank ──────────────────────────────────────────────────────────────

export function calculateMarketRank(
  competitors: Competitor[],
  brandMentionCount: number
): number {
  const brandsAhead = competitors.filter(c => c.total_mentions > brandMentionCount).length;
  return brandsAhead + 1;
}

// ─── All scores ───────────────────────────────────────────────────────────────

export function calculateAllScores(
  visibilityAnalysis: VisibilityAnalysis,
  claims: VerifiedClaim[],
  sentiments: SentimentResult[],
  competitors: Competitor[],
  brandTotalMentions: number
): AuditScores {
  const visibilityScore = calculateVisibilityScore(visibilityAnalysis, sentiments);
  const accuracyScore = calculateAccuracyScore(claims);
  const compositeScore = calculateCompositeScore(visibilityScore, accuracyScore);
  const perceptionScore = calculatePerceptionScore(sentiments);
  const marketRank = calculateMarketRank(competitors, brandTotalMentions);

  return { visibilityScore, accuracyScore, compositeScore, perceptionScore, marketRank };
}
