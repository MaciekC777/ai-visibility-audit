'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Subscription {
  plan: string;
  status: string;
  current_period_end?: string | null;
  audits_used_this_month?: number;
}

interface BillingSectionProps {
  subscription: Subscription | null;
}

export function BillingSection({ subscription }: BillingSectionProps) {
  const [loading, setLoading] = useState(false);
  const plan = subscription?.plan ?? 'free';

  async function handlePortal() {
    setLoading(true);
    try {
      const { url } = await api.openPortal();
      window.location.href = url;
    } catch (e) {
      alert('Failed to open billing portal');
      setLoading(false);
    }
  }

  async function handleUpgrade(targetPlan: string) {
    setLoading(true);
    try {
      const { url } = await api.createCheckout(targetPlan) as { url: string };
      window.location.href = url;
    } catch (e) {
      alert('Failed to start checkout');
      setLoading(false);
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Billing & Plan</h2>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <span className="text-sm text-gray-600">Current plan</span>
          <Badge variant={plan === 'free' ? 'default' : 'info'} className="capitalize">{plan}</Badge>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <span className="text-sm text-gray-600">Status</span>
          <Badge variant={subscription?.status === 'active' ? 'success' : 'warning'}>
            {subscription?.status ?? 'active'}
          </Badge>
        </div>
        {subscription?.current_period_end && (
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-600">Renews</span>
            <span className="text-sm text-gray-900">{formatDate(subscription.current_period_end)}</span>
          </div>
        )}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-600">Audits used this month</span>
          <span className="text-sm font-medium text-gray-900">{subscription?.audits_used_this_month ?? 0}</span>
        </div>
      </div>

      <div className="flex gap-3">
        {plan !== 'free' ? (
          <Button variant="outline" onClick={handlePortal} loading={loading}>
            Manage billing
          </Button>
        ) : (
          <>
            <Button onClick={() => handleUpgrade('starter')} loading={loading} variant="outline">
              Upgrade to Starter
            </Button>
            <Button onClick={() => handleUpgrade('pro')} loading={loading}>
              Upgrade to Pro
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
