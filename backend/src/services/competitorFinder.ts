import OpenAI from 'openai';
import { BrandProfile, BrandProfileLocal } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface CompetitorSearchResult {
  competitors: Array<{ name: string }>;
  searchQueries: string[];
}

function buildSearchQueries(profile: BrandProfile): string[] {
  const brand = profile.brand.name;
  const category = profile.brand.category;

  if (profile.mode === 'local') {
    const city = (profile as BrandProfileLocal).location.city;
    if (city) {
      return [
        `best ${category} in ${city}`,
        `${category} ${city} top rated`,
      ];
    }
    return [
      `best ${category} near me`,
      `top ${category} recommendations`,
    ];
  }

  // SaaS
  return [
    `${brand} competitors`,
    `best ${category} tools alternatives`,
  ];
}

async function searchCompetitorsForQuery(
  query: string,
  brandName: string,
): Promise<string[]> {
  try {
    const res = await (openai as any).responses.create({
      model: 'gpt-4o-mini',
      tools: [{ type: 'web_search_preview' }],
      input: `Search for: "${query}"

Based on the actual search results, list 5–8 business or product names that appear prominently.
Exclude "${brandName}".
Return ONLY a valid JSON array of strings — business names only, no URLs, no descriptions.
Example: ["Name A", "Name B", "Name C"]`,
      max_output_tokens: 300,
    });

    let text = '';
    for (const block of res.output ?? []) {
      if (block.type === 'message' && block.content) {
        for (const c of block.content) {
          if (c.type === 'output_text') text += c.text;
        }
      }
    }
    if (!text && res.output_text) text = res.output_text;

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[])
      .filter((n): n is string => typeof n === 'string' && n.length > 1)
      .filter(n => n.toLowerCase() !== brandName.toLowerCase());
  } catch (e) {
    // Fallback: try chat completions without web search
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `List 5 real business/product competitors for this search query: "${query}". Exclude "${brandName}". Return ONLY a JSON array of name strings.`,
          },
        ],
        max_tokens: 200,
        temperature: 0,
      });
      const raw = res.choices[0]?.message?.content ?? '[]';
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned) as string[];
    } catch {
      logger.warn('Competitor search fallback also failed', { query, error: e });
      return [];
    }
  }
}

export async function findCompetitorsViaSearch(
  profile: BrandProfile,
): Promise<CompetitorSearchResult> {
  const brandName = profile.brand.name;
  const searchQueries = buildSearchQueries(profile);
  const allNames: string[] = [];

  for (const query of searchQueries) {
    const names = await searchCompetitorsForQuery(query, brandName);
    allNames.push(...names);
  }

  // Deduplicate, keep order of first appearance, limit to 10
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
