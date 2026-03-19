import {
  UnifiedResponseAnalysis,
  VerifiedClaim,
  NewAuditScores,
  MentionClassification,
  VisibilityComponents,
  ReputationComponents,
  CompetitiveComponents,
  CompetitorEntry,
  ClaimStats,
  CategoryAnalysisResult,
  DiscoveryExtraction,
  ServicesExtraction,
  OpinionsExtraction,
} from '../types';
import {
  MENTION_WEIGHTS,
  ACCURACY_MIN_CLAIMS,
  REPUTATION_MIN_MENTIONS,
  COMPETITIVE_MIN_COMPETITORS,
} from '../config/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Derive mention classification from an analysis result.
// Handles both new analyses (with mention_classification) and legacy ones (brand_mentioned + visibility).
function getMentionClass(a: UnifiedResponseAnalysis): MentionClassification {
  if (a.mention_classification) return a.mention_classification;
  // Derive from legacy fields
  if (!a.brand_mentioned) return 'not_mentioned';
  const type = a.visibility?.mention_type;
  if (type === 'recommended') return 'recommended';
  if (type === 'listed') return 'listed';
  if (type === 'briefly_mentioned') return 'weak_mention';
  return 'listed';
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Improvement';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 60) return 'blue';
  if (score >= 40) return 'yellow';
  if (score >= 20) return 'orange';
  return 'red';
}

// ─── Visibility Score (0–100) ─────────────────────────────────────────────────

export function calculateVisibilityScore(
  analyses: UnifiedResponseAnalysis[],
  modelsTested: number,
  modelsWithMention: number,
): { score: number; components: VisibilityComponents } {

  // Komponent 1: Weighted Mention Average (weight 30)
  const mentionWeights = analyses.map(a => MENTION_WEIGHTS[getMentionClass(a)] ?? 0);
  const weightedMentionAvg = mentionWeights.length > 0
    ? mentionWeights.reduce((a, b) => a + b, 0) / mentionWeights.length
    : 0;

  // Komponent 2: Position Score (weight 25)
  const positionScores = analyses
    .filter(a => {
      const pos = a.visibility?.position ?? null;
      const total = a.visibility?.total_items ?? null;
      return pos !== null && total !== null && total > 0;
    })
    .map(a => {
      const pos = a.visibility!.position!;
      const total = a.visibility!.total_items!;
      return (total - pos + 1) / total;
    });

  const positionScore = positionScores.length > 0
    ? positionScores.reduce((a, b) => a + b, 0) / positionScores.length
    : 0;

  // Komponent 3: Model Coverage (weight 25)
  const modelCoverage = modelsTested > 0 ? modelsWithMention / modelsTested : 0;

  // Komponent 4: Consistency Bonus (weight 20)
  // Rewards stable visibility across prompts; penalizes high variance.
  const mentionedWeights = mentionWeights.filter(w => w > 0);
  let consistencyBonus = 0;
  if (mentionedWeights.length >= 2) {
    const mean = mentionedWeights.reduce((a, b) => a + b, 0) / mentionedWeights.length;
    const variance = mentionedWeights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / mentionedWeights.length;
    const stddev = Math.sqrt(variance);
    // stddev = 0 → perfect consistency → bonus = 1.0; stddev = 0.5 → high variance → bonus ≈ 0
    consistencyBonus = Math.max(0, 1 - stddev * 2);
  }

  const raw = (weightedMentionAvg * 30)
            + (positionScore * 25)
            + (modelCoverage * 25)
            + (consistencyBonus * 20);

  const score = Math.round(Math.min(100, Math.max(0, raw)));

  return {
    score,
    components: {
      weighted_mention_avg: round2(weightedMentionAvg),
      position_score: round2(positionScore),
      model_coverage: round2(modelCoverage),
      consistency_bonus: round2(consistencyBonus),
    },
  };
}

// ─── Accuracy Score (0–100 or null) ──────────────────────────────────────────

