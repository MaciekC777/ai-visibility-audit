import { VerifiedClaim } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

interface AccuracySectionProps {
  hallucinations?: VerifiedClaim[];
  accuracyScore?: number | null;
}

const verdictVariant: Record<string, 'error' | 'warning' | 'success' | 'info'> = {
  incorrect: 'error',
  partially_correct: 'warning',
  outdated: 'warning',
  unverifiable: 'info',
  correct: 'success',
};

const severityBadge: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

export function AccuracySection({ hallucinations, accuracyScore }: AccuracySectionProps) {
  const issues = hallucinations?.filter((h) => h.verdict !== 'correct') ?? [];

  return (
    <section id="accuracy" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">AI Accuracy Report</h2>

      <div className="mb-6 flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl">
        <div className={`text-5xl font-bold ${accuracyScore == null ? 'text-gray-300' : accuracyScore >= 90 ? 'text-green-600' : accuracyScore >= 70 ? 'text-yellow-500' : accuracyScore >= 50 ? 'text-orange-500' : 'text-red-600'}`}>
          {accuracyScore ?? '—'}
        </div>
        <div>
          <div className="font-semibold text-gray-900">Accuracy Score</div>
          <div className="text-sm text-gray-500">
            {accuracyScore == null ? 'No verifiable claims found' : `${issues.length} issue${issues.length !== 1 ? 's' : ''} detected`}
          </div>
        </div>
      </div>

      {issues.length === 0 ? (
        <p className="text-green-700 bg-green-50 rounded-xl p-4 text-sm">
          {accuracyScore == null
            ? 'AI models returned no verifiable factual claims about your brand.'
            : 'No hallucinations detected. AI models accurately represent your brand.'}
        </p>
      ) : (
        <div className="space-y-3">
          {issues.map((h, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={verdictVariant[h.verdict] ?? 'default'}>
                        {h.verdict.replace(/_/g, ' ')}
                      </Badge>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadge[h.severity] ?? ''}`}>
                        {h.severity} severity
                      </span>
                      <span className="text-xs text-gray-400">{h.model} — prompt {h.promptId}</span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium">&ldquo;{h.claim_text}&rdquo;</p>
                    <p className="text-xs text-gray-500 mt-1">{h.explanation}</p>
                    {h.correction && (
                      <p className="text-xs text-blue-600 mt-1 font-medium">✓ Correct: {h.correction}</p>
                    )}
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
