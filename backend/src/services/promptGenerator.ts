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

// ─── Category localization ────────────────────────────────────────────────────

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

// ─── Localized fallbacks ──────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────

function buildSaaSVars(profile: BrandProfileSaaS, language: Language): PromptGenVars {
  const competitor1 = profile.competitors.direct[0] ?? profile.competitors.indirect[0] ?? '';
  const competitor2 = profile.competitors.direct[1] ?? profile.competitors.indirect[1] ?? '';
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

function buildLocalVars(profile: BrandProfileLocal, language: Language): PromptGenVars {
  const competitor1 = profile.competitors.local[0] ?? profile.competitors.chains[0] ?? '';
  const competitor2 = profile.competitors.local[1] ?? profile.competitors.chains[1] ?? '';
  const service1 = profile.services.primary[0] ?? profile.brand.category;
  const service2 = profile.services.primary[1] ?? profile.services.secondary[0] ?? service1;
  const specialty = profile.services.specialties[0] ?? service1;
  const sampleService = profile.pricing.sample_prices[0]?.item ?? service1;
  const city = profile.location.city || profile.market.service_area || '';

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
    const vars = buildSaaSVars(profile as BrandProfileSaaS, language);
    const prompts = generateSaaSPrompts(vars, plan, keywords);

    // Translate if not English
    if (language !== 'en') {
      return translateSaaSPrompts(prompts, language, region, profile.brand.name);
    }
    return prompts;
  } else {
    const vars = buildLocalVars(profile as BrandProfileLocal, language);
    // Local prompts are native — no translation needed for supported languages
    return generateLocalPrompts(vars, plan, language, keywords);
  }
}
