'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

const REGIONS = [
  { value: 'global', label: 'Global (English)' },
  { value: 'poland', label: 'Poland 🇵🇱' },
  { value: 'germany', label: 'Germany 🇩🇪' },
  { value: 'france', label: 'France 🇫🇷' },
  { value: 'spain', label: 'Spain 🇪🇸' },
  { value: 'portugal', label: 'Portugal 🇵🇹' },
];

const REGION_LANG: Record<string, string> = {
  global: 'en', poland: 'pl', germany: 'de', france: 'fr', spain: 'es', portugal: 'pt',
};

export function AuditForm() {
  const router = useRouter();
  const [domain, setDomain] = useState('');
  const [businessMode, setBusinessMode] = useState<'saas' | 'local'>('saas');
  const [region, setRegion] = useState('global');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.createAudit({
        domain: domain.trim(),
        businessMode,
        region: region as any,
        language: REGION_LANG[region] as any,
        keywords: keywords ? keywords.split(',').map((k) => k.trim()).filter(Boolean) : undefined,
      }) as { audit: { id: string } };

      router.push(`/audit/${result.audit.id}/processing`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start audit');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Mode Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(['saas', 'local'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setBusinessMode(mode)}
              className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                businessMode === mode
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {mode === 'saas' ? '🖥️ SaaS / Software' : '📍 Local Business'}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-gray-400">
          {businessMode === 'saas'
            ? 'For software products, apps, and online services'
            : 'For restaurants, salons, clinics, shops, and other local services'}
        </p>
      </div>

      {/* Domain */}
      <Input
        label="Website domain"
        type="text"
        placeholder={businessMode === 'local' ? 'pizzeria-roma.pl' : 'yourcompany.com'}
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        hint="Enter your domain without https://"
        required
      />

      {/* Region */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Target market / Language
        </label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-gray-400">
          AI models will be queried in the selected language
        </p>
      </div>

      {/* Keywords */}
      <Input
        label={`Keywords (optional, max 10)`}
        type="text"
        placeholder={
          businessMode === 'local'
            ? 'pizza, delivery, gluten-free'
            : 'payment processing, fintech, API'
        }
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        hint="Comma-separated keywords — unlocks extra prompts on Pro plan"
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}

      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {loading ? 'Starting audit...' : 'Start AI Visibility Audit →'}
      </Button>
    </form>
  );
}