export function calculateAccuracyScore(
  claims: VerifiedClaim[],
): { score: number | null; label: string; claim_stats: ClaimStats } {
  const c = claims ?? [];

  const correct = c.filter(cl => cl.verdict === 'correct').length;
  const incorrect = c.filter(cl => cl.verdict === 'incorrect' || cl.verdict === 'partially_correct').length;
  const unverifiable = c.filter(cl => cl.verdict === 'unverifiable' || cl.verdict === 'outdated').length;
  const totalVerifiable = correct + incorrect;

  const highSev = c.filter(cl =>
    (cl.verdict === 'incorrect' || cl.verdict === 'partially_correct') && cl.severity === 'high'
  ).length;
  const medSev = c.filter(cl =>
    (cl.verdict === 'incorrect' || cl.verdict === 'partially_correct') && cl.severity === 'medium'
  ).length;
  const lowSev = c.filter(cl =>
    (cl.verdict === 'incorrect' || cl.verdict === 'partially_correct') && cl.severity === 'low'
  ).length;

  const claim_stats: ClaimStats = {
    total: c.length, correct, incorrect, unverifiable,
    high_severity: highSev, medium_severity: medSev, low_severity: lowSev,
  };

  // Always generate a label
  let label: string;
  if (totalVerifiable === 0) {
    label = 'No verifiable claims found';
  } else if (incorrect === 0) {
    label = 'All verified claims accurate';
  } else if (highSev > 0) {
    label = `Critical accuracy issues found (${highSev} high severity)`;
  } else if (incorrect <= 2) {
    label = 'Minor accuracy issues detected';
  } else {
    label = `Multiple accuracy issues (${incorrect} incorrect claims)`;
  }

  // Score requires minimum data
  if (totalVerifiable < ACCURACY_MIN_CLAIMS) {
    return { score: null, label, claim_stats };
  }

  const baseRatio = (correct / totalVerifiable) * 100;
  const severityPenalty = (highSev * 10) + (medSev * 5) + (lowSev * 2);

  // Dampening: pull toward 50 when few claims (low confidence)
  const confidence = Math.min(1.0, totalVerifiable / 8);  // full confidence at 8+ claims
  const prior = 50;
  const rawScore = Math.max(0, baseRatio - severityPenalty);
  const dampenedScore = (rawScore * confidence) + (prior * (1 - confidence));

  return {
    score: Math.round(Math.min(100, Math.max(0, dampenedScore))),
    label,
    claim_stats,
  };
}

// ─── Reputation Score (0–100 or null) ────────────────────────────────────────

export function calculateReputationScore(
  analyses: UnifiedResponseAnalysis[],
): { score: number | null; components: ReputationComponents } {

  const mentioned = analyses.filter(a => getMentionClass(a) !== 'not_mentioned');

  if (mentioned.length < REPUTATION_MIN_MENTIONS) {
    return {
      score: null,
      components: {
        sentiment_avg: null,
        authority_ratio: null,
        recommend_strength: null,
        mention_count: mentioned.length,
      },
    };
  }

  // Komponent 1: Sentiment Average (weight 40)
  const sentimentMap: Record<string, number> = { positive: 1.0, neutral: 0.5, negative: 0.0, mixed: 0.3 };
  const sentimentAvg = mentioned
    .map(a => sentimentMap[a.sentiment?.overall ?? 'neutral'] ?? 0.5)
    .reduce((a, b) => a + b, 0) / mentioned.length;

  // Komponent 2: Authority Ratio (weight 30)
  const authorityCount = mentioned.filter(a => a.has_authority_signals === true).length;
  const authorityRatio = authorityCount / mentioned.length;

  // Komponent 3: Recommend Strength (weight 30)
  const recommendLevels: number[] = mentioned.map(a => {
    const mc = getMentionClass(a);
    if (mc === 'strong_recommend') return 1.0;
    if (mc === 'recommended') return 0.7;
    if (mc === 'listed') return 0.3;
    return 0.0;  // weak_mention, negative_mention
  });
  const recommendStrength = recommendLevels.reduce((a, b) => a + b, 0) / recommendLevels.length;

  const raw = (sentimentAvg * 40) + (authorityRatio * 30) + (recommendStrength * 30);

  // Dampening toward 50 when few mentions
  const confidence = Math.min(1.0, mentioned.length / 5);
  const prior = 50;
  const dampenedScore = (raw * confidence) + (prior * (1 - confidence));

  return {
    score: Math.round(Math.min(100, Math.max(0, dampenedScore))),
    components: {
      sentiment_avg: round2(sentimentAvg),
      authority_ratio: round2(authorityRatio),
      recommend_strength: round2(recommendStrength),
      mention_count: mentioned.length,
    },
  };
}

