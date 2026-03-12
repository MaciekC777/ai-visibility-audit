'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

export function AuditForm() {
  const router = useRouter();
  const [domain, setDomain] = useState('');
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
        targetKeywords: keywords ? keywords.split(',').map((k) => k.trim()).filter(Boolean) : undefined,
      }) as { audit: { id: string } };

      router.push(`/audit/${result.audit.id}/processing`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start audit');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Website domain"
        type="text"
        placeholder="yourcompany.com"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        hint="Enter your domain without https:// — e.g. stripe.com"
        required
      />

      <Input
        label="Target keywords (optional)"
        type="text"
        placeholder="payment processing, fintech, API"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        hint="Comma-separated keywords that describe your product"
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}

      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {loading ? 'Starting audit...' : 'Start AI Visibility Audit'}
      </Button>
    </form>
  );
}
