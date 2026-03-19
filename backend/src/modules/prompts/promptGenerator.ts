import { GeneratedPrompt } from './types';
import { TEMPLATES } from './promptTemplates';
import { ScrapedData } from '../scraper/types';

// Hardcoded service → Polish description mapping (TODO: LLM for unknown services)
const SERVICE_DESC_MAP: Array<[RegExp, string]> = [
  [/web.?design|projektow/i, 'projektowaniem stron internetowych'],
  [/web.?dev|programow/i, 'tworzeniem stron internetowych'],
  [/seo|pozycjonow/i, 'pozycjonowaniem w wyszukiwarkach'],
  [/market/i, 'działaniami marketingowymi'],
  [/account|księgow/i, 'prowadzeniem księgowości'],
  [/legal|prawo|prawna/i, 'obsługą prawną'],
  [/clean|sprząt/i, 'sprzątaniem'],
  [/catering/i, 'cateringiem'],
  [/restaurant|restaur/i, 'restauracją'],
  [/fitness|trening/i, 'treningiem personalnym'],
  [/photo|foto/i, 'fotografią'],
  [/transport|logist/i, 'transportem i logistyką'],
];

function toServiceDescription(service: string): string {
  for (const [pattern, desc] of SERVICE_DESC_MAP) {
    if (pattern.test(service)) return desc;
  }
  return `obsługą w zakresie: ${service}`;
}

interface ResolvedVars {
  companyName: string;
  primaryService: string;
  city: string | null;
  serviceDescription: string;
  services: string[];
}

function resolveVars(
  scraped: ScrapedData,
  userKeywords: string[],
  businessType: 'saas' | 'local_business',
): ResolvedVars {
  // 1. User data  2. Scraper data  3. Fallback
  const companyName =
    scraped.companyName ??
    scraped.domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\.[a-z]{2,}$/, '');

  const primaryService =
    userKeywords[0] ??
    scraped.services[0] ??
    (businessType === 'saas' ? 'zarządzania projektami' : 'usług lokalnych');

  const city = scraped.location?.city ?? null;
  const serviceDescription = toServiceDescription(primaryService);

  return { companyName, primaryService, city, serviceDescription, services: scraped.services };
}

function fill(template: string, vars: ResolvedVars): string {
  return template
    .replace(/{companyName}/g, vars.companyName)
    .replace(/{primaryService}/g, vars.primaryService)
    .replace(/{city}/g, vars.city ?? '[miasto]')
    .replace(/{serviceDescription}/g, vars.serviceDescription);
}

function resolveExpected(
  keys: Array<'companyName' | 'services'>,
  vars: ResolvedVars,
): string[] {
  const out: string[] = [];
  for (const key of keys) {
    if (key === 'companyName') out.push(vars.companyName);
    else if (key === 'services') out.push(...vars.services.slice(0, 3));
  }
  return [...new Set(out)].filter(Boolean);
}

export interface GeneratePromptsResult {
  prompts: GeneratedPrompt[];
  warnings: string[];
  missingDataFlags: string[];
}

export function generatePrompts(
  scraped: ScrapedData,
  userKeywords: string[],
  userBusinessType: 'saas' | 'local_business',
): GeneratePromptsResult {
  const warnings: string[] = [];
  const missingDataFlags: string[] = [];

  const vars = resolveVars(scraped, userKeywords, userBusinessType);

  if (!scraped.companyName) {
    warnings.push('Nie udało się wykryć nazwy firmy — użyto domeny jako zastępstwa.');
    missingDataFlags.push('company_name_not_found');
  }
  if (userBusinessType === 'local_business' && !vars.city) {
    warnings.push('Nie znaleziono lokalizacji — prompty pośrednie mogą być mniej precyzyjne (użyto "[miasto]").');
    missingDataFlags.push('location_missing');
  }
  if (scraped.services.length === 0 && userKeywords.length === 0) {
    warnings.push('Brak usług i słów kluczowych — używam wartości domyślnych.');
    missingDataFlags.push('no_services_found');
  }
  if (scraped.detectedBusinessType !== 'unknown' && scraped.detectedBusinessType !== userBusinessType) {
    warnings.push(
      `Wykryty typ biznesu (${scraped.detectedBusinessType}) różni się od wybranego (${userBusinessType}).`,
    );
    missingDataFlags.push('business_type_mismatch');
  }
  if (scraped.schemaTypes.length === 0) {
    warnings.push('Brak znaczników Schema.org — może wpłynąć na widoczność w AI.');
    missingDataFlags.push('no_schema_markup');
  }

  const templates = TEMPLATES[userBusinessType];

  const prompts: GeneratedPrompt[] = templates.map(tpl => {
    const usedVars: Record<string, string> = {};
    for (const v of tpl.expectedVariables) {
      if (v === 'companyName') usedVars.companyName = vars.companyName;
      else if (v === 'primaryService') usedVars.primaryService = vars.primaryService;
      else if (v === 'city') usedVars.city = vars.city ?? '[miasto]';
      else if (v === 'serviceDescription') usedVars.serviceDescription = vars.serviceDescription;
    }

    return {
      id: tpl.id,
      category: tpl.category,
      type: tpl.type,
      promptText: fill(tpl.template, vars),
      variables: usedVars,
      expectedInResponse: resolveExpected(tpl.expectedInResponseKeys, vars),
    };
  });

  return { prompts, warnings, missingDataFlags };
}
