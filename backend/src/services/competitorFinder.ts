import { BrandProfile, BrandProfileLocal, BrandProfileSaaS, Language } from '../types';
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
    const specificType =
      local.brand.subcategories?.[0] ||
      local.services?.primary?.[0] ||
      local.brand.category;
    const locationHint = city || country;

    if (locationHint) {
      return [
        `${p.best} ${specificType} ${locationHint}`,
        `${p.alternativesTo} ${brandName} ${locationHint}`,
      ];
    }
    return [
      `${brandName} ${p.similar} ${p.businesses} ${p.alternatives}`,
      `${p.best} ${specificType} ${p.businesses}`,
    ];
  }

  // SaaS
  const saas = profile as BrandProfileSaaS;
  const specificType = saas.brand.subcategories?.[0] || saas.brand.category;

  return [
    `${brandName} ${p.alternatives} ${new Date().getFullYear()}`,
    `${p.best} ${specificType} ${p.software} ${p.tools}`,
  ];
}

// ─── Name extraction from Google result titles/snippets ───────────────────────

/**
 * Extracts competitor brand names from Google Search result titles and snippets
 * using regex patterns — no AI involved.
 *
 * Patterns targeted:
 *   "A vs B vs C"         → A, B, C
 *   "Top 10 X: A, B, C"  → A, B, C  (after colon, comma-separated capitalized)
 *   "Alternatives to X: A, B, C"
 *   Capitalized multi-word names in "vs" context
 */
function extractNamesFromText(text: string, brandName: string): string[] {
  const brandLower = brandName.toLowerCase();
  const names: Set<string> = new Set();

  // Pattern 1: "X vs Y" — capture both sides
  const vsPattern = /([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)?)\s+vs\.?\s+([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)?)/g;
  for (const m of text.matchAll(vsPattern)) {
    names.add(m[1].trim());
    names.add(m[2].trim());
  }

  // Pattern 2: After colon — "Best CRM tools: Salesforce, HubSpot, Pipedrive"
  const afterColon = /:\s*([A-Z][A-Za-z0-9]*(?:,\s*[A-Z][A-Za-z0-9]*)+)/g;
  for (const m of text.matchAll(afterColon)) {
    for (const part of m[1].split(',')) {
      names.add(part.trim());
    }
  }

  // Pattern 3: "alternatives: A, B, C" or "competitors: A, B"
  const altPattern = /(?:alternatives?|competitors?|options?)[^:]*:\s*([A-Z][A-Za-z0-9]*(?:,\s*[A-Z][A-Za-z0-9]*)+)/gi;
  for (const m of text.matchAll(altPattern)) {
    for (const part of m[1].split(',')) {
      names.add(part.trim());
    }
  }

  // Filter: remove brand itself, short strings, common non-brand words
  const stopWords = new Set([
    'The', 'And', 'For', 'Top', 'Best', 'New', 'Free', 'Pro', 'Plus',
    'Why', 'How', 'What', 'Which', 'Read', 'More', 'Get', 'Try', 'See',
    'Compare', 'Review', 'Reviews', 'Guide', 'List', 'Tools', 'Software',
    'Apps', 'App', 'Platform', 'Service', 'Solution', 'Options',
  ]);

  return [...names].filter(name =>
    name.length > 2 &&
    name.toLowerCase() !== brandLower &&
    !stopWords.has(name) &&
    /^[A-Z]/.test(name)
  );
}

// ─── Google Custom Search API call ───────────────────────────────────────────

interface GoogleSearchItem {
  title: string;
  snippet: string;
  link: string;
}

async function searchGoogle(query: string, brandName: string): Promise<string[]> {
  const apiKey = env.GOOGLE_SEARCH_API_KEY;
  const cseId = env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    throw new Error('GOOGLE_SEARCH_API_KEY or GOOGLE_CSE_ID not configured');
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cseId);
  url.searchParams.set('q', query);
  url.searchParams.set('num', '10');

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Google CSE API error: ${res.status}`);
  }

  const data = (await res.json()) as { items?: GoogleSearchItem[] };
  const items = data.items ?? [];

  const allNames: string[] = [];
  for (const item of items) {
    const text = `${item.title} ${item.snippet}`;
    allNames.push(...extractNamesFromText(text, brandName));
  }

  return allNames;
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
      const names = await searchGoogle(query, brandName);
      allNames.push(...names);
      logger.info('Competitor search query done', { query, found: names.length });
    } catch (e) {
      logger.warn('Competitor search query failed', { query, error: e });
    }
  }

  // Deduplicate (case-insensitive), preserve order, limit to 10
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
