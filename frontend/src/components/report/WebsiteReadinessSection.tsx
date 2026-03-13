import { WebsiteReadiness } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';

interface WebsiteReadinessSectionProps {
  websiteReadiness?: WebsiteReadiness;
}

const importanceColor: Record<string, string> = {
  critical: 'text-red-600 bg-red-50',
  high: 'text-orange-600 bg-orange-50',
  medium: 'text-yellow-600 bg-yellow-50',
  low: 'text-gray-500 bg-gray-50',
};

export function WebsiteReadinessSection({ websiteReadiness }: WebsiteReadinessSectionProps) {
  if (!websiteReadiness) return null;

  const checks = websiteReadiness.checks ?? [];
  const score = websiteReadiness.score;
  const passedCount = checks.filter(c => c.status === 'pass').length;

  return (
    <section id="website" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
        {websiteReadiness.mode === 'local' ? 'Local SEO Readiness' : 'Website AI Readiness'}
      </h2>

      <div className="flex items-center gap-4 mb-6 p-5 bg-white border border-gray-200 rounded-xl">
        <div className={`text-5xl font-bold ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
          {score}
        </div>
        <div>
          <div className="font-semibold text-gray-900">
            {websiteReadiness.mode === 'local' ? 'Local Visibility Score' : 'GEO Readiness Score'}
          </div>
          <div className="text-sm text-gray-500">{passedCount}/{checks.length} checks passed</div>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="space-y-3">
            {checks.map((check) => (
              <div key={check.check} className="flex items-start gap-3">
                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${check.status === 'pass' ? 'bg-green-100' : check.status === 'partial' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                  {check.status === 'pass' ? (
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : check.status === 'partial' ? (
                    <svg className="w-3 h-3 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-gray-900">{check.check}</div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${importanceColor[check.importance] ?? ''}`}>
                      {check.importance}
                    </span>
                  </div>
                  {check.detail && <div className="text-xs text-gray-500 mt-0.5">{check.detail}</div>}
                  {check.status !== 'pass' && check.recommendation && (
                    <div className="text-xs text-blue-600 mt-0.5">→ {check.recommendation}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
