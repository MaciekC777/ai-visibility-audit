import { Sidebar } from '@/components/layout/Sidebar';
import { AuditForm } from '@/components/audit/AuditForm';

export default function NewAuditPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 px-8 py-8">
        <div className="max-w-xl">
          <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">New AI Visibility Audit</h1>
          <p className="text-gray-500 text-sm mb-8">
            Enter your domain and we&apos;ll query ChatGPT, Gemini, Claude, and Perplexity to see how they describe your brand.
          </p>

          <div className="bg-white border border-gray-200 rounded-2xl p-8">
            <AuditForm />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { step: '1', label: 'We scrape your site', desc: 'Extract brand profile automatically' },
              { step: '2', label: 'Query all AI models', desc: 'Dozens of prompts, 4 models' },
              { step: '3', label: 'Get your report', desc: 'Scores, insights, recommendations' },
            ].map((item) => (
              <div key={item.step} className="text-center p-4 bg-white border border-gray-100 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center mx-auto mb-2">
                  {item.step}
                </div>
                <div className="text-sm font-medium text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
