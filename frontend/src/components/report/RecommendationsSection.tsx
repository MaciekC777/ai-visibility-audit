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

const effortImpactColor = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
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
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{category}</h3>
            <div className="space-y-3">
              {recs.map((r, i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{r.title}</span>
                          <Badge variant={priorityVariant[r.priority]}>{r.priority}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{r.description}</p>
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className={effortImpactColor[r.effort]}>Effort: {r.effort}</span>
                          <span className={effortImpactColor[r.impact]}>Impact: {r.impact}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