// ─── Competitive Position Score (0–100 or null) ───────────────────────────────

export function calculateCompetitiveScore(
  analyses: UnifiedResponseAnalysis[],
  _brandName: string,
): { score: number | null; components: CompetitiveComponents; competitorRanking: CompetitorEntry[] } {

  const competitorMentions: Record<string, number[]> = {};
  const brandScores: number[] = [];

  for (const a of analyses) {
    const brandWeight = MENTION_WEIGHTS[getMentionClass(a)] ?? 0;
    if (brandWeight > 0) brandScores.push(brandWeight);

    const competitors = a.competitors_in_response?.map(c => c.name) ?? [];
    for (const comp of competitors) {
      const normalized = comp.trim().toLowerCase();
      if (!competitorMentions[normalized]) competitorMentions[normalized] = [];
      competitorMentions[normalized].push(0.6);  // listed-equivalent weight per mention
    }
  }

  const uniqueCompetitors = Object.keys(competitorMentions);

  if (uniqueCompetitors.length < COMPETITIVE_MIN_COMPETITORS) {
    return {
      score: null,
      components: { share_of_voice: null, avg_rank: null },
      competitorRanking: [],
    };
  }

  // Share of Voice
  const brandTotalWeight = brandScores.reduce((a, b) => a + b, 0);
  const allTotalWeight = brandTotalWeight + Object.values(competitorMentions)
    .reduce((sum, scores) => sum + scores.reduce((a, b) => a + b, 0), 0);

  const shareOfVoice = allTotalWeight > 0 ? brandTotalWeight / allTotalWeight : 0;

  // Average normalized rank
  const positionResults = analyses.filter(a =>
    a.visibility?.position != null && a.visibility?.total_items != null && (a.visibility.total_items ?? 0) > 0
  );
  const avgRank = positionResults.length > 0
    ? positionResults.reduce((sum, a) => {
        const pos = a.visibility!.position!;
        const total = a.visibility!.total_items!;
        return sum + (total - pos + 1) / total;
      }, 0) / positionResults.length
    : 0;

  // shareOfVoice [0–1] × 60 + avgRank [0–1] × 40 → [0–100]
  const raw = shareOfVoice * 60 * 100 + avgRank * 40 * 100;
  const score = Math.round(Math.min(100, Math.max(0, raw)));

  const competitorRanking: CompetitorEntry[] = uniqueCompetitors
    .map(name => ({
      name,
      mention_count: competitorMentions[name].length,
      total_weight: round2(competitorMentions[name].reduce((a, b) => a + b, 0)),
    }))
    .sort((a, b) => b.total_weight - a.total_weight);

  return {
    score,
    components: { share_of_voice: round2(shareOfVoice), avg_rank: round2(avgRank) },
    competitorRanking,
  };
}

// ─── Composite Score (0–100) ──────────────────────────────────────────────────

export function calculateCompositeScore(
  visibility: number,
  accuracy: number | null,
  reputation: number | null,
  competitive: number | null,
): number {
  // Dynamic weights — only include scores that exist
  const components: Array<{ score: number; weight: number }> = [
    { score: visibility, weight: 35 },
  ];
  if (accuracy !== null)    components.push({ score: accuracy, weight: 30 });
  if (reputation !== null)  components.push({ score: reputation, weight: 20 });
  if (competitive !== null) components.push({ score: competitive, weight: 15 });

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const composite = components.reduce((sum, c) => sum + c.score * (c.weight / totalWeight), 0);

  return Math.round(Math.min(100, Math.max(0, composite)));
}

