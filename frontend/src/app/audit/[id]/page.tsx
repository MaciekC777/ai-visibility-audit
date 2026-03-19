'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAudit } from '@/hooks/useAudit';
import { Sidebar } from '@/components/layout/Sidebar';
import { BrandProfileCard } from '@/components/report/BrandProfileCard';
import { PromptResultsSection } from '@/components/report/PromptResultsSection';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { getT } from '@/lib/reportTranslations';
import { getBrandName } from '@/types';

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

  const { audit, brandProfile, promptResults } = report;

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

        <div className="space-y-8">
          <BrandProfileCard brandProfile={brandProfile} />
          <PromptResultsSection
            promptResults={promptResults}
            brandName={getBrandName(brandProfile)}
            language={lang}
          />
        </div>

      </main>
    </div>
  );
}
