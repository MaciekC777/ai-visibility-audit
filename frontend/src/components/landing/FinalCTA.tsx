import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function FinalCTA() {
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-primary-600 to-accent-600">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl font-display font-bold text-white mb-6">
          Find out what AI says about your brand — today
        </h2>
        <p className="text-xl text-primary-100 mb-10">
          Your first audit is free. No credit card, no setup. Results in minutes.
        </p>
        <Link href="/signup">
          <Button size="lg" variant="secondary" className="shadow-xl">
            Run your free audit
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Button>
        </Link>
      </div>
    </section>
  );
}
