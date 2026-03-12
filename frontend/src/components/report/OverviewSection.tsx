import { Audit } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { scoreColor } from '@/lib/utils';

interface OverviewSectionProps {
  audit: Audit;
}

export function OverviewSection({ audit }: OverviewSectionProps) {
  const scores = [
    { label: 'Visibility Score', value: audit.visibility_score, suffix: '/100', desc: 'How often AI mentions your brand' },
    { label: 'Accuracy Score', value: audit.accuracy_score, suffix: '/100', desc: 'Factual correctness of AI responses' },
    { label: 'Perception Score', value: audit.perception_score, suffix: '/100', desc: 'Sentiment when AI mentions you' },
    { label: 'Market Rank', value: audit.market_rank ? `#${audit.market_rank}` : null, suffix: '', desc: 'Position vs competitors in AI' },
  ];

  return (
    <section id="overview" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {scores.map((s) => (
          <Card key={s.label} className="text-center p-6">
            <CardContent className="px-0 py-0">
              <div className={`text-4xl font-bold mb-1 ${s.value !== null ? scoreColor(typeof s.value === 'number' ? s.value : 50) : 'text-gray-300'}`}>
                {s.value !== null ? `${s.value}${s.suffix}` : '—'}
              </div>
              <div className="text-sm font-medium text-gray-900">{s.label}</div>
              <div className="text-xs text-gray-400 mt-1">{s.desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-500">
        <strong className="text-gray-700">Domain:</strong> {audit.domain}
        {audit.brand_name && <> &middot; <strong className="text-gray-700">Brand:</strong> {audit.brand_name}</>}
        {audit.models_queried && <> &middot; <strong className="text-gray-700">Models:</strong> {audit.models_queried.join(', ')}</>}
        {audit.total_prompts && <> &middot; <strong className="text-gray-700">Prompts:</strong> {audit.total_prompts}</>}
      </div>
    </section>
  );
}
