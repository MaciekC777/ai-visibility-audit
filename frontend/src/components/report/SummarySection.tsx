import { AuditSummary } from '@/types';

interface SummarySectionProps {
  summary?: AuditSummary;
  brandName?: string;
}

export function SummarySection({ summary, brandName }: SummarySectionProps) {
  if (!summary) return null;

  return (
    <section className="bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-100 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-6 bg-primary-500 rounded-full" />
        <h2 className="text-base font-semibold text-primary-800">
          AI Visibility Summary{brandName ? ` — ${brandName}` : ''}
        </h2>
      </div>
      <div className="space-y-3">
        <p className="text-sm text-gray-700 leading-relaxed">{summary.paragraph1}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{summary.paragraph2}</p>
      </div>
    </section>
  );
}