// ─── Market Rank (legacy helper) ──────────────────────────────────────────────

export function calculateMarketRank(
  competitorRanking: CompetitorEntry[],
  brandTotalWeight: number,
): number {
  const brandsAhead = competitorRanking.filter(c => c.total_weight > brandTotalWeight).length;
  return brandsAhead + 1;
}

// ─── All scores ───────────────────────────────────────────────────────────────

export function calculateAllScores(
  analyses: UnifiedResponseAnalysis[],
  hallucinations: VerifiedClaim[],
  allModels: string[],
  brandName: string,
): NewAuditScores {
  const safeAnalyses = analyses ?? [];

  // Count unique models that mentioned the brand at least once
  const modelsWithMention = new Set(
    safeAnalyses
      .filter(a => getMentionClass(a) !== 'not_mentioned')
      .map(a => a.model)
  ).size;

  const { score: visibilityScore } = calculateVisibilityScore(
    safeAnalyses, allModels.length, modelsWithMention
  );
  const { score: accuracyScore } = calculateAccuracyScore(hallucinations ?? []);
  const { score: reputationScore } = calculateReputationScore(safeAnalyses);
  const { score: competitiveScore, competitorRanking } = calculateCompetitiveScore(safeAnalyses, brandName);
  const compositeScore = calculateCompositeScore(visibilityScore, accuracyScore, reputationScore, competitiveScore);

  // Market rank: count competitors with higher total weight than brand
  const brandMentionedCount = safeAnalyses.filter(a => getMentionClass(a) !== 'not_mentioned').length;
  const brandWeight = safeAnalyses
    .map(a => MENTION_WEIGHTS[getMentionClass(a)] ?? 0)
    .reduce((a, b) => a + b, 0);
  const marketRank = calculateMarketRank(competitorRanking, brandWeight);

  // Share of voice: competitive score as percentage (0–100 scale)
  const shareOfVoice = competitiveScore ?? 0;

  // Perception score maps to reputation for DB compatibility (both measure brand sentiment)
  const perceptionScore = reputationScore ?? Math.round(visibilityScore * 0.5 + 10);

  return {
    visibilityScore,
    accuracyScore,
    compositeScore,
    perceptionScore,
    marketRank,
    reputationScore,
    shareOfVoice,
    competitiveRank: marketRank,
    overallScore: compositeScore,
  };
}

// ─── v3 Category-based scoring ────────────────────────────────────────────────

export function calculateVisibilityScoreV3(
  discoveryExtractions: DiscoveryExtraction[],
): { score: number | null; mention_rate: number; avg_position: number } {
  if (discoveryExtractions.length === 0) return { score: null, mention_rate: 0, avg_position: 0 };

  const mentionRate = discoveryExtractions.filter(e => e.brand_found).length / discoveryExtractions.length;

  const positions = discoveryExtractions
    .filter(e => e.brand_position !== null && e.total_mentioned > 0)
    .map(e => {
      const pos = e.brand_position!;
      const total = e.total_mentioned;
      return 1 - (pos - 1) / Math.max(total - 1, 1);
    });
  const avgPosition = positions.length > 0
    ? positions.reduce((s, v) => s + v, 0) / positions.length
    : 0;

  const rawScore = (mentionRate * 40) + (avgPosition * 30) + (mentionRate * 20);

  const prior = 50;
  const n = discoveryExtractions.length;
  const confidence = n / (n + 4);
  const dampenedScore = confidence * rawScore + (1 - confidence) * prior;

  return {
    score: Math.round(Math.min(100, Math.max(0, dampenedScore))),
    mention_rate: mentionRate,
    avg_position: avgPosition,
  };
}

