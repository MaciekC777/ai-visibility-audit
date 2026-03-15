import {
  VisibilityAnalysis,
  VerifiedClaim,
  SentimentResult,
  Competitor,
  AuditScores,
  NewAuditScores,
} from '../types';

// ─── Visibility Score (0-100) ─────────────────────────────────────────────────

export function calculateVisibilityScore(
  analysis: VisibilityAnalysis,
  _sentiments?: SentimentResult[]
): number {
  const score =
    (analysis.mentionRate ?? 0) * 40 +
    (analysis.modelCoverage ?? 0) * 30 +
    (analysis.positionScore ?? 0) * 20 +
    (analysis.categoryBreadth ?? 0) * 10;

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ─── Accuracy Score (0-100 or null) ──────────────────────────────────────────

const SEVERITY_PENALTIES: Record<string, number> = {
  high: 15,
  medium: 8,
  low: 3,
};

export function calculateAccuracyScore(claims: VerifiedClaim[]): number | null {
  const c = claims ?? [];
  const issues = c.filter(claim =>
    claim.verdict === 'incorrect' || claim.verdict === 'partially_correct' || claim.verdict === 'outdated'
  );

  if (c.length === 0) return null;

  let score = 100;
  for (const claim of issues) {
    score -= SEVERITY_PENALTIES[claim.severity] ?? 3;
  }
  return Math.max(0, score);
}

// ─── Perception Score (0-100) ─────────────────────────────────────────────────

export function calculatePerceptionScore(sentiments: SentimentResult[]): number {
  const s = sentiments ?? [];
  const withBrand = s.filter(item =>
    item.overall_sentiment !== 'neutral' || (item.specific_praise ?? []).length > 0
  );
  if (withBrand.length === 0) {
    return s.length === 0 ? 50 : 40;
  }

  const total = withBrand.length;
  const pos = withBrand.filter(item => item.overall_sentiment === 'positive').length;
  const neu = withBrand.filter(item => item.overall_sentiment === 'neutral' || item.overall_sentiment === 'mixed').length;

  return Math.round(Math.min(100, Math.max(0, (pos / total) * 60 + (neu / total) * 30 + 10)));
}

// ─── Composite Score (0-100) ──────────────────────────────────────────────────

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
  const c = competitors ?? [];
  const brandsAhead = c.filter(comp => comp.total_mentions > brandMentionCount).length;
  return brandsAhead + 1;
}

// ─── Reputation Score (0-100 or null) ────────────────────────────────────────

export function calculateReputationScore(sentiments: SentimentResult[]): number | null {
  const s = sentiments ?? [];
  const withStance = s.filter(item => (item as any).recommendation_stance);
  const nonNeutral = s.filter(item => item.overall_sentiment !== 'neutral');
  if (nonNeutral.length === 0) return null;

  const positive = nonNeutral.filter(item => item.overall_sentiment === 'positive').length;
  const base = (positive / nonNeutral.length) * 80;

  const allPraise = s.flatMap(item => item.specific_praise ?? []);
  const allCriticism = s.flatMap(item => item.specific_criticism ?? []);
  const strength_bonus = Math.min(new Set(allPraise).size * 2, 10);
  const weakness_penalty = Math.min(new Set(allCriticism).size * 2, 10);

  const recTotal = withStance.length;
  const recCount = withStance.filter(item => (item as any).recommendation_stance === 'recommended').length;
  const recommendation_bonus = recTotal > 0 ? (recCount / recTotal) * 10 : 0;

  return Math.max(0, Math.min(100, Math.round(base + strength_bonus - weakness_penalty + recommendation_bonus)));
}

// ─── Share of Voice (0-100) ───────────────────────────────────────────────────

export function calculateShareOfVoice(competitors: Competitor[], brandTotalMentions: number): number {
  const c = competitors ?? [];
  const total = c.reduce((sum, comp) => sum + (comp.total_mentions ?? 0), 0) + (brandTotalMentions ?? 0);
  if (total === 0) return 0;
  return Math.round(((brandTotalMentions ?? 0) / total) * 100);
}

// ─── Overall Score (0-100) ────────────────────────────────────────────────────

export function calculateOverallScore(
  visibility: number,
  accuracy: number | null,
  reputation: number | null,
  shareOfVoice: number
): number {
  let total = 0;
  let weights = 0;
  total += (visibility ?? 0) * 0.35; weights += 0.35;
  if (accuracy != null) { total += accuracy * 0.25; weights += 0.25; }
  if (reputation != null) { total += reputation * 0.25; weights += 0.25; }
  total += (shareOfVoice ?? 0) * 0.15; weights += 0.15;
  return weights > 0 ? Math.round(total / weights) : 0;
}

// ─── All scores ───────────────────────────────────────────────────────────────

export function calculateAllScores(
  visibilityAnalysis: VisibilityAnalysis,
  claims: VerifiedClaim[],
  sentiments: SentimentResult[],
  competitors: Competitor[],
  brandTotalMentions: number
): NewAuditScores {
  const safeSentiments = sentiments ?? [];
  const safeCompetitors = competitors ?? [];
  const safeClaims = claims ?? [];

  const visibilityScore = calculateVisibilityScore(visibilityAnalysis, safeSentiments);
  const accuracyScore = calculateAccuracyScore(safeClaims);
  const compositeScore = calculateCompositeScore(visibilityScore, accuracyScore);
  const perceptionScore = calculatePerceptionScore(safeSentiments);
  const marketRank = calculateMarketRank(safeCompetitors, brandTotalMentions);
  const reputationScore = calculateReputationScore(safeSentiments);
  const shareOfVoice = calculateShareOfVoice(safeCompetitors, brandTotalMentions);
  const overallScore = calculateOverallScore(visibilityScore, accuracyScore, reputationScore, shareOfVoice);

  return { visibilityScore, accuracyScore, compositeScore, perceptionScore, marketRank, reputationScore, shareOfVoice, competitiveRank: marketRank, overallScore };
}
