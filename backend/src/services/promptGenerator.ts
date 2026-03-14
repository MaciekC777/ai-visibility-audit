import OpenAI from 'openai';
import {
  BrandProfile,
  BrandProfileSaaS,
  BrandProfileLocal,
  PromptItem,
  PlanType,
  Language,
  BusinessMode,
} from '../types';
import {
  generateSaaSPrompts,
  generateLocalPrompts,
  PromptGenVars,
} from '../config/promptTemplates';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

function buildSaaSVars(profile: BrandProfileSaaS): PromptGenVars {
  const competitor1 = profile.competitors.direct[0] ?? profile.competitors.indirect[0] ?? 'competitors';
  const competitor2 = profile.competitors.direct[1] ?? profile.competitors.indirect[1] ?? 'alternatives';
  const feature1 = profile.features.core[0] ?? profile.features.differentiators[0] ?? 'automation';
  const plan1 = profile.pricing.plans[0]?.name ?? 'Pro';

  return {
    brand: profile.brand.name,
    category: profile.brand.category,
    year: new Date().getFullYear().toString(),
    feature_1: feature1,
    competitor_1: competitor1,
    competitor_2: competitor2,
    persona: 'startup founder',
    use_case: 'a growing team',
    budget: '50',
    plan_name: plan1,
    specific_feature: feature1,
    market_suffix: '',
    f1: feature1,
    f2: profile.features.core[1] ?? 'reporting',
    f3: profile.features.core[2] ?? 'integrations',
  };
}

function buildLocalVars(profile: BrandProfileLocal): PromptGenVars {
  const competitor1 = profile.competitors.local[0] ?? profile.competitors.chains[0] ?? 'other providers';
  const competitor2 = profile.competitors.local[1] ?? profile.competitors.chains[1] ?? 'alternatives';
  const service1 = profile.services.primary[0] ?? profile.brand.category;
  const service2 = profile.services.primary[1] ?? profile.services.secondary[0] ?? service1;
  const specialty = profile.services.specialties[0] ?? service1;
  // Sample price
  const sampleService = profile.pricing.sample_prices[0]?.item ?? service1;

  const city = profile.location.city || profile.market.service_area || '';

  return {
    brand: profile.brand.name,
    category: profile.brand.category,
    year: new Date().getFullYear().toString(),
    competitor_1: competitor1,
    competitor_2: competitor2,
    use_case: 'everyday needs',
    city,
    service_1: service1,
    service_2: service2,
    sample_service: sampleService,
    district: profile.location.region || city,
    specific_service: specialty,
  };
}

// ─── SaaS prompt translation ───────────────────────────────────────────────────

async function translateSaaSPrompts(
  prompts: PromptItem[],
  language: Language,
  region: string,
  brandName: string
): Promise<PromptItem[]> {
  const LANG_NAMES: Record<Language, string> = {
    en: 'English', de: 'German', fr: 'French', es: 'Spanish', pl: 'Polish', pt: 'Portuguese',
  };
  const REGION_MARKETS: Record<string, string> = {
    germany: 'German', france: 'French', spain: 'Spanish', poland: 'Polish', portugal: 'Portuguese',
  };

  const langName = LANG_NAMES[language] ?? 'English';
  const marketName = REGION_MARKETS[region] ?? langName;

  const systemPrompt = `Translate these prompts to ${langName}.
Adapt for the ${marketName} market — use natural phrasing that a native speaker would use.
Keep brand names and competitor names unchanged (keep: ${brandName}).
Return ONLY a JSON array of translated strings, same order as input.`;

  const userPrompt = JSON.stringify(prompts.map(p => p.text));

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });
    const raw = res.choices[0]?.message?.content ?? '[]';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const translated = JSON.parse(cleaned) as string[];

    return prompts.map((p, i) => ({
      ...p,
      text: translated[i] ?? p.text,
      language,
    }));
  } catch (e) {
    logger.error('Prompt translation failed, using EN', { error: e });
    return prompts;
  }
}

// ─── Main prompt generator ────────────────────────────────────────────────────

export async function generatePrompts(
  profile: BrandProfile,
  plan: PlanType,
  language: Language,
  region: string,
  keywords: string[] = []
): Promise<PromptItem[]> {
  if (profile.mode === 'saas') {
    const vars = buildSaaSVars(profile as BrandProfileSaaS);
    const prompts = generateSaaSPrompts(vars, plan, keywords);

    // Translate if not English
    if (language !== 'en') {
      return translateSaaSPrompts(prompts, language, region, profile.brand.name);
    }
    return prompts;
  } else {
    const vars = buildLocalVars(profile as BrandProfileLocal);
    // Local prompts are native — no translation needed for supported languages
    return generateLocalPrompts(vars, plan, language, keywords);
  }
}
