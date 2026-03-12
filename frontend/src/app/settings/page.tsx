import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { Sidebar } from '@/components/layout/Sidebar';
import { BillingSection } from './BillingSection';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 px-8 py-8 max-w-2xl">
        <h1 className="text-2xl font-display font-bold text-gray-900 mb-8">Settings</h1>

        {/* Account section */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Email</span>
              <span className="text-sm font-medium text-gray-900">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">User ID</span>
              <span className="text-xs text-gray-400 font-mono">{user.id.slice(0, 16)}...</span>
            </div>
          </div>
        </section>

        {/* Billing section (client component for Stripe actions) */}
        <BillingSection subscription={subscription} />
      </main>
    </div>
  );
}
