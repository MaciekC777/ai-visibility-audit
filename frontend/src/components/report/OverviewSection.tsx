import { Audit, VisibilityAnalysis, Competitor, SentimentResult, Recommendation } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { scoreColor } from '@/lib/utils';

interface OverviewSectionProps {
  audit: Audit;
  visibilityAnalysis?: VisibilityAnalysis;
  competitors?: Competitor[];
  sentiment?: SentimentResult[];
  recommendations?: Recommendation[];
  brandMentions?: number;
}

const MODEL_LABELS: Record<string, string> = {
  openai: 'GPT-4o',
  anthropic: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
};

function marketStrength(score: number | null): { label: string; variant: 'success' | 'info' | 'warning' | 'error' } {
  if (!score) return { label: 'NO DATA', variant: 'error' };
  if (score >= 70) return { label: 'STRONG', variant: 'success' };
  if (score >= 45) return { label: 'MODERATE', variant: 'info' };
  if (score >= 20) return { label: 'WEAK', variant: 'warning' };
  return { label: 'INVISIBLE', variant: 'error' };
}

function getKeyFindings(
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

  if (brandMentions === 0) findings.push('Brand not mentioned in discovery prompts');
  else if (brandMentions >= 3) findings.push(`Mentioned ${brandMentions}× across AI responses`);

  if (competitorCount > 0) findings.push(`${competitorCount} competitor${competitorCount > 1 ? 's' : ''} identified in AI responses`);
  else findings.push('No direct competitors detected');

  const sentimentRate = sentimentTotal > 0 ? sentimentPositive / sentimentTotal : 0;
  if (sentimentRate >= 0.6) findings.push('Predominantly positive AI sentiment');
  else if (sentimentRate > 0) findings.push('Mixed or neutral AI sentiment');

  return findings.slice(0, 4);
}

function getNextActions(audit: Audit, competitorCount: number): string[] {
  const actions: string[] = [];
  const vis = audit.visibility_score ?? 0;
  const acc = audit.accuracy_score ?? 100;

  if (acc < 80) actions.push('Fix factual errors in AI responses (Accuracy)');
  if (vis < 40) actions.push('Build AI-indexable content for discovery');
  if (competitorCount > 0) actions.push('Monitor competitive movement in AI');
  actions.push('Review full recommendations below');
  if (vis >= 40) actions.push('Optimize content strategy for higher positions');

  return actions.slice(0, 4);
}

