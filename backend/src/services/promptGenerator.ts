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

// Each entry: [keywords that match (lowercase, partial), translations]
const CATEGORY_TRANSLATIONS: Array<[string[], Partial<Record<Language, string>>]> = [
  // ── Local business ─────────────────────────────────────────────────────────
  [['restaurant', 'dining', 'gastro', 'food', 'bistro', 'bar', 'pub', 'cafe', 'kawiarni', 'restaur'],
    { en: 'restaurant', pl: 'restauracja', de: 'Restaurant', fr: 'restaurant', es: 'restaurante', pt: 'restaurante' }],
  [['beauty', 'salon', 'spa', 'nail', 'kosmet'],
    { en: 'beauty salon', pl: 'salon urody', de: 'Schönheitssalon', fr: 'salon de beauté', es: 'salón de belleza', pt: 'salão de beleza' }],
  [['hair', 'barber', 'fryzjer'],
    { en: 'hairdresser', pl: 'fryzjer', de: 'Friseur', fr: 'coiffeur', es: 'peluquería', pt: 'cabeleireiro' }],
  [['fitness', 'gym', 'sport', 'siłowni', 'trening'],
    { en: 'gym', pl: 'siłownia', de: 'Fitnessstudio', fr: 'salle de sport', es: 'gimnasio', pt: 'academia' }],
  [['health', 'clinic', 'medical', 'doctor', 'dental', 'dentist', 'przychodn', 'gabinet'],
    { en: 'medical clinic', pl: 'gabinet', de: 'Arztpraxis', fr: 'cabinet médical', es: 'clínica médica', pt: 'clínica médica' }],
  [['legal', 'law', 'attorney', 'lawyer', 'kancelari'],
    { en: 'law firm', pl: 'kancelaria', de: 'Anwaltskanzlei', fr: 'cabinet juridique', es: 'despacho jurídico', pt: 'escritório jurídico' }],
  [['accounting', 'bookkeeping', 'tax', 'ksiegow', 'rachunkow'],
    { en: 'accounting office', pl: 'biuro rachunkowe', de: 'Steuerbüro', fr: 'cabinet comptable', es: 'asesoría contable', pt: 'escritório contábil' }],
  [['home service', 'cleaning', 'plumb', 'electric', 'repair', 'sprzątani'],
    { en: 'home services', pl: 'usługi domowe', de: 'Haushaltsservice', fr: 'services à domicile', es: 'servicios del hogar', pt: 'serviços domésticos' }],
  [['auto', 'car', 'mechanic', 'vehicle', 'warsztat'],
    { en: 'auto repair shop', pl: 'warsztat samochodowy', de: 'Autowerkstatt', fr: 'garage automobile', es: 'taller de coches', pt: 'oficina automóvel' }],
  [['hotel', 'accommodation', 'hostel', 'motel', 'lodg', 'nocleg'],
    { en: 'hotel', pl: 'hotel', de: 'Hotel', fr: 'hôtel', es: 'hotel', pt: 'hotel' }],
  [['shop', 'store', 'retail', 'sklep'],
    { en: 'shop', pl: 'sklep', de: 'Geschäft', fr: 'boutique', es: 'tienda', pt: 'loja' }],
  [['school', 'education', 'course', 'training', 'szkoła', 'kurs'],
    { en: 'school', pl: 'szkoła', de: 'Schule', fr: 'école', es: 'escuela', pt: 'escola' }],
  [['real estate', 'nieruchomości', 'property'],
    { en: 'real estate agency', pl: 'biuro nieruchomości', de: 'Immobilienbüro', fr: 'agence immobilière', es: 'inmobiliaria', pt: 'imobiliária' }],
  [['construction', 'budowlana', 'builder'],
    { en: 'construction company', pl: 'firma budowlana', de: 'Bauunternehmen', fr: 'entreprise de construction', es: 'constructora', pt: 'construtora' }],
  // ── SaaS / software ────────────────────────────────────────────────────────
  [['crm', 'customer relation'],
    { en: 'CRM tool', pl: 'narzędzie CRM', de: 'CRM-Tool', fr: 'outil CRM', es: 'herramienta CRM', pt: 'ferramenta CRM' }],
  [['project manag', 'task manag', 'zarządzanie projekt'],
    { en: 'project management tool', pl: 'narzędzie do zarządzania projektami', de: 'Projektmanagement-Tool', fr: 'outil de gestion de projet', es: 'herramienta de gestión de proyectos', pt: 'ferramenta de gestão de projetos' }],
  [['hr ', 'human resource', 'recruit'],
    { en: 'HR tool', pl: 'narzędzie HR', de: 'HR-Tool', fr: 'outil RH', es: 'herramienta de RRHH', pt: 'ferramenta de RH' }],
  [['e-commerce', 'ecommerce', 'online store'],
    { en: 'e-commerce platform', pl: 'platforma e-commerce', de: 'E-Commerce-Plattform', fr: 'plateforme e-commerce', es: 'plataforma de e-commerce', pt: 'plataforma de e-commerce' }],
  [['marketing automat'],
    { en: 'marketing automation tool', pl: 'narzędzie do marketing automation', de: 'Marketing-Automation-Tool', fr: 'outil de marketing automation', es: 'herramienta de automatización de marketing', pt: 'ferramenta de automação de marketing' }],
  [['marketing'],
    { en: 'marketing tool', pl: 'narzędzie marketingowe', de: 'Marketing-Tool', fr: 'outil marketing', es: 'herramienta de marketing', pt: 'ferramenta de marketing' }],
  [['analytic', 'reporting', 'dashboard', 'bi '],
    { en: 'analytics tool', pl: 'narzędzie analityczne', de: 'Analyse-Tool', fr: 'outil analytique', es: 'herramienta de análisis', pt: 'ferramenta de análise' }],
  [['accounting software', 'invoic', 'faktur', 'księgow'],
    { en: 'accounting tool', pl: 'narzędzie księgowe', de: 'Buchhaltungssoftware', fr: 'logiciel comptable', es: 'software de contabilidad', pt: 'software de contabilidade' }],
  [['helpdesk', 'help desk', 'customer support', 'ticketing'],
    { en: 'helpdesk platform', pl: 'platforma helpdesk', de: 'Helpdesk-Plattform', fr: 'plateforme helpdesk', es: 'plataforma de soporte', pt: 'plataforma de suporte' }],
  [['design', 'graphic', 'ui ', 'ux '],
    { en: 'design tool', pl: 'narzędzie do projektowania', de: 'Design-Tool', fr: 'outil de conception', es: 'herramienta de diseño', pt: 'ferramenta de design' }],
  [['seo', 'search engine'],
    { en: 'SEO tool', pl: 'narzędzie SEO', de: 'SEO-Tool', fr: 'outil SEO', es: 'herramienta SEO', pt: 'ferramenta SEO' }],
  [['email', 'newsletter'],
    { en: 'email marketing platform', pl: 'platforma email marketingu', de: 'E-Mail-Marketing-Plattform', fr: 'plateforme d\'email marketing', es: 'plataforma de email marketing', pt: 'plataforma de email marketing' }],
  [['security', 'cybersec'],
    { en: 'security tool', pl: 'narzędzie bezpieczeństwa', de: 'Sicherheits-Tool', fr: 'outil de sécurité', es: 'herramienta de seguridad', pt: 'ferramenta de segurança' }],
  [['ai ', 'artificial intel', 'machine learn'],
    { en: 'AI tool', pl: 'narzędzie AI', de: 'KI-Tool', fr: 'outil IA', es: 'herramienta de IA', pt: 'ferramenta de IA' }],
  [['software', 'saas', 'platform', 'app', 'tool', 'application'],
    { en: 'tool', pl: 'narzędzie', de: 'Tool', fr: 'outil', es: 'herramienta', pt: 'ferramenta' }],
  // ── Fallback ──────────────────────────────────────────────────────────────
  [[''],
    { en: 'company', pl: 'firma', de: 'Unternehmen', fr: 'entreprise', es: 'empresa', pt: 'empresa' }],
];

