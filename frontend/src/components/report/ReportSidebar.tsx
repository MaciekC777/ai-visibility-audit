'use client';

import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'quick-wins', label: 'Quick Wins' },
  { id: 'accuracy', label: 'Accuracy' },
  { id: 'prompt-results', label: 'Prompt Results' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'perception', label: 'Perception' },
  { id: 'website', label: 'Website Readiness' },
  { id: 'third-party', label: 'Third-Party' },
  { id: 'recommendations', label: 'Recommendations' },
];

export function ReportSidebar({ activeSection }: { activeSection?: string }) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="sticky top-24 w-52 shrink-0 hidden lg:block">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Report Sections</p>
      <div className="flex flex-col gap-0.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className={cn(
              'text-left px-3 py-2 rounded-lg text-sm transition-colors',
              activeSection === s.id
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
