import OpenAI from 'openai';
import {
  BrandProfileSaaS,
  BrandProfileLocal,
  PromptItem,
  PlanType,
  Language,
  PromptCategory,
} from '../types';
import {
  generateSaaSPrompts,
  generateLocalPrompts,
  PromptGenVars,
} from '../config/promptTemplates';
import { PLAN_LIMITS, LANGUAGE_NAMES } from '../config/constants';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// ─── Category localization (used by fallback path) ────────────────────────────

const CATEGORY_TRANSLATIONS: Record<string, Partial<Record<Language, string>>> = {
  'Restaurant':      { en: 'restaurant',       pl: 'restauracja',          de: 'Restaurant',              fr: 'restaurant',         es: 'restaurante',       pt: 'restaurante' },
  'Beauty & Salon':  { en: 'beauty salon',      pl: 'salon urody',          de: 'Schönheitssalon',         fr: 'salon de beauté',    es: 'salón de belleza',  pt: 'salão de beleza' },
  'Fitness':         { en: 'gym',               pl: 'siłownia',             de: 'Fitnessstudio',           fr: 'salle de sport',     es: 'gimnasio',          pt: 'academia' },
  'Healthcare':      { en: 'medical clinic',    pl: 'przychodnia',          de: 'Arztpraxis',              fr: 'cabinet médical',    es: 'clínica médica',    pt: 'clínica médica' },
  'Legal Services':  { en: 'law firm',          pl: 'kancelaria prawna',    de: 'Anwaltskanzlei',          fr: 'cabinet juridique',  es: 'despacho jurídico', pt: 'escritório jurídico' },
  'Home Services':   { en: 'home services',     pl: 'usługi domowe',        de: 'Haushaltsservice',        fr: 'services à domicile',es: 'servicios del hogar',pt: 'serviços domésticos' },
  'Automotive':      { en: 'auto repair shop',  pl: 'warsztat samochodowy', de: 'Autowerkstatt',           fr: 'garage automobile',  es: 'taller de coches',  pt: 'oficina automóvel' },
  'Accommodation':   { en: 'accommodation',     pl: 'nocleg',               de: 'Unterkunft',              fr: 'hébergement',        es: 'alojamiento',       pt: 'alojamento' },
  'Retail':          { en: 'shop',              pl: 'sklep',                de: 'Geschäft',                fr: 'boutique',           es: 'tienda',            pt: 'loja' },
  'Education':       { en: 'school',            pl: 'szkoła',               de: 'Schule',                  fr: 'école',              es: 'escuela',           pt: 'escola' },
  'Local Business':  { en: 'local business',    pl: 'firma',                de: 'Unternehmen',             fr: 'entreprise',         es: 'empresa',           pt: 'empresa' },
};

function localizeCategory(englishCategory: string, language: Language): string {
  return CATEGORY_TRANSLATIONS[englishCategory]?.[language] ?? englishCategory;
}

const LOCAL_USE_CASE: Record<Language, string> = {
  en: 'everyday needs', pl: 'codziennych potrzeb', de: 'den Alltag',
  fr: 'les besoins quotidiens', es: 'las necesidades diarias', pt: 'as necessidades diárias',
};
const SAAS_PERSONA: Record<Language, string> = {
  en: 'startup founder', pl: 'założyciel startupu', de: 'Startup-Gründer',
  fr: 'fondateur de startup', es: 'fundador de startup', pt: 'fundador de startup',
};
const SAAS_USE_CASE: Record<Language, string> = {
  en: 'a growing team', pl: 'rozwijający się zespół', de: 'ein wachsendes Team',
  fr: 'une équipe en croissance', es: 'un equipo en crecimiento', pt: 'uma equipa em crescimento',
};
const SAAS_FEATURE_FALLBACKS: Record<Language, { f1: string; f2: string; f3: string }> = {
  en: { f1: 'automation',      f2: 'reporting',   f3: 'integrations' },
  pl: { f1: 'automatyzacja',   f2: 'raporty',     f3: 'integracje' },
  de: { f1: 'Automatisierung', f2: 'Berichte',    f3: 'Integrationen' },
  fr: { f1: 'automatisation',  f2: 'rapports',    f3: 'intégrations' },
  es: { f1: 'automatización',  f2: 'informes',    f3: 'integraciones' },
  pt: { f1: 'automatização',   f2: 'relatórios',  f3: 'integrações' },
};

