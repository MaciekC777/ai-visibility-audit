import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Audit } from '@/types';
import { formatRelativeTime, scoreColor, statusLabel } from '@/lib/utils';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: audits } = await supabase
    .from('audits')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, audits_used_this_month')
    .eq('user_id', user.id)
    .single();

  const plan = subscription?.plan ?? 'free';
  const auditsUsed = subscription?.audits_used_this_month ?? (audits?.length ?? 0);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 px-8 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
          </div>
          <Link href="/audit/new">
            <Button>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Audit
            </Button>
          </Link>
        </div>

        {/* Plan banner */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={plan === 'free' ? 'default' : 'info'} className="capitalize text-sm px-3 py-1">
              {plan} plan
            </Badge>
            <span className="text-sm text-gray-500">
              {auditsUsed} audit{auditsUsed !== 1 ? 's' : ''} used this month
            </span>
          </div>
          {plan === 'free' && (
            <Link href="/pricing">
              <Button variant="secondary" size="sm">Upgrade</Button>
            </Link>
          )}
        </div>

        {/* Audits list */}
        {!audits || audits.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No audits yet</h2>
            <p className="text-gray-500 text-sm mb-6">Run your first AI visibility audit to see how AI models describe your brand.</p>
            <Link href="/audit/new">
              <Button>Run your first audit</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {(audits as Audit[]).map((audit) => (
              <Link key={audit.id} href={audit.status === 'completed' ? `/audit/${audit.id}` : `/audit/${audit.id}/processing`}>
                <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-sm transition-all flex items-center gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-gray-900 truncate">{audit.brand_name ?? audit.domain}</span>
                      <span className="text-sm text-gray-400 truncate hidden sm:inline">{audit.domain}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{formatRelativeTime(audit.created_at)}</span>
                      <span>&middot;</span>
                      <StatusBadge status={audit.status} />
                    </div>
                  </div>

                  {audit.status === 'completed' && (
                    <div className="hidden sm:flex items-center gap-6 shrink-0">
                      {[
                        { label: 'Visibility', value: audit.visibility_score },
                        { label: 'Accuracy', value: audit.accuracy_score },
                        { label: 'Perception', value: audit.perception_score },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <div className={`text-xl font-bold ${scoreColor(s.value ?? 0)}`}>{s.value ?? '—'}</div>
                          <div className="text-xs text-gray-400">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'completed' ? 'text-green-600' :
    status === 'failed' ? 'text-red-600' :
    'text-primary-600';
  return <span className={`font-medium ${color}`}>{statusLabel(status)}</span>;
}