function localizeCategory(rawCategory: string, language: Language): string {
  const needle = rawCategory.toLowerCase();
  for (const [keywords, translations] of CATEGORY_TRANSLATIONS) {
    if (keywords.some(kw => kw && needle.includes(kw))) {
      return translations[language] ?? translations.en ?? rawCategory;
    }
  }
  return rawCategory;
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

interface RawSmartPrompt {
  id: string;
  category: PromptCategory;
  text: string;
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

  // Build a full brand reference: "restauracja Ceska w Krakowie" / "narzędzie CRM Ceska"
  const localizedCategory = localizeCategory(profile.brand.category, language);
  const cityClause = profile.mode !== 'saas' && profile.location?.city
    ? ` w ${profile.location.city}`
    : '';
  const brandRef = `${localizedCategory} ${brandName}${cityClause}`;

  const categoryGuide = `- discovery (3 prompts): user asks about the category or problem WITHOUT mentioning ${brandName} — tests organic visibility. E.g. "best ${profile.brand.category} tools", "top solutions for [problem]", "what software helps with [use case]"
- factual (2 prompts): user asks DIRECTLY about "${brandRef}" — tests factual accuracy. E.g. "what is ${brandRef}", "what does ${brandRef} offer", "who uses ${brandRef}"
- comparative (2 prompts): user compares brands or asks for alternatives — tests competitive positioning. E.g. "${brandRef} vs alternatives", "compare ${brandRef} with competitors", "is there something better than ${brandRef}"
- evaluation (1 prompt): user seeks opinions or reviews — tests reputation. E.g. "is ${brandRef} good", "pros and cons of ${brandRef}", "what do people think of ${brandRef}"
- practical (1 prompt): user asks practical questions — tests knowledge depth. E.g. "${brandRef} pricing", "${brandRef} integrations", "does ${brandRef} work with [tool]"

Rules:
- discovery prompts must NOT mention the brand name — they simulate blind/organic discovery
- factual, comparative, evaluation, practical prompts MUST use the full reference "${brandRef}" (not just "${brandName}")
- NEVER generate prompts asking about opening hours, phone numbers, email, or exact address`;

  const keywordNote = keywords.length > 0
    ? `\nAlso include 1–2 prompts using these keywords: ${keywords.slice(0, 5).join(', ')}`
    : '';

  const systemPrompt = `You are generating search prompts that real users type into AI assistants (ChatGPT, Gemini, Claude) when researching businesses or software.

Rules:
- Write ONLY in ${langName} — every single prompt must be in ${langName}
- Prompts must sound like genuine, natural user queries — conversational, not marketing copy
- Use specific details from the brand context (cuisine type, city, specific features, price ranges, specialties)
- When referring to the brand directly, ALWAYS use the full reference "${brandRef}" — never just "${brandName}" alone
- discovery prompts must NOT mention the brand name at all — they simulate blind discovery
- NEVER generate prompts asking about opening hours, phone numbers, email, or exact address — AI models cannot reliably answer these and they produce no useful visibility signal
- Return ONLY a valid JSON array, no markdown`;

  const userPrompt = `Brand context:
${context}${keywordNote}

Generate exactly ${count} prompts distributed as follows:
- 3 discovery prompts
- 2 factual prompts
- 2 comparative prompts
- 1 evaluation prompt
- 1 practical prompt

${categoryGuide}

Return JSON array:
[{ "category": "discovery", "text": "..." }, ...]

Category values must be exactly one of: discovery, factual, comparative, evaluation, practical`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 1500,
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const raw = res.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);

  // Handle both { prompts: [...] } and [...] response shapes
  const arr: RawSmartPrompt[] = Array.isArray(parsed)
    ? parsed
    : (Array.isArray(parsed.prompts) ? parsed.prompts : Object.values(parsed)[0] as RawSmartPrompt[]);

  if (!Array.isArray(arr)) throw new Error('Unexpected shape from smart prompt generator');

  const counters: Record<string, number> = {};
  return arr
    .filter(p => p.category && p.text)
    .slice(0, count)
    .map(p => {
      const cat = p.category ?? 'prompt';
      counters[cat] = (counters[cat] ?? 0) + 1;
      return {
        id: `${cat}_${counters[cat]}`,
        promptCategory: cat,
        text: p.text.trim(),
        prompt: p.text.trim(),
        language,
      };
    });
}

// ─── Fallback: template-based builders ───────────────────────────────────────

function buildSaaSVars(profile: BrandProfileSaaS, language: Language): PromptGenVars {
  const competitor1 = profile.competitors?.direct?.[0] ?? profile.competitors?.indirect?.[0] ?? '';
  const competitor2 = profile.competitors?.direct?.[1] ?? profile.competitors?.indirect?.[1] ?? '';
  const feature1 = profile.features.core[0] ?? profile.features.differentiators[0] ?? SAAS_FEATURE_FALLBACKS[language].f1;
  const plan1 = profile.pricing.plans[0]?.name ?? 'Pro';
  const featureFallbacks = SAAS_FEATURE_FALLBACKS[language];

  const localizedCatSaaS = localizeCategory(profile.brand.category, language);
  return {
    brand: `${localizedCatSaaS} ${profile.brand.name}`,
    category: localizedCatSaaS,
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

  const localizedCat = localizeCategory(profile.brand.category, language);
  const cityClause = city ? ` w ${city}` : '';
  return {
    brand: `${localizedCat} ${profile.brand.name}${cityClause}`,
    category: localizedCat,
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
