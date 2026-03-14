import { BrandProfile, BrandProfileLocal, BrandProfileSaaS, Language } from '../types';
import { MODEL_NAMES } from '../config/constants';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ─── Localized query fragments ────────────────────────────────────────────────

const PHRASES: Record<Language, {
  best: string; topRated: string; alternativesTo: string;
  alternatives: string; similar: string; businesses: string; software: string; tools: string;
}> = {
  en: { best: 'best', topRated: 'top rated', alternativesTo: 'alternatives to', alternatives: 'alternatives', similar: 'similar', businesses: 'businesses', software: 'software', tools: 'tools' },
  pl: { best: 'najlepsza', topRated: 'najlepiej oceniana', alternativesTo: 'alternatywy dla', alternatives: 'alternatywy', similar: 'podobne', businesses: 'firmy', software: 'oprogramowanie', tools: 'narzędzia' },
  de: { best: 'bestes', topRated: 'bestbewertet', alternativesTo: 'Alternativen zu', alternatives: 'Alternativen', similar: 'ähnliche', businesses: 'Unternehmen', software: 'Software', tools: 'Tools' },
  fr: { best: 'meilleur', topRated: 'mieux noté', alternativesTo: 'alternatives à', alternatives: 'alternatives', similar: 'similaires', businesses: 'entreprises', software: 'logiciel', tools: 'outils' },
  es: { best: 'mejor', topRated: 'mejor valorado', alternativesTo: 'alternativas a', alternatives: 'alternativas', similar: 'similares', businesses: 'negocios', software: 'software', tools: 'herramientas' },
  pt: { best: 'melhor', topRated: 'mais bem avaliado', alternativesTo: 'alternativas a', alternatives: 'alternativas', similar: 'similares', businesses: 'negócios', software: 'software', tools: 'ferramentas' },
};

export interface CompetitorSearchResult {
  competitors: Array<{ name: string }>;
  searchQueries: string[];
}

// ─── Query builder ────────────────────────────────────────────────────────────

function buildSearchQueries(profile: BrandProfile, language: Language): string[] {
  const brandName = profile.brand.name;
  const p = PHRASES[language] ?? PHRASES.en;

  if (profile.mode === 'local') {
    const local = profile as BrandProfileLocal;
    const city = local.location.city || local.location.region || '';
    const country = local.location.country || '';

    // Use subcategory or first primary service — more specific than generic category
    const specificType =
      local.brand.subcategories?.[0] ||
      local.services?.primary?.[0] ||
      local.brand.category;

    const locationHint = city || country;

    if (locationHint) {
      return [
        `${p.best} ${specificType} ${locationHint}`,
        `${p.topRated} ${specificType} ${locationHint} ${p.alternativesTo} ${brandName}`,
      ];
    }

    // No location — brand-centric queries
    return [
      `${brandName} ${p.similar} ${p.businesses} ${p.alternatives}`,
      `${p.best} ${specificType} ${p.businesses}`,
    ];
  }

  // SaaS
  const saas = profile as BrandProfileSaaS;
  const specificType =
    saas.brand.subcategories?.[0] ||
    saas.brand.category;

  return [
    `${brandName} ${p.alternatives} ${new Date().getFullYear()}`,
    `${p.best} ${specificType} ${p.software} ${p.tools}`,
  ];
}

// ─── Perplexity search (web search always included) ───────────────────────────

async function searchWithPerplexity(query: string, brandName: string): Promise<string[]> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_NAMES.perplexity,
      messages: [
        {
          role: 'system',
          content:
            'You are a research assistant. Extract competitor/alternative business or product names from web search results. Return ONLY a valid JSON array of name strings — no URLs, no descriptions, no markdown.',
        },
        {
          role: 'user',
          content: `Search query: "${query}"

Based on actual search results, list the 6–8 most prominent competing businesses or products.
Exclude "${brandName}" from the list.
Return ONLY a JSON array: ["Name A", "Name B", "Name C"]`,
        },
      ],
      max_tokens: 300,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    throw new Error(`Perplexity API error: ${res.status}`);
  }

  const data = (await res.json()) as any;
  const text: string = data.choices?.[0]?.message?.content ?? '[]';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) return [];

  return (parsed as unknown[])
    .filter((n): n is string => typeof n === 'string' && n.trim().length > 1)
    .filter(n => n.toLowerCase() !== brandName.toLowerCase())
    .map(n => n.trim());
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function findCompetitorsViaSearch(
  profile: BrandProfile,
  language: Language = 'en',
): Promise<CompetitorSearchResult> {
  const brandName = profile.brand.name;
  const searchQueries = buildSearchQueries(profile, language);
  const allNames: string[] = [];

  for (const query of searchQueries) {
    try {
      const names = await searchWithPerplexity(query, brandName);
      allNames.push(...names);
      logger.info('Competitor search query done', { query, found: names.length });
    } catch (e) {
      logger.warn('Competitor search query failed', { query, error: e });
    }
  }

  // Deduplicate, preserve first-appearance order, limit to 10
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of allNames) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(name);
    }
  }

  return {
    competitors: unique.slice(0, 10).map(name => ({ name })),
    searchQueries,
  };
}
