import { Audit, VisibilityAnalysis, Competitor, SentimentResult } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { scoreColor } from '@/lib/utils';

interface AnalyticsPanelSectionProps {
  audit: Audit;
  visibilityAnalysis?: VisibilityAnalysis;
  competitors?: Competitor[];
  sentiment?: SentimentResult[];
  brandMentions?: number;
}

const MODEL_LABELS: Record<string, string> = {
  openai: 'ChatGPT',
  anthropic: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
};

function strengthBadge(score: number | null): { label: string; variant: 'success' | 'info' | 'warning' | 'error' } {
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
): string[] {
  const findings: string[] = [];
  const vis = audit.visibility_score ?? 0;

  if (vis >= 70) findings.push('Strong organic AI presence detected');
  else if (vis >= 40) findings.push('Moderate AI visibility — room to grow');
  else findings.push('Limited organic presence in AI responses');

  if (brandMentions === 0) findings.push('Brand absent from AI discovery prompts');
  else findings.push(`Mentioned ${brandMentions}× across AI responses`);

  if (competitorCount > 0) findings.push(`${competitorCount} competitor${competitorCount > 1 ? 's' : ''} identified in AI responses`);
  else findings.push('No direct competitors detected');

  const sentimentRate = sentimentTotal > 0 ? sentimentPositive / sentimentTotal : 0;
  if (sentimentRate >= 0.6) findings.push('Predominantly positive AI sentiment');
  else findings.push('Mixed or neutral AI sentiment detected');

  return findings;
}

function deriveActions(audit: Audit, competitorCount: number): string[] {
  const actions: string[] = [];
  const vis = audit.visibility_score ?? 0;
  const acc = audit.accuracy_score ?? 100;

  if (acc < 80) actions.push('Fix factual errors in AI responses');
  if (vis < 40) actions.push('Build AI-indexable content for discovery');
  actions.push('Review detailed recommendations below');
  if (competitorCount > 0) actions.push('Monitor competitive movement in AI');
  if (vis >= 40) actions.push('Optimize content strategy for higher positions');

  return actions.slice(0, 4);
}

export function AnalyticsPanelSection({
  audit,
  visibilityAnalysis,
  competitors = [],
  sentiment = [],
  brandMentions = 0,
}: AnalyticsPanelSectionProps) {
  const models = audit.models_queried ?? [];
  const totalPrompts = audit.total_prompts ?? 0;
  const totalCalls = models.length * totalPrompts;

  const marketAvg = competitors.length > 0
    ? Math.round(competitors.reduce((s, c) => s + c.total_mentions, 0) / competitors.length)
    : 0;

  const mentionsByModel = visibilityAnalysis?.mentionsByModel ?? {};
  const mentionRate = visibilityAnalysis ? Math.round(visibilityAnalysis.mentionRate * 100) : 0;

  const sentimentPositive = sentiment.filter(s => s.overall_sentiment === 'positive').length;
  const sentimentNegative = sentiment.filter(s => s.overall_sentiment === 'negative').length;

  const strength = strengthBadge(audit.visibility_score);
  const discoveryGap = brandMentions - marketAvg;

  const findings = deriveFindings(audit, brandMentions, competitors.length, sentimentPositive, sentiment.length);
  const actions = deriveActions(audit, competitors.length);

  return (
    <section id="analytics" className="scroll-mt-24 space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-900">Analytics Panel</h2>
        <p className="text-sm text-gray-400 mt-1">
          How your brand performs across AI recommendation systems
        </p>
      </div>

      {/* Top metrics bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center p-5">
          <CardContent className="px-0 py-0">
            <div className={`text-3xl font-bold mb-1 ${scoreColor(audit.visibility_score ?? 0)}`}>
              {audit.visibility_score ?? '—'}<span className="text-lg text-gray-400">/100</span>
            </div>
            <div className="text-xs font-semibold text-gray-700">Visibility Score</div>
            <div className="text-xs text-gray-400 mt-0.5">Organic AI Discovery</div>
          </CardContent>
        </Card>

        <Card className="text-center p-5">
          <CardContent className="px-0 py-0">
            <div className="text-3xl font-bold mb-1 text-gray-800">
              {audit.market_rank ? `#${audit.market_rank}` : '—'}
            </div>
            <div className="text-xs font-semibold text-gray-700">Market Rank</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {competitors.length > 0 ? `vs ${competitors.length} competitors` : 'no competitors found'}
            </div>
          </CardContent>
        </Card>

        <Card className="text-center p-5">
          <CardContent className="px-0 py-0">
            <div className={`text-3xl font-bold mb-1 ${brandMentions > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              {brandMentions}
            </div>
            <div className="text-xs font-semibold text-gray-700">Total Mentions</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Across {models.length} AI model{models.length !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        <Card className="text-center p-5">
          <CardContent className="px-0 py-0">
            <div className="text-3xl font-bold mb-1 text-gray-500">{marketAvg}</div>
            <div className="text-xs font-semibold text-gray-700">Market Average</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {discoveryGap > 0 ? 'Above average' : discoveryGap < 0 ? 'Below average' : 'On par'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Position + Strategic Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Market Position Analysis */}
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Market Position Analysis</h3>

            {/* Competitive standing */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Competitive Standing</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Market Strength:</span>
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

            {/* Per-model breakdown */}
            <div className="border-t border-gray-100 pt-4">
              {models.map((model) => {
                const count = mentionsByModel[model] ?? 0;
                const modelPrompts = totalPrompts;
                const modelMentionRate = modelPrompts > 0 ? Math.round((count / modelPrompts) * 100) : 0;
                const avgPos = null; // position per model not tracked in frontend VisibilityAnalysis type

                return (
                  <div key={model} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-800">{MODEL_LABELS[model] ?? model}</span>
                      <span className="text-xl font-bold text-gray-700">{count}</span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-500 pl-1">
                      <div className="flex justify-between">
                        <span>{MODEL_LABELS[model] ?? model} Mention Rate</span>
                        <span className="font-medium text-gray-700">{modelMentionRate}%</span>
                      </div>
                      {avgPos && (
                        <div className="flex justify-between">
                          <span>Average position</span>
                          <span className="font-medium text-gray-700">#{avgPos}</span>
                        </div>
                      )}
                      {sentimentPositive > sentimentNegative && (
                        <div className="flex justify-between">
                          <span>Sentiment</span>
                          <span className="font-medium text-green-600">positive</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {models.length === 0 && (
                <p className="text-xs text-gray-400">No model data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Strategic Intelligence Summary */}
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Strategic Intelligence Summary</h3>

            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Test Coverage</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>{models.length} AI model{models.length !== 1 ? 's' : ''} tested</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{totalPrompts} unique prompt{totalPrompts !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{totalCalls} total test call{totalCalls !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Key Findings</h4>
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
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Next Actions</h4>
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
