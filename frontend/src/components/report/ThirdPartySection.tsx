import { ThirdPartyPresence } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';

interface ThirdPartySectionProps {
  thirdParty?: ThirdPartyPresence[];
}

export function ThirdPartySection({ thirdParty }: ThirdPartySectionProps) {
  if (!thirdParty || thirdParty.length === 0) return null;

  const present = thirdParty.filter((p) => p.present).length;

  return (
    <section id="third-party" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Third-Party Presence</h2>
      <p className="text-sm text-gray-500 mb-4">
        {present}/{thirdParty.length} platforms detected. AI models heavily reference third-party review sites.
      </p>
      <Card>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {thirdParty.map((p) => (
              <a
                key={p.platform}
                href={p.present ? p.url : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                  p.present
                    ? 'border-green-200 bg-green-50 hover:bg-green-100'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.present ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={`text-sm font-medium ${p.present ? 'text-green-800' : 'text-gray-500'}`}>
                  {p.platform}
                </span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
