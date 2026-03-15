import OpenAI from 'openai';
import { BrandKnowledgeMap } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface CompetitorSearchResult {
  competitors: Array<{ name: string }>;
  searchQueries: string[];
}

// ─── Google Custom Search API ─────────────────────────────────────────────────

interface GoogleSearchItem {
  title: string;
  snippet: string;
  link: string;
}

async function searchGoogle(query: string): Promise<GoogleSearchItem[]> {
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
  return data.items ?? [];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function findCompetitorsViaSearch(
  profile: BrandKnowledgeMap,
  language?: string
): Promise<CompetitorSearchResult> {
  const brandName = profile.brand_name;
  const category = profile.category;
  const year = new Date().getFullYear();

  let competitors: string[] = [];
  const searchQueries: string[] = [];

  const ONLINE_TYPES = new Set(['saas', 'ecommerce', 'marketplace']);

  if (ONLINE_TYPES.has(profile.business_type)) {
    // Build queries
    const audience = profile.target_audience[0] ?? 'businesses';
    const queries = [
      `"${brandName} alternatives"`,
      `"best ${category} tools ${year}"`,
      `"${brandName} vs"`,
      `"top ${category} for ${audience}"`,
    ];
    searchQueries.push(...queries);

    // Try Google Search API
    let allSnippets = '';
    let googleWorked = false;

    for (const query of queries) {
      try {
        const items = await searchGoogle(query);
        for (const item of items) {
          allSnippets += `${item.title}. ${item.snippet}\n`;
        }
        googleWorked = true;
        logger.info('Google search done', { query, found: items.length });
      } catch (e) {
        logger.warn('Google search failed', { query, error: e });
      }
    }

    if (googleWorked && allSnippets.length > 0) {
      // Extract names via GPT
      try {
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You extract competitor company names from search results. Return ONLY a valid JSON array of strings. No markdown.',
            },
            {
              role: 'user',
              content: `From these Google search results, extract competitor company names to ${brandName} (${category}). Return ONLY a JSON array of company names. Exclude ${brandName} itself.\n\nSearch results:\n${allSnippets.slice(0, 8000)}`,
            },
          ],
          max_tokens: 500,
          temperature: 0,
          response_format: { type: 'json_object' },
        });
        const raw = res.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : (parsed.competitors ?? parsed.names ?? Object.values(parsed)[0]);
        if (Array.isArray(arr)) {
          competitors = arr.filter(n => typeof n === 'string');
        }
      } catch (e) {
        logger.warn('LLM name extraction from search failed, falling back', { error: e });
      }
    }

    // Fallback to LLM if Google didn't work or returned nothing
    if (competitors.length === 0) {
      try {
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a market research expert. Return ONLY a valid JSON array of strings. No markdown.',
            },
            {
              role: 'user',
              content: `List 8-12 direct competitors to ${brandName}.

Brand context:
- Category: ${category} (${profile.business_type})
- What it does: ${profile.one_liner ?? ''}
- Target audience: ${(profile.target_audience ?? []).slice(0, 3).join(', ') || 'general'}
- Key differentiators: ${(profile.unique_selling_points ?? []).slice(0, 3).join(', ') || 'unknown'}
- Pricing model: ${profile.pricing?.model ?? 'unknown'}

Return companies that serve the same audience and solve the same problem as ${brandName}. Exclude ${brandName} itself. Return ONLY a JSON array of company names.`,
            },
          ],
          max_tokens: 400,
          temperature: 0,
          response_format: { type: 'json_object' },
        });
        const raw = res.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : (parsed.competitors ?? parsed.names ?? Object.values(parsed)[0]);
        if (Array.isArray(arr)) {
          competitors = arr.filter(n => typeof n === 'string');
        }
      } catch (e) {
        logger.error('LLM competitor fallback failed', { error: e });
      }
    }

  } else {
    // Local/agency: use LLM
    const city = profile.location.city ?? '';
    const country = profile.location.country ?? '';
    const locationContext = [city, country].filter(Boolean).join(', ');
    const locationStr = locationContext ? `in ${locationContext}` : '';
    const query = `LLM knowledge of competitors to ${brandName} (${profile.business_type}, ${category}) ${locationStr}`;
    searchQueries.push(query);

    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a local market research expert. Return ONLY a valid JSON array of strings. No markdown.',
          },
          {
            role: 'user',
            content: `List 5-10 direct competitors to ${brandName}.

Business context:
- Category: ${category} (${profile.business_type})
- What it does: ${profile.one_liner ?? ''}
- Location: ${locationStr || 'unspecified'}
- Core offerings: ${(profile.core_offerings ?? []).slice(0, 3).join(', ') || 'unknown'}

A competitor is a named business in the same category${locationStr ? ` serving the same area (${locationStr})` : ''}. Exclude ${brandName} itself. Return ONLY a JSON array of business names.`,
          },
        ],
        max_tokens: 400,
        temperature: 0,
        response_format: { type: 'json_object' },
      });
      const raw = res.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : (parsed.competitors ?? parsed.names ?? Object.values(parsed)[0]);
      if (Array.isArray(arr)) {
        competitors = arr.filter(n => typeof n === 'string');
      }
    } catch (e) {
      logger.error('LLM local competitor search failed', { error: e });
    }
  }

  // Merge with profile competitors
  const allNames = [
    ...competitors,
    ...(profile.competitors_from_website ?? []),
    ...(profile.competitors_likely ?? []),
  ];

  // Deduplicate case-insensitive, exclude brand itself
  const brandLower = brandName.toLowerCase();
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of allNames) {
    if (!name || typeof name !== 'string') continue;
    const key = name.toLowerCase();
    if (key === brandLower) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }

  return {
    competitors: unique.slice(0, 15).map(name => ({ name })),
    searchQueries,
  };
}
