import { WebsiteReadiness, AnyBrandProfile } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { getT } from '@/lib/reportTranslations';

interface WebsiteReadinessSectionProps {
  websiteReadiness?: WebsiteReadiness;
  brandProfile?: AnyBrandProfile;
  language?: string;
}

const importanceColor: Record<string, string> = {
  critical: 'text-red-600 bg-red-50',
  high: 'text-orange-600 bg-orange-50',
  medium: 'text-yellow-600 bg-yellow-50',
  low: 'text-gray-500 bg-gray-50',
};

export function WebsiteReadinessSection({ websiteReadiness, brandProfile, language }: WebsiteReadinessSectionProps) {
  const t = getT(language);
  if (!websiteReadiness) return null;

  const checks = websiteReadiness.checks ?? [];
  const score = websiteReadiness.score;
  const passedCount = checks.filter(c => c.status === 'pass').length;

  const p = brandProfile as any;
  const isSaaS = p?.mode === 'saas' || (p?.business_type && !['local_business', 'restaurant'].includes(p.business_type));
  const keyFeatures: string[] = (
    p?.key_features ?? p?.features?.core ?? p?.services?.primary ?? []
  ).slice(0, 6);
  const description: string | undefined = p?.one_liner ?? p?.brand?.description;

  return (
    <section id="website" className="scroll-mt-24 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-gray-900">{t.websiteAnalysis}</h2>
          <p className="text-sm text-gray-400 mt-1">{t.technicalReadiness}</p>
        </div>
        <div className="text-center shrink-0">
          <div className={`text-4xl font-bold ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
            {score}
          </div>
          <div className="text-xs text-gray-400">{t.passed(passedCount, checks.length)}</div>
        </div>
      </div>

      {(keyFeatures.length > 0 || description) && (
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {isSaaS ? t.keyFeaturesDetected : t.keyServicesDetected}
            </h3>
            {description && (
              <p className="text-sm text-gray-500 mb-3 italic">&ldquo;{description.slice(0, 200)}{description.length > 200 ? '…' : ''}&rdquo;</p>
            )}
            {keyFeatures.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keyFeatures.map((f, i) => (
                  <span key={i} className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-100">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {websiteReadiness.mode === 'local' ? t.localSeoChecks : t.seoAIChecks}
          </h3>
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
