import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-24 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-100/50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent-100/50 blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-sm font-medium mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
          </span>
          Now auditing ChatGPT, Gemini, Claude & Perplexity
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-gray-900 leading-tight text-balance mb-6">
          How does AI describe{' '}
          <span className="gradient-text">your brand?</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
          Get a full visibility audit across every major AI model. See exactly what ChatGPT,
          Gemini, Claude and Perplexity say about you — and get a roadmap to fix it.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary-200">
              Start free audit
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              See how it works
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-400">Free for 1 audit/month. No credit card required.</p>

        {/* Score cards preview */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
          {[
            { label: 'Visibility Score', value: '72', color: 'text-green-600' },
            { label: 'Accuracy Score', value: '85', color: 'text-green-600' },
            { label: 'Perception', value: '61', color: 'text-yellow-600' },
            { label: 'Market Rank', value: '#3', color: 'text-primary-600' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-gray-500 mt-1">{card.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
