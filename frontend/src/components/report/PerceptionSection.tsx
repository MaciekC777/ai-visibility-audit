import { SentimentResult } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';

interface PerceptionSectionProps {
  sentiment?: SentimentResult[];
  perceptionScore?: number | null;
}

export function PerceptionSection({ sentiment, perceptionScore }: PerceptionSectionProps) {
  const results = sentiment?.filter((s) => s.sentiment !== undefined) ?? [];
  const pos = results.filter((s) => s.sentiment === 'positive').length;
  const neu = results.filter((s) => s.sentiment === 'neutral').length;
  const neg = results.filter((s) => s.sentiment === 'negative').length;
  const total = results.length || 1;

  return (
    <section id="perception" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Perception Analysis</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <div className="text-center mb-4">
              <div className={`text-5xl font-bold ${perceptionScore !== null && perceptionScore !== undefined ? (perceptionScore >= 70 ? 'text-green-600' : perceptionScore >= 40 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-300'}`}>
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
            <h3 className="font-medium text-gray-900 mb-4">By model</h3>
            {[...new Set(results.map((r) => r.model))].map((model) => {
              const modelResults = results.filter((r) => r.model === model);
              const modelPos = modelResults.filter((r) => r.sentiment === 'positive').length;
              const pct = Math.round((modelPos / modelResults.length) * 100);
              return (
                <div key={model} className="flex items-center gap-3 mb-3">
                  <span className="text-sm capitalize text-gray-700 w-24">{model}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
            {results.length === 0 && <p className="text-sm text-gray-400">No sentiment data available.</p>}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
