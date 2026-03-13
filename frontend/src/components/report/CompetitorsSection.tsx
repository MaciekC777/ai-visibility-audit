import { Competitor } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';

interface CompetitorsSectionProps {
  competitors?: Competitor[];
  brandName?: string;
  brandMentions?: number;
}

export function CompetitorsSection({ competitors, brandName, brandMentions = 0 }: CompetitorsSectionProps) {
  const top = competitors?.slice(0, 10) ?? [];
  const maxCount = Math.max(...top.map((c) => c.total_mentions), brandMentions, 1);

  return (
    <section id="competitors" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">AI Competitor Landscape</h2>

      {top.length === 0 ? (
        <p className="text-gray-500 bg-gray-50 rounded-xl p-4 text-sm">No competitors detected in AI responses.</p>
      ) : (
        <Card>
          <CardContent>
            <div className="space-y-3">
              {/* Brand itself */}
              {brandName && (
                <div className="flex items-center gap-4">
                  <div className="w-36 text-sm font-semibold text-primary-700 truncate">{brandName} (you)</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${(brandMentions / maxCount) * 100}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-600 w-12 text-right">{brandMentions}</div>
                </div>
              )}

              {top.map((c) => (
                <div key={c.name} className="flex items-center gap-4">
                  <div className="w-36 text-sm text-gray-700 truncate">{c.name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gray-400 rounded-full"
                      style={{ width: `${(c.total_mentions / maxCount) * 100}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-600 w-12 text-right">{c.total_mentions}</div>
                  {c.replacement_rate > 0.1 && (
                    <span className="text-xs text-red-500 whitespace-nowrap">
                      replaces you {Math.round(c.replacement_rate * 100)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">Mention counts across all AI model responses</p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
