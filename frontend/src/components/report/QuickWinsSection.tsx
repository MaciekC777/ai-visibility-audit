import { Recommendation } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { getT } from '@/lib/reportTranslations';

interface QuickWinsSectionProps {
  recommendations?: Recommendation[];
  language?: string;
}

export function QuickWinsSection({ recommendations, language }: QuickWinsSectionProps) {
  const t = getT(language);
  const quickWins = recommendations?.filter(
    (r) => r.priority === 'critical' || r.priority === 'high'
  ).slice(0, 3) ?? [];

  if (quickWins.length === 0) return null;

  return (
    <section id="quick-wins" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">{t.doThisToday}</h2>
      <p className="text-sm text-gray-400 mb-6">{t.highestImpactActions}</p>
      <div className="space-y-4">
        {quickWins.map((r, i) => (
          <div key={i} className="flex gap-4 p-5 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
              {i + 1}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900">{r.title}</span>
                <Badge variant={r.priority === 'critical' ? 'error' : 'warning'}>
                  {r.priority}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{r.description}</p>
              <div className="flex gap-3 mt-2 text-xs text-gray-400">
                <span>{t.effort}{r.effort?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