export function calculateAccuracyScoreV3(
  servicesExtractions: ServicesExtraction[],
): { score: number | null; hallucination_count: number; critical_count: number } {
  const allClaims = servicesExtractions.flatMap(e => e.services_mentioned);
  const verifiable = allClaims.filter(c => c.accuracy !== 'unverifiable');
  const allHallucinations = servicesExtractions.flatMap(e => e.hallucinations);
  const criticalCount = allHallucinations.filter(h => h.severity === 'critical' || h.severity === 'high').length;

  if (verifiable.length < 2) {
    return { score: null, hallucination_count: allHallucinations.length, critical_count: criticalCount };
  }

  const correct = verifiable.filter(c => c.accuracy === 'correct').length;
  const rawScore = (correct / verifiable.length) * 100;

  const prior = 50;
  const confidence = verifiable.length / (verifiable.length + 4);
  const score = Math.round(confidence * rawScore + (1 - confidence) * prior);

  return { score, hallucination_count: allHallucinations.length, critical_count: criticalCount };
}

export function calculateReputationScoreV3(
  opinionsExtractions: OpinionsExtraction[],
): { score: number | null; avg_sentiment: number } {
  if (opinionsExtractions.length === 0) return { score: null, avg_sentiment: 0 };

  const avgSentiment = opinionsExtractions.reduce((s, e) => s + e.sentiment_score, 0) / opinionsExtractions.length;
  const sentimentNormalized = (avgSentiment + 1) / 2;

  const recMap: Record<string, number> = {
    strong_recommend: 1.0, soft_recommend: 0.7, neutral: 0.5,
    soft_discourage: 0.3, strong_discourage: 0.0,
  };
  const avgRec = opinionsExtractions.reduce((s, e) => s + (recMap[e.recommendation_strength] ?? 0.5), 0) / opinionsExtractions.length;

  const totalAuthority = opinionsExtractions.reduce((s, e) => s + Math.min(e.authority_signals.length, 3), 0);
  const authorityNormalized = Math.min(totalAuthority / (opinionsExtractions.length * 3), 1);

  const rawScore = (sentimentNormalized * 40 + avgRec * 30 + authorityNormalized * 30) * 100;

  const prior = 50;
  const n = opinionsExtractions.length;
  const confidence = n / (n + 4);
  const score = Math.round(confidence * rawScore + (1 - confidence) * prior);

  return { score: Math.min(100, Math.max(0, score)), avg_sentiment: avgSentiment };
}

export function calculateAllScoresV3(
  categoryResult: CategoryAnalysisResult,
  allModels: string[],
  brandName: string,
): NewAuditScores {
  const { score: visibilityScore } = calculateVisibilityScoreV3(categoryResult.discovery);
  const { score: accuracyScoreV3 } = calculateAccuracyScoreV3(categoryResult.services);
  const { score: reputationScoreV3 } = calculateReputationScoreV3(categoryResult.opinions);

  // Competitive: share of voice based on anchor list vs discovery brand mentions
  const discoveryMentions = categoryResult.discovery.filter(e => e.brand_found).length;
  const totalAnchorMentions = categoryResult.anchorList.reduce((s, c) => s + c.mention_count, 0);
  const totalVoice = discoveryMentions + totalAnchorMentions;
  const shareOfVoice = totalVoice > 0 ? Math.round((discoveryMentions / totalVoice) * 100) : 0;

  // Market rank
  const brandDiscoveryCount = discoveryMentions;
  const competitorCounts = categoryResult.anchorList.map(c => c.mention_count);
  const marketRank = competitorCounts.filter(count => count > brandDiscoveryCount).length + 1;

  const safeVisibility = visibilityScore ?? 50;
  const compositeScore = calculateCompositeScore(safeVisibility, accuracyScoreV3, reputationScoreV3, shareOfVoice > 0 ? shareOfVoice : null);

  const perceptionScore = reputationScoreV3 ?? Math.round(safeVisibility * 0.5 + 10);

  return {
    visibilityScore: safeVisibility,
    accuracyScore: accuracyScoreV3,
    compositeScore,
    perceptionScore,
    marketRank,
    reputationScore: reputationScoreV3,
    shareOfVoice,
    competitiveRank: marketRank,
    overallScore: compositeScore,
  };
}