// ─── Brand context builders ───────────────────────────────────────────────────

function buildSaaSContext(profile: BrandProfileSaaS): string {
  const lines: string[] = [
    `Name: ${profile.brand.name}`,
    `Category: ${profile.brand.category}`,
  ];
  if (profile.brand.subcategories?.length) lines.push(`Subcategories: ${profile.brand.subcategories.join(', ')}`);
  if (profile.brand.description) lines.push(`Description: ${profile.brand.description.slice(0, 300)}`);
  if (profile.features.core.length) lines.push(`Core features: ${profile.features.core.slice(0, 5).join(', ')}`);
  if (profile.features.differentiators.length) lines.push(`Differentiators: ${profile.features.differentiators.slice(0, 3).join(', ')}`);
  if (profile.pricing.plans.length) lines.push(`Pricing: ${profile.pricing.plans.slice(0, 2).map(p => `${p.name} $${p.price}/${p.billing_period}`).join(', ')}`);
  if (profile.pricing.free_trial) lines.push('Has free trial: yes');
  const competitors = [...(profile.competitors?.direct ?? []), ...(profile.competitors?.indirect ?? [])].slice(0, 4);
  if (competitors.length) lines.push(`Known competitors: ${competitors.join(', ')}`);
  return lines.join('\n');
}

function buildLocalContext(profile: any): string {
  const lines: string[] = [
    `Name: ${profile.brand.name}`,
    `Category: ${profile.brand.category}`,
  ];
  if (profile.brand.subcategories?.length) lines.push(`Subcategories: ${profile.brand.subcategories.join(', ')}`);
  if (profile.brand.description) lines.push(`Description: ${profile.brand.description.slice(0, 300)}`);
  if (profile.location.city) lines.push(`City: ${profile.location.city}`);
  if (profile.location.region) lines.push(`District/Region: ${profile.location.region}`);
  if (profile.services?.primary?.length) lines.push(`Primary services: ${profile.services.primary.slice(0, 5).join(', ')}`);
  else if (profile.core_offerings?.length) lines.push(`Primary services: ${profile.core_offerings.slice(0, 5).join(', ')}`);
  if (profile.services?.specialties?.length) lines.push(`Specialties: ${profile.services.specialties.slice(0, 4).join(', ')}`);
  if (profile.pricing?.sample_prices?.length) lines.push(`Sample prices: ${profile.pricing.sample_prices.slice(0, 3).map((p: any) => `${p.item} ${p.price}`).join(', ')}`);
  const competitors = [...(profile.competitors?.local ?? []), ...(profile.competitors?.chains ?? [])].slice(0, 3);
  if (competitors.length) lines.push(`Known local competitors: ${competitors.join(', ')}`);
  return lines.join('\n');
}

// ─── Smart LLM-based prompt generation ───────────────────────────────────────

interface GeneratedRawPrompt {
  category: 'discovery' | 'services' | 'opinions' | 'competitors';
  prompt: string;
  persona_context: string;
}

function validateGeneratedPrompts(
  prompts: GeneratedRawPrompt[],
  brandName: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const counts: Record<string, number> = { discovery: 0, services: 0, opinions: 0, competitors: 0 };
  prompts.forEach(p => { if (counts[p.category] !== undefined) counts[p.category]++; });

  for (const [cat, count] of Object.entries(counts)) {
    if (count !== 2) errors.push(`${cat}: expected 2, got ${count}`);
  }

  const brandLower = brandName.toLowerCase();
  prompts.filter(p => p.category === 'discovery').forEach(p => {
    if (p.prompt.toLowerCase().includes(brandLower)) {
      errors.push(`Discovery prompt contains brand name: "${p.prompt.slice(0, 80)}"`);
    }
  });
  prompts.filter(p => ['services', 'opinions', 'competitors'].includes(p.category)).forEach(p => {
    if (!p.prompt.toLowerCase().includes(brandLower)) {
      errors.push(`${p.category} prompt missing brand name: "${p.prompt.slice(0, 80)}"`);
    }
  });

  return { valid: errors.length === 0, errors };
}

