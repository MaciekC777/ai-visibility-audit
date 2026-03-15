'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAudit } from '@/hooks/useAudit';
import { Sidebar } from '@/components/layout/Sidebar';
import { OverviewSection } from '@/components/report/OverviewSection';
import { QuickWinsSection } from '@/components/report/QuickWinsSection';
import { AnalyticsPanelSection } from '@/components/report/AnalyticsPanelSection';
import { CompetitorsSection } from '@/components/report/CompetitorsSection';
import { PromptResultsSection } from '@/components/report/PromptResultsSection';
import { PerceptionSection } from '@/components/report/PerceptionSection';
import { AccuracySection } from '@/components/report/AccuracySection';
import { WebsiteReadinessSection } from '@/components/report/WebsiteReadinessSection';
import { RecommendationsSection } from '@/components/report/RecommendationsSection';
import { GeoReadinessSection } from '@/components/report/GeoReadinessSection';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { getT } from '@/lib/reportTranslations';

function SectionLabel({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">
        {number}
      </div>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

export default function AuditReportPage() {
  const { id } = useParams<{ id: string }>();
  const { report, loading, error } = useAudit(id);

  const lang = report?.audit.target_language;
  const t = getT(lang);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 animate-pulse">{getT().loadingReport}</div>
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error ?? getT().reportNotFound}</p>
            <Link href="/dashboard"><Button variant="outline">{getT().backToDashboard}</Button></Link>
          </div>
        </main>
      </div>
    );
  }

  const {
    audit, brandProfile, promptResults, hallucinations,
    competitors, sentiment, recommendations,
    websiteReadiness, thirdParty, summary, competitorSearch,
  } = report;

  const brandTotalMentions = Object.values(report.visibilityAnalysis?.mentionsByModel ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 px-8 py-8 min-w-0 max-w-5xl mx-auto">

        {/* Page header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Link href="/dashboard" className="hover:text-gray-600">{t.dashboard}</Link>
              <span>/</span>
              <span className="text-gray-600">{audit.brand_name ?? audit.domain}</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-gray-900">{t.aiVisibilityReport}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {audit.domain} &middot; {formatDate(audit.created_at)}
              {audit.completed_at && ` · ${t.completed} ${formatDate(audit.completed_at)}`}
            </p>
          </div>
          <Link href="/audit/new">
            <Button variant="outline" size="sm">{t.newAudit}</Button>
          </Link>
        </div>

        <div className="space-y-16">

          {/* 1 — Overview */}
          <div>
            <SectionLabel number={1} label={t.sectionOverview} />
            <OverviewSection
              audit={audit}
              summary={summary}
              competitors={competitors}
              brandMentions={brandTotalMentions}
              language={lang}
            />
          </div>

          {/* 2 — Do this today */}
          <div>
            <SectionLabel number={2} label={t.sectionDoThisToday} />
            <QuickWinsSection recommendations={recommendations} language={lang} />
          </div>

          {/* 3 — Analytics Panel */}
          <div>
            <SectionLabel number={3} label={t.sectionAnalytics} />
            <AnalyticsPanelSection
              audit={audit}
              visibilityAnalysis={report.visibilityAnalysis}
              competitors={competitors}
              sentiment={sentiment}
              brandMentions={brandTotalMentions}
              language={lang}
            />
          </div>

          {/* 4 — Competitor Analysis */}
          <div>
            <SectionLabel number={4} label={t.sectionCompetitors} />
            <div className="space-y-6">
              <CompetitorsSection
                competitors={competitors}
                brandName={brandProfile?.brand.name}
                brandMentions={brandTotalMentions}
                competitorSearch={competitorSearch}
                language={lang}
              />
              {audit.target_keywords && audit.target_keywords.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t.trackedKeywords}</h3>
                  <div className="flex flex-wrap gap-2">
                    {audit.target_keywords.map((kw, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 text-sm text-gray-700 rounded-lg">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5 — Used Prompts + Responses */}
          <div>
            <SectionLabel number={5} label={t.sectionPrompts} />
            <PromptResultsSection
              promptResults={promptResults}
              brandName={brandProfile?.brand.name}
              language={lang}
            />
          </div>

          {/* 6 — How AI sees your brand */}
          <div>
            <SectionLabel number={6} label={t.sectionHowAISees} />
            <div className="space-y-6">
              <PerceptionSection sentiment={sentiment} perceptionScore={audit.perception_score} language={lang} />
              <AccuracySection hallucinations={hallucinations} accuracyScore={audit.accuracy_score} language={lang} />
            </div>
          </div>

          {/* 7 — Website Analysis */}
          <div>
            <SectionLabel number={7} label={t.sectionWebsite} />
            <WebsiteReadinessSection
              websiteReadiness={websiteReadiness}
              brandProfile={brandProfile}
              language={lang}
            />
          </div>

          {/* 8 — Detailed Recommendations */}
          <div>
            <SectionLabel number={8} label={t.sectionRecommendations} />
            <RecommendationsSection recommendations={recommendations} language={lang} />
          </div>

          {/* 9 — GEO Readiness Audit */}
          <div>
            <SectionLabel number={9} label={t.sectionGeo} />
            <GeoReadinessSection
              brandProfile={brandProfile}
              websiteReadiness={websiteReadiness}
              thirdParty={thirdParty}
              language={lang}
            />
          </div>

        </div>
      </main>
    </div>
  );
}
