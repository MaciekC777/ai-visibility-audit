import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PricingPreview } from '@/components/landing/PricingPreview';

export const metadata = { title: 'Pricing' };

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="pt-12">
        <div className="text-center px-4 mb-4">
          <h1 className="text-5xl font-display font-bold text-gray-900 mb-4">Pricing</h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Start free with 1 audit per month. Scale up when you need more visibility.
          </p>
        </div>
        <PricingPreview />

        {/* FAQ */}
        <section className="py-16 px-4 max-w-3xl mx-auto">
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-8 text-center">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'What counts as one audit?',
                a: 'One audit = one domain analyzed. We scrape your site, generate prompts, query all AI models, and produce the full report.',
              },
              {
                q: 'Which AI models are queried?',
                a: 'Free and Starter plans query 2–3 models (OpenAI GPT-4o, Anthropic Claude). Pro and Agency plans query all four: OpenAI, Anthropic, Google Gemini, and Perplexity.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. Cancel any time from your settings page. Your plan continues until the end of the billing period.',
              },
              {
                q: 'Is my data private?',
                a: 'Yes. Your audit results are only visible to you. We never share or train on your data.',
              },
            ].map((faq) => (
              <div key={faq.q} className="border-b border-gray-100 pb-6">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
