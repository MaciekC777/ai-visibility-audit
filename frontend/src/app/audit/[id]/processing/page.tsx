'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useRealtimeAudit } from '@/hooks/useRealtimeAudit';
import { ProgressBar } from '@/components/audit/ProgressBar';
import { Button } from '@/components/ui/Button';

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { audit, loading } = useRealtimeAudit(id);

  useEffect(() => {
    if (audit?.status === 'completed') {
      router.push(`/audit/${id}`);
    }
  }, [audit?.status, id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  const isFailed = audit?.status === 'failed';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 shadow-sm">
          {isFailed ? (
            <>
              <div className="text-4xl mb-4 text-center">❌</div>
              <h1 className="text-xl font-bold text-gray-900 text-center mb-2">Audit failed</h1>
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 text-center mb-6">
                {audit?.error_message ?? 'An unexpected error occurred.'}
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/audit/new">
                  <Button>Try again</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-full bg-primary-100 animate-pulse-slow" />
                  <svg className="w-8 h-8 text-primary-600 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">Analyzing your brand</h1>
                <p className="text-sm text-gray-500">
                  Querying AI models and analyzing results for{' '}
                  <strong>{audit?.brand_name ?? audit?.domain}</strong>
                </p>
              </div>

              {audit && (
                <ProgressBar status={audit.status} />
              )}

              <p className="text-center text-xs text-gray-400 mt-8">
                This usually takes 1–3 minutes. You can close this tab — we&apos;ll keep processing.
              </p>

              <div className="mt-6 text-center">
                <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
                  ← Back to dashboard
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
