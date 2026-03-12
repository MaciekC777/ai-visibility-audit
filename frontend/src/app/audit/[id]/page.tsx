'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAudit } from '@/hooks/useAudit';
import { Sidebar } from '@/components/layout/Sidebar';
import { ReportSidebar } from '@/components/report/ReportSidebar';
import { OverviewSection } from '@/components/report/OverviewSection';
import { QuickWinsSection } from '@/components/report/QuickWinsSection';
import { AccuracySection } from '@/components/report/AccuracySection';
import { PromptResultsSection } from '@/components/report/PromptResultsSection';
import { CompetitorsSection } from '@/components/report/CompetitorsSection';
import { PerceptionSection } from '@/components/report/PerceptionSection';
import { WebsiteReadinessSection } from '@/components/report/WebsiteReadinessSection';
import { ThirdPartySection } from '@/components/report/ThirdPartySection';
import { RecommendationsSection } from '@/components/report/RecommendationsSection';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

export default function AuditReportPage() {
  const { id } = useParams<{ id: string }>();
  const { report, loading, error } = useAudit(id);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 animate-pulse">Loading report...</div>
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
            <p className="text-red-600 mb-4">{error ?? 'Report not found'}</p>
            <Link href="/dashboard"><Button variant="outline">Back to dashboard</Button></Link>
          </div>
        </main>
      </div>
    );
  }

  const { audit, brandProfile, promptResults, hallucinations, competitors, sentiment, recommendations, websiteReadiness, thirdParty } = report;

  const brandTotalMentions = Object.values(report.visibilityAnalysis?.mentionsByModel ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex">
        <main className="flex-1 px-8 py-8 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
                <span>/</span>
                <span className="text-gray-600">{audit.brand_name ?? audit.domain}</span>
              </div>
              <h1 className="text-2xl font-display font-bold text-gray-900">
                AI Visibility Report
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {audit.domain} &middot; {formatDate(audit.created_at)}
                {audit.completed_at && ` · Completed ${formatDate(audit.completed_at)}`}
              </p>
            </div>
            <Link href="/audit/new">
              <Button variant="outline" size="sm">New audit</Button>
            </Link>
          </div>

          {/* Report sections */}
          <div className="space-y-12">
            <OverviewSection audit={audit} />
            <QuickWinsSection recommendations={recommendations} />
            <AccuracySection hallucinations={hallucinations} accuracyScore={audit.accuracy_score} />
            <PromptResultsSection promptResults={promptResults} brandName={brandProfile?.brandName} />
            <CompetitorsSection competitors={competitors} brandName={brandProfile?.brandName} brandMentions={brandTotalMentions} />
            <PerceptionSection sentiment={sentiment} perceptionScore={audit.perception_score} />
            <WebsiteReadinessSection websiteReadiness={websiteReadiness} />
            <ThirdPartySection thirdParty={thirdParty} />
            <RecommendationsSection recommendations={recommendations} />
          </div>
        </main>

        <ReportSidebar />
      </div>
    </div>
  );
}
