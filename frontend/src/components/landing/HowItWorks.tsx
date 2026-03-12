const STEPS = [
  { number: '01', title: 'Enter your domain', description: 'Type your website URL and we scrape your brand profile automatically.' },
  { number: '02', title: 'We query AI models', description: 'Dozens of prompts are sent to ChatGPT, Gemini, Claude, and Perplexity simultaneously.' },
  { number: '03', title: 'Deep analysis runs', description: 'We detect hallucinations, score sentiment, map competitors, and calculate your visibility.' },
  { number: '04', title: 'Get your report', description: 'A full scored report with prioritized recommendations arrives in minutes.' },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">How it works</h2>
          <p className="text-lg text-gray-500">From domain to full AI visibility report in under 3 minutes.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {STEPS.map((step, i) => (
            <div key={step.number} className="relative text-center">
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-primary-100" />
              )}
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 text-white font-bold text-lg mb-4 mx-auto">
                {step.number}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
