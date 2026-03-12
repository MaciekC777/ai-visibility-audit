import { Sidebar } from '@/components/layout/Sidebar';
import { BillingSection } from './BillingSection';

export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 px-8 py-8 max-w-2xl">
        <h1 className="text-2xl font-display font-bold text-gray-900 mb-8">Settings</h1>
        <BillingSection subscription={null} />
      </main>
    </div>
  );
}
