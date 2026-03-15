import { Audit, VisibilityAnalysis, Competitor, SentimentResult } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { scoreColor } from '@/lib/utils';
import { getT } from '@/lib/reportTranslations';

interface AnalyticsPanelSectionProps {
  audit: Audit;
  visibilityAnalysis?: VisibilityAnalysis;
  competitors?: Competitor[];
  sentiment?: SentimentResult[];
  brandMentions?: number;
  language?: string;
}

const MODEL_LABELS: Record<string, string> = {
  openai: 'ChatGPT',
  anthropic: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
};

function strengthBadge(score: number | null, t: ReturnType<typeof getT>): { label: string; variant: 'success' | 'info' | 'warning' | 'error' } {
  if (!score) return { label: 'NO DATA', variant: 'error' };
  if (score >= 70) return { label: 'STRONG', variant: 'success' };
  if (score >= 45) return { label: 'MODERATE', variant: 'info' };
  if (score >= 20) return { label: 'WEAK', variant: 'warning' };
  return { label: 'INVISIBLE', variant: 'error' };
}

function deriveFindings(
  audit: Audit,
  brandMentions: number,
  competitorCount: number,
  sentimentPositive: number,
  sentimentTotal: number,
  t: ReturnType<typeof getT>,
): string[] {
  const findings: string[] = [];
  const vis = audit.visibility_score ?? 0;

  if (vis >= 70) findings.push(t.strongPresence);
  else if (vis >= 40) findings.push(t.moderatePresence);
  else findings.push(t.limitedPresence);

  if (brandMentions === 0) findings.push(t.brandAbsent);
  else findings.push(`Mentioned ${brandMentions}× across AI responses`);

  if (competitorCount > 0) findings.push(`${competitorCount} competitor${competitorCount > 1 ? 's' : ''} identified in AI responses`);
  else findings.push(t.noCompetitorsFound);

  const sentimentRate = sentimentTotal > 0 ? sentimentPositive / sentimentTotal : 0;
  if (sentimentRate >= 0.6) findings.push(t.predominantlyPositive);
  else findings.push(t.mixedSentiment);

  return findings;
}

function deriveActions(audit: Audit, competitorCount: number, t: ReturnType<typeof getT>): string[] {
  const actions: string[] = [];
  const vis = audit.visibility_score ?? 0;
  const acc = audit.accuracy_score ?? 100;

  if (acc < 80) actions.push(t.fixFactualErrors);
  if (vis < 40) actions.push(t.buildAIContent);
  actions.push(t.reviewRecommendations);
  if (competitorCount > 0) actions.push(t.monitorCompetitors);
  if (vis >= 40) actions.push(t.optimizeContent);

  return actions.slice(0, 4);
}

export function AnalyticsPanelSection({
  audit,
  visibilityAnalysis,
  competitors = [],
  sentiment = [],
  brandMentions = 0,
  language,
}: AnalyticsPanelSectionProps) {
  const t = getT(language);
  const models = audit.models_queried ?? [];
  const totalPrompts = audit.total_prompts ?? 0;
  const totalCalls = models.length * totalPrompts;

  const marketAvg = competitors.length > 0
    ? Math.round(competitors.reduce((s, c) => s + c.total_mentions, 0) / competitors.length)
    : 0;

  const mentionsByModel = visibilityAnalysis?.mentionsByModel ?? {};

  const sentimentPositive = sentiment.filter(s => s.overall_sentiment === 'positive').length;
  const sentimentNegative = sentiment.filter(s => s.overall_sentiment === 'negative').length;

  const strength = strengthBadge(audit.visibility_score, t);
  const discoveryGap = brandMentions - marketAvg;

  const findings = deriveFindings(audit, brandMentions, competitors.length, sentimentPositive, sentiment.length, t);
  const actions = deriveActions(audit, competitors.length, t);

  return (
    <section id="analytics" className="scroll-mt-24 space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-900">{t.analyticsPanel}</h2>
        <p className="text-sm text-gray-400 mt-1">{t.howBrandPerforms}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center p-5">
          <CardContent className="px-0 py-0">
            <div className={`text-3xl font-bold mb-1 ${scoreColor(audit.visibility_score ?? 0)}`}>
              {audit.visibility_score ?? '—'}<span className="text-lg text-gray-400">/100</span>
            </div>
            <div className="text-xs font-semibold text-gray-700">{t.visibilityScore}</div>
            <div className="text-xs text-gray-400 mt-0.5">{t.organicAIDiscovery}</div>
          </CardContent>
        </Card>

        <Card className="text-center p-5">
          <CardContent className="px-0 py-0">
            <div className="text-3xl font-bold mb-1 text-gray-800">
              {audit.market_rank ? `#${audit.market_rank}` : '—'}
            </div>
            <div className="text-xs font-semibold text-gray-700">{t.marketRank}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {competitors.length > 0 ? `vs ${competitors.length} competitors` : t.noCompetitorsFound}
            </div>
          </CardContent>
        </Card>

        <Card className="text-center p-5">
          <CardContent className="px-0 py-0">
            <div className={`text-3xl font-bold mb-1 ${brandMentions > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              {brandMentions}
            </div>
            <div className="text-xs font-semibold text-gray-700">{t.totalMentions}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Across {models.length} AI model{models.length !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        <Card className="text-center p-5">
          <CardContent className="px-0 py-0">
            <div className="text-3xl font-bold mb-1 text-gray-500">{marketAvg}</div>
            <div className="text-xs font-semibold text-gray-700">{t.marketAverage}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {discoveryGap > 0 ? t.aboveAverage : discoveryGap < 0 ? t.belowAverage : t.onPar}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{t.marketPositionAnalysis}</h3>

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{t.competitiveStanding}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{t.marketStrength}</span>
                <Badge variant={strength.variant}>{strength.label}</Badge>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-5">
              {discoveryGap > 0
                ? `Discovery Gap: You have ${brandMentions} mention${brandMentions !== 1 ? 's' : ''} vs industry average of ${marketAvg}`
                : discoveryGap < 0
                ? `Gap to close: Industry averages ${marketAvg} mentions, you have ${brandMentions}`
                : `On par with market average of ${marketAvg} mentions`}
            </div>

            <div className="border-t border-gray-100 pt-4">
              {models.map((model) => {
                const count = mentionsByModel[model] ?? 0;
                const modelMentionRate = totalPrompts > 0 ? Math.round((count / totalPrompts) * 100) : 0;

                return (
                  <div key={model} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-800">{MODEL_LABELS[model] ?? model}</span>
                      <span className="text-xl font-bold text-gray-700">{count}</span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-500 pl-1">
                      <div className="flex justify-between">
                        <span>{MODEL_LABELS[model] ?? model} {t.mentionRate}</span>
                        <span className="font-medium text-gray-700">{modelMentionRate}%</span>
                      </div>
                      {sentimentPositive > sentimentNegative && (
                        <div className="flex justify-between">
                          <span>{t.sentiment}</span>
                          <span className="font-medium text-green-600">{t.positive}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {models.length === 0 && (
                <p className="text-xs text-gray-400">{t.noModelData}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{t.strategicIntelligence}</h3>

            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t.testCoverage}</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="text-gray-600">{models.length}{t.aiModelsTested2}</div>
                  <div className="text-gray-600">{totalPrompts}{t.uniquePrompts}</div>
                  <div className="text-gray-600">{totalCalls}{t.totalTestCalls}</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t.keyFindings}</h4>
                <ul className="space-y-1.5">
                  {findings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-primary-400 mt-0.5 shrink-0">›</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t.nextActions}</h4>
                <ul className="space-y-1.5">
                  {actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