async function generateSmartPrompts(
  profile: any,
  count: number,
  language: Language,
  keywords: string[],
): Promise<PromptItem[]> {
  const langName = LANGUAGE_NAMES[language] ?? 'English';
  const brandName = profile.brand.name;

  const context = profile.mode === 'saas'
    ? buildSaaSContext(profile as BrandProfileSaaS)
    : buildLocalContext(profile as BrandProfileLocal);

  const isLocal = profile.mode === 'local' || profile.mode === 'local_business';
  const locationNote = isLocal && profile.location?.city
    ? `Location: ${profile.location.city}${profile.location.region ? ', ' + profile.location.region : ''}`
    : '';

  const systemPrompt = `You are generating realistic user prompts that people would type into ChatGPT/Claude/Gemini.
Write ONLY in ${langName}. Return ONLY valid JSON array, no markdown.`;

  const userPrompt = `Brand profile:
${context}
${locationNote}
Language: ${langName}

Generate exactly 8 prompts — 2 per category. Write them as a real person would type them.

## CATEGORIES:

### DISCOVERY (2 prompts) — NON-BRANDED
The user describes a problem or need WITHOUT mentioning the brand name.
Goal: test if AI mentions the brand organically.
- MUST NOT contain "${brandName}" anywhere
- Should describe a situation/problem the brand solves
- Vary: one broader, one more specific with context

### SERVICES (2 prompts) — BRANDED
The user asks directly about what the brand offers/does.
Goal: test what AI says about the brand's products/services/features.
- MUST contain "${brandName}"
- Ask about offerings, capabilities, what's available
- Vary: one general ("what does X offer"), one specific ("does X have [specific thing]")

### OPINIONS (2 prompts) — BRANDED
The user asks about reputation, reviews, quality.
Goal: test AI's sentiment and perception of the brand.
- MUST contain "${brandName}"
- Ask about opinions, reviews, whether it's worth it, pros/cons
- Vary: one direct ("is X good"), one asking for others' opinions

### COMPETITORS (2 prompts) — BRANDED
The user asks about alternatives to the brand.
Goal: get a clean list of real competitors from AI.
- MUST contain "${brandName}"
- Ask "what else besides X", "alternatives to X", "similar to X"
${isLocal ? '- Include location naturally when asking about alternatives' : ''}
- Vary: one asking for alternatives, one asking for comparison/what else exists

## CRITICAL RULES:
- Write as a real person — with context, not as SEO keywords
- Start with situation when natural ("I've been...", "My team...", "I'm looking for...")
- Vary length: some 1 sentence, some 2-3 sentences
- Match the language and cultural context of ${langName}
- NEVER sound like a marketing survey

Return JSON array ONLY:
[
  {
    "category": "discovery" | "services" | "opinions" | "competitors",
    "prompt": "the actual prompt text",
    "persona_context": "brief note: who is asking and why"
  }
]`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 1500,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const raw = res.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);
  const arr: GeneratedRawPrompt[] = Array.isArray(parsed)
    ? parsed
    : (Array.isArray(parsed.prompts) ? parsed.prompts : Object.values(parsed)[0] as GeneratedRawPrompt[]);

  if (!Array.isArray(arr)) throw new Error('Unexpected shape from smart prompt generator');

  const validation = validateGeneratedPrompts(arr, brandName);
  if (!validation.valid) {
    logger.warn('Prompt validation issues', { errors: validation.errors });
  }

  return arr
    .filter(p => p.category && p.prompt)
    .slice(0, 8)
    .map((p, i) => ({
      id: `${p.category.toUpperCase()[0]}${Math.floor(i / 2) + 1}`,
      promptCategory: p.category,
      text: p.prompt.trim(),
      prompt: p.prompt.trim(),
      persona: p.persona_context,
      language,
    }));
}

// ─── Fallback: template-based builders ───────────────────────────────────────

