import { Recommendation } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

interface RecommendationsSectionProps {
  recommendations?: Recommendation[];
}

const priorityVariant: Record<Recommendation['priority'], 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const effortLabels: Record<Recommendation['effort'], { label: string; color: string }> = {
  quick_win: { label: '⚡ Quick win', color: 'text-green-600' },
  moderate: { label: '⏱ Moderate effort', color: 'text-yellow-600' },
  significant: { label: '🔧 Significant effort', color: 'text-red-600' },
};

const categoryLabels: Record<string, string> = {
  accuracy: 'Fix Accuracy Issues',
  visibility: 'Boost Visibility',
  website: 'Website Improvements',
  presence: 'Third-Party Presence',
};

export function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
  if (!recommendations || recommendations.length === 0) return null;

  const grouped = recommendations.reduce<Record<string, Recommendation[]>>((acc, r) => {
    acc[r.category] = [...(acc[r.category] ?? []), r];
    return acc;
  }, {});

  return (
    <section id="recommendations" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Recommendations</h2>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, recs]) => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {categoryLabels[category] ?? category}
            </h3>
            <div className="space-y-3">
              {recs.map((r, i) => {
                const effort = effortLabels[r.effort];
                return (
                  <Card key={i}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-gray-900">{r.title}</span>
                            <Badge variant={priorityVariant[r.priority]}>{r.priority}</Badge>
                            {effort && (
                              <span className={`text-xs font-medium ${effort.color}`}>{effort.label}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{r.description}</p>
                          {r.based_on && (
                            <p className="text-xs text-gray-400 mt-1.5 italic">Based on: {r.based_on}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
