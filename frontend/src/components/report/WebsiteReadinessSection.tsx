import { WebsiteReadiness } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';

interface WebsiteReadinessSectionProps {
  websiteReadiness?: WebsiteReadiness;
}

export function WebsiteReadinessSection({ websiteReadiness }: WebsiteReadinessSectionProps) {
  if (!websiteReadiness) return null;

  const checks = [
    { label: 'Structured Data (JSON-LD)', passed: websiteReadiness.hasStructuredData, tip: 'Add Schema.org markup to help AI parse your brand info' },
    { label: 'About Page', passed: websiteReadiness.hasAboutPage, tip: 'AI models frequently reference About pages for brand facts' },
    { label: 'Pricing Page', passed: websiteReadiness.hasPricingPage, tip: 'Transparent pricing reduces hallucinations about your pricing' },
    { label: 'Blog / Resources', passed: websiteReadiness.hasBlogOrResources, tip: 'Content-rich sites rank higher in AI knowledge bases' },
    { label: 'Press Mentions', passed: websiteReadiness.hasPressMentions, tip: '"Featured in" sections boost brand credibility for AI' },
    { label: 'Meta Title Optimized', passed: websiteReadiness.metaTitleOptimized, tip: '30-70 characters with brand name and main keyword' },
    { label: 'Meta Description Optimized', passed: websiteReadiness.metaDescriptionOptimized, tip: '120-160 characters describing your core value proposition' },
  ];

  const score = websiteReadiness.score;

  return (
    <section id="website" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Website Readiness</h2>

      <div className="flex items-center gap-4 mb-6 p-5 bg-white border border-gray-200 rounded-xl">
        <div className={`text-5xl font-bold ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
          {score}
        </div>
        <div>
          <div className="font-semibold text-gray-900">Website Readiness Score</div>
          <div className="text-sm text-gray-500">{checks.filter((c) => c.passed).length}/{checks.length} checks passed</div>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="space-y-3">
            {checks.map((check) => (
              <div key={check.label} className="flex items-start gap-3">
                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${check.passed ? 'bg-green-100' : 'bg-red-100'}`}>
                  {check.passed ? (
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{check.label}</div>
                  {!check.passed && <div className="text-xs text-gray-500 mt-0.5">{check.tip}</div>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
