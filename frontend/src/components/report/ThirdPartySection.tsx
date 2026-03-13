import { ThirdPartyPresence } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';

interface ThirdPartySectionProps {
  thirdParty?: ThirdPartyPresence[];
}

export function ThirdPartySection({ thirdParty }: ThirdPartySectionProps) {
  if (!thirdParty || thirdParty.length === 0) return null;

  const presentCount = thirdParty.filter((p) => p.status === 'present').length;

  return (
    <section id="third-party" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Third-Party Presence</h2>
      <p className="text-sm text-gray-500 mb-4">
        {presentCount}/{thirdParty.length} platforms detected. AI models heavily reference third-party review sites.
      </p>
      <Card>
        <CardContent>
          <div className="space-y-3">
            {thirdParty.map((p) => {
              const isPresent = p.status === 'present';
              return (
                <div key={p.platform} className={`flex items-start gap-3 p-3 rounded-lg border ${isPresent ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${isPresent ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isPresent ? 'text-green-800' : 'text-gray-600'}`}>
                        {p.platform}
                      </span>
                      {isPresent && p.url && (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          view →
                        </a>
                      )}
                      {p.rating && (
                        <span className="text-xs text-yellow-600">★ {p.rating}</span>
                      )}
                    </div>
                    {!isPresent && p.recommendation && (
                      <p className="text-xs text-gray-500 mt-0.5">{p.recommendation}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
