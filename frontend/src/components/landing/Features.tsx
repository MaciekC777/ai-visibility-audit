const FEATURES = [
  {
    icon: '🔍',
    title: 'Multi-Model Analysis',
    description: 'Query ChatGPT, Gemini, Claude, and Perplexity simultaneously to see how each AI perceives your brand.',
  },
  {
    icon: '🎯',
    title: 'Hallucination Detection',
    description: 'Identify false claims AI models make about your products, pricing, or features — before they mislead customers.',
  },
  {
    icon: '📊',
    title: 'Competitor Mapping',
    description: 'Discover which competitors AI models recommend instead of you and understand your market position.',
  },
  {
    icon: '💡',
    title: 'Actionable Recommendations',
    description: 'Get a prioritized list of steps to improve your AI visibility, from content strategy to third-party listings.',
  },
  {
    icon: '🌐',
    title: 'Website Readiness',
    description: 'Analyze whether your website is structured for AI consumption — structured data, clear USPs, and more.',
  },
  {
    icon: '⚡',
    title: 'Real-Time Processing',
    description: 'Watch your audit run live with step-by-step progress updates via Supabase Realtime.',
  },
];

export function Features() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">
            Everything you need to dominate AI search
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            A complete picture of how AI models represent your brand, with the tools to improve it.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
