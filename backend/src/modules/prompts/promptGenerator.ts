import { GeneratedPrompt } from './types';
import { TEMPLATES } from './promptTemplates';
import { ScrapedData } from '../scraper/types';
import { resolveBusinessDescriptor, pluralize } from './businessDescriptorResolver';

// ─── Service description mapping (for {problemDescription}) ──────────────────

const SERVICE_DESC_MAP: Array<[RegExp, string]> = [
  [/web.?design|projektow/i, 'stworzeniem profesjonalnej strony internetowej'],
  [/web.?dev|programow/i, 'wdrożeniem aplikacji webowej'],
  [/seo|pozycjonow/i, 'poprawą widoczności w wyszukiwarkach'],
  [/market/i, 'skutecznym dotarciem do klientów'],
  [/account|księgow/i, 'prowadzeniem księgowości i rozliczeń'],
  [/legal|prawo|prawna/i, 'kwestiami prawnymi firmy'],
  [/clean|sprząt/i, 'utrzymaniem czystości'],
  [/catering/i, 'organizacją cateringu'],
  [/restaurant|jedzeni/i, 'znalezieniem dobrego miejsca na posiłek'],
  [/fitness|trening/i, 'poprawą kondycji i treningiem'],
  [/photo|foto/i, 'profesjonalną sesją zdjęciową'],
  [/transport|logist/i, 'organizacją transportu'],
  [/project.?manag|zarządzanie.?projekt/i, 'zarządzaniem projektami zespołowymi'],
  [/crm/i, 'zarządzaniem relacjami z klientami'],
  [/hr\b|rekrutac/i, 'zarządzaniem zasobami ludzkimi'],
  [/analytic|raportow/i, 'analizą danych i raportowaniem'],
];

function toProblemDescription(service: string): string {
  for (const [pattern, desc] of SERVICE_DESC_MAP) {
    if (pattern.test(service)) return desc;
  }
  return `rozwiązaniem problemu związanego z: ${service}`;
}

// ─── Clause builders ─────────────────────────────────────────────────────────

export function buildLocationClause(
  location: ScrapedData['location'],
  businessType: 'saas' | 'local_business',
): string {
  if (businessType === 'saas') return '';
  const city = location?.city;
  return city ? ` w ${city}` : '';
}

export function buildServiceClause(
  primaryService: string,
  businessType: 'saas' | 'local_business',
): string {
  if (!primaryService) return '';
  const prep = businessType === 'saas' ? 'do' : 'od';
  return ` ${prep} ${primaryService}`;
}

// ─── Resolved variable context ────────────────────────────────────────────────

interface ResolvedVars {
  companyName: string;
  primaryService: string;
  businessDescriptor: string;
  businessDescriptorPlural: string;
  locationClause: string;
  serviceClause: string;
  problemDescription: string;
  services: string[];
}

function resolveVars(
  scraped: ScrapedData,
  userKeywords: string[],
  businessType: 'saas' | 'local_business',
): ResolvedVars {
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

  const businessDescriptor = resolveBusinessDescriptor(scraped, userKeywords, businessType);
  const businessDescriptorPlural = pluralize(businessDescriptor);
  const locationClause = buildLocationClause(scraped.location, businessType);
  const serviceClause = buildServiceClause(primaryService, businessType);
  const problemDescription = toProblemDescription(primaryService);

  return {
    companyName,
    primaryService,
    businessDescriptor,
    businessDescriptorPlural,
    locationClause,
    serviceClause,
    problemDescription,
    services: scraped.services,
  };
}

// ─── Template filler ──────────────────────────────────────────────────────────

function fill(template: string, vars: ResolvedVars): string {
  return template
    .replace(/{companyName}/g, vars.companyName)
    .replace(/{primaryService}/g, vars.primaryService)
    .replace(/{businessDescriptor}/g, vars.businessDescriptor)
    .replace(/{businessDescriptorPlural}/g, vars.businessDescriptorPlural)
    .replace(/{locationClause}/g, vars.locationClause)
    .replace(/{serviceClause}/g, vars.serviceClause)
    .replace(/{problemDescription}/g, vars.problemDescription);
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

// ─── Public API ───────────────────────────────────────────────────────────────

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
  if (userBusinessType === 'local_business' && !scraped.location?.city) {
    warnings.push('Nie znaleziono lokalizacji — prompty pośrednie mogą być mniej precyzyjne.');
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
      else if (v === 'businessDescriptor') usedVars.businessDescriptor = vars.businessDescriptor;
      else if (v === 'businessDescriptorPlural') usedVars.businessDescriptorPlural = vars.businessDescriptorPlural;
      else if (v === 'locationClause') usedVars.locationClause = vars.locationClause;
      else if (v === 'serviceClause') usedVars.serviceClause = vars.serviceClause;
      else if (v === 'problemDescription') usedVars.problemDescription = vars.problemDescription;
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
