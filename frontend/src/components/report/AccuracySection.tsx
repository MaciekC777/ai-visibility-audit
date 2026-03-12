import { Hallucination } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface AccuracySectionProps {
  hallucinations?: Hallucination[];
  accuracyScore?: number | null;
}

const verdictVariant: Record<Hallucination['verdict'], 'error' | 'warning' | 'success'> = {
  confirmed_false: 'error',
  unverifiable: 'warning',
  confirmed_true: 'success',
};

export function AccuracySection({ hallucinations, accuracyScore }: AccuracySectionProps) {
  const issues = hallucinations?.filter((h) => h.verdict !== 'confirmed_true') ?? [];

  return (
    <section id="accuracy" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Accuracy & Hallucinations</h2>

      <div className="mb-6 flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl">
        <div className={`text-5xl font-bold ${accuracyScore !== null && accuracyScore !== undefined ? (accuracyScore >= 70 ? 'text-green-600' : accuracyScore >= 40 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-300'}`}>
          {accuracyScore ?? '—'}
        </div>
        <div>
          <div className="font-semibold text-gray-900">Accuracy Score</div>
          <div className="text-sm text-gray-500">{issues.length} issue{issues.length !== 1 ? 's' : ''} detected</div>
        </div>
      </div>

      {issues.length === 0 ? (
        <p className="text-green-700 bg-green-50 rounded-xl p-4 text-sm">No hallucinations detected. AI models accurately represent your brand.</p>
      ) : (
        <div className="space-y-3">
          {issues.map((h, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={verdictVariant[h.verdict]}>{h.verdict.replace(/_/g, ' ')}</Badge>
                      <span className="text-xs text-gray-400">{h.model} — prompt {h.promptId}</span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium">&ldquo;{h.claim}&rdquo;</p>
                    <p className="text-xs text-gray-500 mt-1">{h.explanation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
