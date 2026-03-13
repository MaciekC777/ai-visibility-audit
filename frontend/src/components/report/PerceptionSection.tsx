import { SentimentResult } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';

interface PerceptionSectionProps {
  sentiment?: SentimentResult[];
  perceptionScore?: number | null;
}

export function PerceptionSection({ sentiment, perceptionScore }: PerceptionSectionProps) {
  const results = sentiment ?? [];
  const pos = results.filter((s) => s.overall_sentiment === 'positive').length;
  const neu = results.filter((s) => s.overall_sentiment === 'neutral' || s.overall_sentiment === 'mixed').length;
  const neg = results.filter((s) => s.overall_sentiment === 'negative').length;
  const total = results.length || 1;

  // Collect unique praise/criticism
  const allPraise = [...new Set(results.flatMap(s => s.specific_praise).filter(Boolean))].slice(0, 5);
  const allCriticism = [...new Set(results.flatMap(s => s.specific_criticism).filter(Boolean))].slice(0, 5);

  return (
    <section id="perception" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Perception Analysis</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <div className="text-center mb-4">
              <div className={`text-5xl font-bold ${perceptionScore == null ? 'text-gray-300' : perceptionScore >= 70 ? 'text-green-600' : perceptionScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                {perceptionScore ?? '—'}
              </div>
              <div className="text-sm text-gray-500 mt-1">Perception Score</div>
            </div>

            {/* Stacked bar */}
            <div className="h-4 rounded-full overflow-hidden flex">
              <div className="bg-green-400" style={{ width: `${(pos / total) * 100}%` }} />
              <div className="bg-gray-300" style={{ width: `${(neu / total) * 100}%` }} />
              <div className="bg-red-400" style={{ width: `${(neg / total) * 100}%` }} />
            </div>

            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> {Math.round((pos / total) * 100)}% positive</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> {Math.round((neu / total) * 100)}% neutral</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> {Math.round((neg / total) * 100)}% negative</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            {allPraise.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">What AI praises</h3>
                <ul className="space-y-1">
                  {allPraise.map((p, i) => (
                    <li key={i} className="text-sm text-green-700 flex items-start gap-1.5">
                      <span className="text-green-500 mt-0.5">✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {allCriticism.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">What AI criticizes</h3>
                <ul className="space-y-1">
                  {allCriticism.map((c, i) => (
                    <li key={i} className="text-sm text-red-700 flex items-start gap-1.5">
                      <span className="text-red-500 mt-0.5">✗</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {allPraise.length === 0 && allCriticism.length === 0 && (
              <p className="text-sm text-gray-400">No specific praise or criticism detected.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
