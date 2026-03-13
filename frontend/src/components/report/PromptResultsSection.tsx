'use client';

import { useState } from 'react';
import { ModelResponse } from '@/types';
import { Badge } from '@/components/ui/Badge';

interface PromptResultsSectionProps {
  promptResults?: ModelResponse[];
  brandName?: string;
}

const MODEL_COLORS: Record<string, string> = {
  openai: 'success',
  anthropic: 'info',
  gemini: 'warning',
  perplexity: 'purple',
};

export function PromptResultsSection({ promptResults, brandName }: PromptResultsSectionProps) {
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const models = [...new Set(promptResults?.map((r) => r.model) ?? [])];
  const filtered = selectedModel === 'all'
    ? (promptResults ?? [])
    : promptResults?.filter((r) => r.model === selectedModel) ?? [];

  // Group by promptId
  const byPrompt = filtered.reduce<Record<string, ModelResponse[]>>((acc, r) => {
    acc[r.promptId] = [...(acc[r.promptId] ?? []), r];
    return acc;
  }, {});

  function highlight(text: string) {
    if (!brandName) return text;
    const regex = new RegExp(`(${brandName})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-100 text-yellow-900 rounded px-0.5">$1</mark>');
  }

  return (
    <section id="prompt-results" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Prompt Results</h2>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedModel('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedModel === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All models
        </button>
        {models.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedModel(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${selectedModel === m ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {Object.entries(byPrompt).slice(0, 10).map(([promptId, responses]) => (
          <div key={promptId} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="text-xs text-gray-400 mb-0.5">Prompt [{promptId}]</div>
              <div className="text-sm font-medium text-gray-700">
                &ldquo;{responses[0]?.promptText || promptId}&rdquo;
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {responses.map((r) => (
                <div key={r.model} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={(MODEL_COLORS[r.model] ?? 'default') as any} className="capitalize">
                      {r.model}
                    </Badge>
                    <span className="text-xs text-gray-400">{r.latency_ms}ms</span>
                    {r.search_enabled && <span className="text-xs text-blue-400">🔍 web search</span>}
                    {r.error && <span className="text-xs text-red-500">Error</span>}
                  </div>
                  {r.response ? (
                    <p
                      className="text-sm text-gray-700 leading-relaxed line-clamp-4"
                      dangerouslySetInnerHTML={{ __html: highlight(r.response) }}
                    />
                  ) : (
                    <p className="text-sm text-gray-400 italic">No response</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
