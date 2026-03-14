'use client';

import { Competitor } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface CompetitorsSectionProps {
  competitors?: Competitor[];
  brandName?: string;
  brandMentions?: number;
}

const MODEL_LABELS: Record<string, string> = {
  openai: 'GPT',
  anthropic: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
};

export function CompetitorsSection({ competitors, brandName, brandMentions = 0 }: CompetitorsSectionProps) {
  const top = competitors?.slice(0, 10) ?? [];
  const maxCount = Math.max(...top.map((c) => c.total_mentions), brandMentions, 1);

  const topThreat = top.find((c) => c.replacement_rate > 0);
  const totalCompetitors = top.length;
  const modelsWithCompetitors = [...new Set(top.flatMap((c) => c.models))].length;

  return (
    <section id="competitors" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Discovered Competitors</h2>
      <p className="text-sm text-gray-500 mb-6">Brands that AI models mentioned alongside or instead of {brandName ?? 'your brand'}.</p>

      {top.length === 0 ? (
        <p className="text-gray-500 bg-gray-50 rounded-xl p-4 text-sm">No competitors detected in AI responses.</p>
      ) : (
        <div className="space-y-6">

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4">
                <div className="text-2xl font-bold text-gray-900">{totalCompetitors}</div>
                <div className="text-xs text-gray-500 mt-0.5">competitors detected</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="text-2xl font-bold text-gray-900">{modelsWithCompetitors}</div>
                <div className="text-xs text-gray-500 mt-0.5">AI models mention competitors</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className={`text-2xl font-bold ${topThreat ? 'text-red-600' : 'text-green-600'}`}>
                  {topThreat ? `${Math.round(topThreat.replacement_rate * 100)}%` : '0%'}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  top replacement rate{topThreat ? ` (${topThreat.name})` : ''}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mention bar chart */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Mention frequency vs. your brand</h3>
              <div className="space-y-3">
                {brandName && (
                  <div className="flex items-center gap-4">
                    <div className="w-36 text-sm font-semibold text-primary-700 truncate">{brandName} <span className="font-normal text-gray-400">(you)</span></div>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(brandMentions / maxCount) * 100}%` }} />
                    </div>
                    <div className="text-sm text-gray-600 w-10 text-right">{brandMentions}</div>
                  </div>
                )}
                {top.map((c) => (
                  <div key={c.name} className="flex items-center gap-4">
                    <div className="w-36 text-sm text-gray-700 truncate">{c.name}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${c.replacement_rate > 0.2 ? 'bg-red-400' : c.replacement_rate > 0.05 ? 'bg-orange-400' : 'bg-gray-400'}`}
                        style={{ width: `${(c.total_mentions / maxCount) * 100}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-600 w-10 text-right">{c.total_mentions}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4">Total mentions across all AI model responses. Red = high replacement risk.</p>
            </CardContent>
          </Card>

          {/* Competitor cards */}
          <div className="grid grid-cols-1 gap-4">
            {top.map((c) => (
              <Card key={c.name}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{c.name}</span>
                        {c.replacement_rate > 0.2 && (
                          <Badge variant="error">High threat</Badge>
                        )}
                        {c.replacement_rate > 0.05 && c.replacement_rate <= 0.2 && (
                          <Badge variant="warning">Moderate threat</Badge>
                        )}
                        {c.models.map((m) => (
                          <Badge key={m} variant="default" className="text-xs capitalize">
                            {MODEL_LABELS[m] ?? m}
                          </Badge>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">Mentions</div>
                          <div className="text-sm font-semibold text-gray-800">{c.total_mentions}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">Co-mention rate</div>
                          <div className="text-sm font-semibold text-gray-800">{Math.round(c.co_mention_rate * 100)}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">Replaces you</div>
                          <div className={`text-sm font-semibold ${c.replacement_rate > 0.1 ? 'text-red-600' : 'text-gray-800'}`}>
                            {Math.round(c.replacement_rate * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Avg position indicator */}
                    {c.avg_position > 0 && (
                      <div className="text-center shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-gray-700">#{Math.round(c.avg_position)}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">avg pos</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      )}
    </section>
  );
}