function buildSaaSVars(profile: BrandProfileSaaS, language: Language): PromptGenVars {
  const competitor1 = profile.competitors?.direct?.[0] ?? profile.competitors?.indirect?.[0] ?? '';
  const competitor2 = profile.competitors?.direct?.[1] ?? profile.competitors?.indirect?.[1] ?? '';
  const feature1 = profile.features.core[0] ?? profile.features.differentiators[0] ?? SAAS_FEATURE_FALLBACKS[language].f1;
  const plan1 = profile.pricing.plans[0]?.name ?? 'Pro';
  const featureFallbacks = SAAS_FEATURE_FALLBACKS[language];

  return {
    brand: profile.brand.name,
    category: profile.brand.category,
    year: new Date().getFullYear().toString(),
    feature_1: feature1,
    competitor_1: competitor1,
    competitor_2: competitor2,
    persona: SAAS_PERSONA[language],
    use_case: SAAS_USE_CASE[language],
    budget: '50',
    plan_name: plan1,
    specific_feature: feature1,
    market_suffix: '',
    f1: feature1,
    f2: profile.features.core[1] ?? featureFallbacks.f2,
    f3: profile.features.core[2] ?? featureFallbacks.f3,
  };
}

function buildLocalVars(profile: any, language: Language): PromptGenVars {
  const competitor1 = profile.competitors?.local?.[0] ?? profile.competitors?.chains?.[0] ?? '';
  const competitor2 = profile.competitors?.local?.[1] ?? profile.competitors?.chains?.[1] ?? '';
  const service1 = profile.services?.primary?.[0] ?? profile.core_offerings?.[0] ?? profile.brand?.category ?? '';
  const service2 = profile.services?.primary?.[1] ?? profile.services?.secondary?.[0] ?? profile.core_offerings?.[1] ?? service1;
  const specialty = profile.services?.specialties?.[0] ?? profile.signature_items?.[0] ?? service1;
  const sampleService = profile.pricing?.sample_prices?.[0]?.item ?? service1;
  const city = profile.location.city || profile.market?.service_area || '';

  return {
    brand: profile.brand.name,
    category: localizeCategory(profile.brand.category, language),
    year: new Date().getFullYear().toString(),
    competitor_1: competitor1,
    competitor_2: competitor2,
    use_case: LOCAL_USE_CASE[language],
    city,
    service_1: service1,
    service_2: service2,
    sample_service: sampleService,
    district: profile.location.region || city,
    specific_service: specialty,
  };
}

// ─── Main prompt generator ────────────────────────────────────────────────────

export async function generatePrompts(
  profile: any,
  plan: PlanType,
  language: Language,
  region: string,
  keywords: string[] = [],
  seedCompetitors: string[] = []
): Promise<PromptItem[]> {
  const count = PLAN_LIMITS[plan].promptsPerAudit;

  // Primary: smart LLM-based generation
  try {
    const prompts = await generateSmartPrompts(profile, count, language, keywords);
    if (prompts.length >= Math.floor(count * 0.7)) {
      logger.info('Smart prompts generated', { count: prompts.length, plan, language });
      return prompts;
    }
    logger.warn('Smart prompt generation returned too few — falling back to templates', { got: prompts.length, expected: count });
  } catch (e) {
    logger.error('Smart prompt generation failed — falling back to templates', { error: e });
  }

  // Fallback: template-based
  if (profile.mode === 'saas') {
    const vars = buildSaaSVars(profile as BrandProfileSaaS, language);
    const prompts = generateSaaSPrompts(vars, plan, keywords);
    if (language !== 'en') {
      return translateSaaSPrompts(prompts, language, region, profile.brand.name);
    }
    return prompts;
  } else {
    const vars = buildLocalVars(profile as BrandProfileLocal, language);
    return generateLocalPrompts(vars, plan, language, keywords);
  }
}

// ─── SaaS translation (fallback path only) ───────────────────────────────────

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

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(prompts.map(p => p.text)) },
      ],
      max_tokens: 2000,
      temperature: 0,
    });
    const raw = res.choices[0]?.message?.content ?? '[]';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const translated = JSON.parse(cleaned) as string[];
    return prompts.map((p, i) => ({ ...p, text: translated[i] ?? p.text, language }));
  } catch (e) {
    logger.error('Prompt translation failed, using EN', { error: e });
    return prompts;
  }
}