export function OverviewSection({
  audit,
  visibilityAnalysis,
  competitors = [],
  sentiment = [],
  brandMentions = 0,
}: OverviewSectionProps) {
  const models = audit.models_queried ?? [];
  const totalPrompts = audit.total_prompts ?? 0;
  const totalCalls = models.length * totalPrompts;

  const competitorCount = competitors.length;
  const marketAvg = competitorCount > 0
    ? Math.round(competitors.reduce((s, c) => s + c.total_mentions, 0) / competitorCount)
    : 0;

  const sentimentPositive = sentiment.filter(s => s.overall_sentiment === 'positive').length;
  const sentimentNegative = sentiment.filter(s => s.overall_sentiment === 'negative').length;
  const sentimentNeutral = sentiment.filter(s =>
    s.overall_sentiment === 'neutral' || s.overall_sentiment === 'mixed'
  ).length;
  const sentimentTotal = sentiment.length;
  const overallSentiment = sentimentPositive > sentimentNegative * 2 ? 'positive'
    : sentimentNegative > sentimentPositive ? 'negative' : 'neutral';

  const strength = marketStrength(audit.visibility_score);
  const discoveryGap = brandMentions - marketAvg;

  const keyFindings = getKeyFindings(audit, brandMentions, competitorCount, sentimentPositive, sentimentTotal);
  const nextActions = getNextActions(audit, competitorCount);

  // Per-model stats from visibilityAnalysis
  const mentionsByModel = visibilityAnalysis?.mentionsByModel ?? {};
  const mentionRate = visibilityAnalysis ? Math.round(visibilityAnalysis.mentionRate * 100) : 0;

  return (
    <section id="overview" className="scroll-mt-24 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-900">AI Market Intelligence Dashboard</h2>
        <p className="text-sm text-gray-400 mt-1">
          Comprehensive analysis of your brand's position in AI recommendation systems
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Tested across <strong className="text-gray-600">{models.length}</strong> AI model{models.length !== 1 ? 's' : ''} with <strong className="text-gray-600">{totalPrompts}</strong> prompts
        </p>
      </div>

      {/* Top score cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center p-5">
          <CardContent className="px-0 py-0">
            <div className={`text-4xl font-bold mb-1 ${scoreColor(audit.visibility_score ?? 0)}`}>
              {audit.visibility_score ?? '—'}
            </div>
            <div className="text-sm font-semibold text-gray-800">Visibility Score</div>
            <div className="text-xs text-gray-400 mt-0.5">Organic AI Discovery</div>
          </CardContent>
        </Card>

        <Card className="text-center p-5">
          <CardContent className="px-0 py-0">
            <div className={`text-4xl font-bold mb-1 ${scoreColor(audit.market_rank ? Math.max(0, 100 - (audit.market_rank - 1) * 20) : 0)}`}>
              {audit.market_rank ? `#${audit.market_rank}` : '—'}
            </div>
            <div className="text-sm font-semibold text-gray-800">Market Rank</div>
            <div className="text-xs text-gray-400 mt-0.5">vs {competitorCount} competitor{competitorCount !== 1 ? 's' : ''}</div>
          </CardContent>
        </Card>

        <Card className="text-center p-5">
          <CardContent className="px-0 py-0">
            <div className={`text-4xl font-bold mb-1 ${scoreColor(brandMentions > 0 ? 70 : 0)}`}>
              {brandMentions}
            </div>
            <div className="text-sm font-semibold text-gray-800">Total Mentions</div>
            <div className="text-xs text-gray-400 mt-0.5">Across {models.length} AI model{models.length !== 1 ? 's' : ''}</div>
          </CardContent>
        </Card>

        <Card className="text-center p-5">
          <CardContent className="px-0 py-0">
            <div className="text-4xl font-bold mb-1 text-gray-500">{marketAvg}</div>
            <div className="text-sm font-semibold text-gray-800">Market Average</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {discoveryGap > 0 ? 'Above average' : discoveryGap < 0 ? 'Below average' : 'On par'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Position Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Competitive Standing */}
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Market Position Analysis</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Competitive Standing</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Market Strength:</span>
                  <Badge variant={strength.variant}>{strength.label}</Badge>
                </div>
              </div>
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                {discoveryGap > 0
                  ? `Discovery Gap: You have ${brandMentions} mention${brandMentions !== 1 ? 's' : ''} vs industry average of ${marketAvg}`
                  : discoveryGap < 0
                  ? `Gap to close: Industry averages ${marketAvg} mentions, you have ${brandMentions}`
                  : `On par with market average of ${marketAvg} mentions`}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Platform Breakdown</h4>
              <div className="space-y-2">
                {models.map((model) => {
                  const count = mentionsByModel[model] ?? 0;
                  return (
                    <div key={model} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 font-medium w-28">{MODEL_LABELS[model] ?? model}</span>
                      <span className="text-gray-500">{count} mention{count !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-gray-400">{mentionRate}% mention rate</span>
                    </div>
                  );
                })}
                {models.length === 0 && (
                  <p className="text-xs text-gray-400">No model data available</p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
              <span className="text-sm text-gray-500">Sentiment</span>
              <Badge variant={overallSentiment === 'positive' ? 'success' : overallSentiment === 'negative' ? 'error' : 'default'}>
                {overallSentiment}
              </Badge>
              {sentimentTotal > 0 && (
                <span className="text-xs text-gray-400">{sentimentTotal} prompt{sentimentTotal !== 1 ? 's' : ''} tested</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Strategic Intelligence Summary */}
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Strategic Intelligence Summary</h3>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Test Coverage</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>AI models tested</span>
                    <span className="font-medium text-gray-800">{models.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unique prompts</span>
                    <span className="font-medium text-gray-800">{totalPrompts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total test calls</span>
                    <span className="font-medium text-gray-800">{totalCalls}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Findings</h4>
                <ul className="space-y-1">
                  {keyFindings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-primary-400 mt-0.5 shrink-0">›</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Next Actions</h4>
                <ul className="space-y-1">
                  {nextActions.map((a, i) => (
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
