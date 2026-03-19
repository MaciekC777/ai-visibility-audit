'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ModelResponse } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { getT } from '@/lib/reportTranslations';

interface PromptResultsSectionProps {
  promptResults?: ModelResponse[];
  brandName?: string;
  language?: string;
}

const MODEL_COLORS: Record<string, string> = {
  openai: 'success',
  anthropic: 'info',
  gemini: 'warning',
  perplexity: 'purple',
};

/** Wrap brand name occurrences in <mark> — works on plain-text nodes only */
function highlightBrand(text: string, brandName?: string): string {
  if (!brandName) return text;
  const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="bg-yellow-100 text-yellow-900 rounded px-0.5">$1</mark>',
  );
}

function MarkdownResponse({ text, brandName }: { text: string; brandName?: string }) {
  return (
    <ReactMarkdown
      components={{
        // Paragraphs
        p: ({ children }) => <p className="mb-3 last:mb-0 text-sm text-gray-700 leading-relaxed">{children}</p>,
        // Headings
        h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 mt-4 mb-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold text-gray-900 mt-4 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-800 mt-3 mb-1">{children}</h3>,
        // Lists
        ul: ({ children }) => <ul className="list-disc list-outside pl-5 mb-3 space-y-0.5 text-sm text-gray-700">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside pl-5 mb-3 space-y-0.5 text-sm text-gray-700">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        // Inline
        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        // Code
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto my-3">
                <code className="text-xs font-mono text-gray-800">{children}</code>
              </pre>
            );
          }
          return <code className="bg-gray-100 text-gray-800 text-xs font-mono px-1.5 py-0.5 rounded">{children}</code>;
        },
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-gray-300 pl-3 my-2 text-gray-500 italic">{children}</blockquote>
        ),
        // Horizontal rule
        hr: () => <hr className="my-4 border-gray-200" />,
        // Links — render as plain text, don't create clickable links in reports
        a: ({ children }) => <span className="text-blue-600 underline">{children}</span>,
        // Text node: inject brand highlight
        text: ({ children }: any) => {
          if (!brandName || typeof children !== 'string') return children;
          const highlighted = highlightBrand(children, brandName);
          if (highlighted === children) return <>{children}</>;
          return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

const COLLAPSE_LINES = 8;

function ResponseRow({ r, brandName, t }: { r: ModelResponse; brandName?: string; t: ReturnType<typeof getT> }) {
  const [expanded, setExpanded] = useState(false);
  const lineCount = r.response ? r.response.split('\n').length : 0;
  const isLong = r.response && (r.response.length > 600 || lineCount > COLLAPSE_LINES);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant={(MODEL_COLORS[r.model] ?? 'default') as any} className="capitalize">
          {r.model}
        </Badge>
        {r.latency_ms > 0 && <span className="text-xs text-gray-400">{r.latency_ms}ms</span>}
        {r.search_enabled && <span className="text-xs text-blue-400">🔍 web search</span>}
        {r.error && <span className="text-xs text-red-500">error</span>}
      </div>

      {r.response ? (
        <div>
          <div className={`text-sm ${isLong && !expanded ? 'max-h-52 overflow-hidden relative' : ''}`}>
            {isLong && !expanded && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            )}
            <MarkdownResponse text={r.response} brandName={brandName} />
          </div>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              {expanded ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  {t.showLess}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {t.showFullResponse}
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">{t.noResponse}</p>
      )}
    </div>
  );
}

export function PromptResultsSection({ promptResults, brandName, language }: PromptResultsSectionProps) {
  const t = getT(language);
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const models = [...new Set(promptResults?.map((r) => r.model) ?? [])];
  const filtered = selectedModel === 'all'
    ? (promptResults ?? [])
    : promptResults?.filter((r) => r.model === selectedModel) ?? [];

  const byPrompt = filtered.reduce<Record<string, ModelResponse[]>>((acc, r) => {
    acc[r.promptId] = [...(acc[r.promptId] ?? []), r];
    return acc;
  }, {});

  return (
    <section id="prompt-results" className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">{t.promptResults}</h2>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedModel('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedModel === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {t.allModels}
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
                <ResponseRow key={r.model} r={r} brandName={brandName} t={t} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
