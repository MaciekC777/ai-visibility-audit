import { Audit, AuditSummary, Competitor } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { scoreColor } from '@/lib/utils';
import { getT } from '@/lib/reportTranslations';

interface OverviewSectionProps {
  audit: Audit;
  summary?: AuditSummary;
  competitors?: Competitor[];
  brandMentions?: number;
  language?: string;
}

function ScoreCard({ label, value, sub }: { label: string; value: number | string | null; sub: string }) {
  const numeric = typeof value === 'number' ? value : null;
  return (
    <Card className="text-center p-6">
      <CardContent className="px-0 py-0">
        <div className={`text-4xl font-bold mb-1 ${numeric !== null ? scoreColor(numeric) : 'text-gray-300'}`}>
          {value ?? '—'}
        </div>
        <div className="text-sm font-semibold text-gray-800">{label}</div>
        <div className="text-xs text-gray-400 mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}

export function OverviewSection({ audit, summary, competitors = [], brandMentions = 0, language }: OverviewSectionProps) {
  const t = getT(language);
  const modelsCount = audit.models_queried?.length ?? 0;

  return (
    <section id="overview" className="scroll-mt-24 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard label={t.visibilityScore} value={audit.visibility_score} sub={t.aiDiscoveryRate} />
        <ScoreCard label={t.accuracyScore} value={audit.accuracy_score} sub={t.factualCorrectness} />
        <ScoreCard label={t.perceptionScore} value={audit.perception_score} sub={t.sentimentInResponses} />
        <ScoreCard label={t.marketRank} value={audit.market_rank ? `#${audit.market_rank}` : null} sub={t.vsCompetitorsInAI} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl px-5 py-4 text-center">
          <div className="text-2xl font-bold text-gray-800">{competitors.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">{t.competitorsDetected}</div>
        </div>
        <div className="bg-gray-50 rounded-xl px-5 py-4 text-center">
          <div className="text-2xl font-bold text-gray-800">{brandMentions}</div>
          <div className="text-xs text-gray-500 mt-0.5">{t.totalAIMentions}</div>
        </div>
        <div className="bg-gray-50 rounded-xl px-5 py-4 text-center">
          <div className="text-2xl font-bold text-gray-800">{modelsCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">{t.aiModelsTested}</div>
        </div>
      </div>

      {summary && (
        <div className="bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-100 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-primary-500 rounded-full" />
            <h3 className="text-base font-semibold text-primary-800">
              {t.aiVisibilitySummary}{audit.brand_name ? ` — ${audit.brand_name}` : ''}
            </h3>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-700 leading-relaxed">{summary.paragraph1}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{summary.paragraph2}</p>
          </div>
        </div>
      )}
    </section>
  );
}
