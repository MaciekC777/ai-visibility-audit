import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    features: ['1 audit/month', '2 AI models', '10 prompts', 'Basic report'],
    cta: 'Start free',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    features: ['20 audits/month', 'All 4 AI models', '50 prompts', 'Full report + recommendations', 'Hallucination detection'],
    cta: 'Start Pro',
    href: '/signup?plan=pro',
    highlight: true,
  },
  {
    name: 'Agency',
    price: '$149',
    period: '/month',
    features: ['Unlimited audits', 'All 4 AI models', '100 prompts', 'White-label reports', 'Priority support'],
    cta: 'Contact us',
    href: '/signup?plan=agency',
    highlight: false,
  },
];

export function PricingPreview() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-lg text-gray-500">Start free. Upgrade when you need more.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 ${plan.highlight
                ? 'bg-primary-600 text-white ring-2 ring-primary-600'
                : 'bg-white border border-gray-200'}`}
            >
              <h3 className={`text-lg font-semibold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.price}
                </span>
                <span className={plan.highlight ? 'text-primary-200' : 'text-gray-500'}>{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? 'text-primary-100' : 'text-gray-600'}`}>
                    <svg className={`w-4 h-4 shrink-0 ${plan.highlight ? 'text-primary-200' : 'text-primary-500'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} className="block">
                <Button
                  className="w-full"
                  variant={plan.highlight ? 'secondary' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
