import { ParsedSchema } from './schemaParser';

export interface BusinessTypeResult {
  type: 'saas' | 'local_business' | 'unknown';
  signals: string[];
}

const LOCAL_SCHEMA_TYPES = new Set([
  'localbusiness', 'restaurant', 'store', 'foodestablishment',
  'healthandbeauty', 'automotivebusiness', 'realestateagent',
  'legalservice', 'medicalorganization', 'hotel', 'cafe',
  'beautysalon', 'dentist', 'doctor', 'bakery', 'barber',
]);

const SAAS_SCHEMA_TYPES = new Set(['softwareapplication', 'webapplication']);

export function detectBusinessType(
  schema: ParsedSchema,
  pageText: string,
  pricingPageFound: boolean,
  hasPhysicalAddress: boolean,
): BusinessTypeResult {
  const signals: string[] = [];
  let saasScore = 0;
  let localScore = 0;
  const tl = pageText.toLowerCase();

  // Schema signals
  for (const t of schema.types) {
    if (LOCAL_SCHEMA_TYPES.has(t.toLowerCase())) {
      signals.push(`found ${t} schema`);
      localScore += 3;
    }
    if (SAAS_SCHEMA_TYPES.has(t.toLowerCase())) {
      signals.push(`found ${t} schema`);
      saasScore += 3;
    }
  }

  // Local signals
  if (hasPhysicalAddress) {
    signals.push('found physical address');
    localScore += 2;
  }
  if (/opening.?hours|hours.?of.?operation|godziny.?otwarcia|mon[-–]fri|pon[-–]pt/i.test(pageText)) {
    signals.push('found opening hours');
    localScore += 2;
  }
  if (/google.?maps|maps\.google|get.?directions|directions/i.test(tl)) {
    signals.push('found map/directions link');
    localScore += 2;
  }
  if (/tel:|phone:|call us|\+\d{1,3}[\s\-]\d{2,}|\(\d{3}\)\s*\d/i.test(pageText)) {
    signals.push('found phone number');
    localScore += 1;
  }

  // SaaS signals
  if (pricingPageFound) {
    signals.push('found pricing page');
    saasScore += 2;
  }
  if (/sign[\s-]*up|free[\s-]*trial|start[\s-]*for[\s-]*free|get[\s-]*started/i.test(tl)) {
    signals.push('found sign-up / free trial CTA');
    saasScore += 2;
  }
  if (/\bapi\b|developer[s]?|sdk\b|webhook[s]?|integration[s]?/i.test(tl)) {
    signals.push('found API / developer terms');
    saasScore += 2;
  }
  if (/\bsaas\b|software as a service|cloud.?based/i.test(tl)) {
    signals.push('found SaaS terminology');
    saasScore += 1;
  }
  if (/\bdashboard\b|analytics|automation|workflow/i.test(tl)) {
    signals.push('found software product terms');
    saasScore += 1;
  }

  if (saasScore === 0 && localScore === 0) {
    return { type: 'unknown', signals: ['no clear signals found'] };
  }
  if (saasScore > localScore) return { type: 'saas', signals };
  if (localScore > saasScore) return { type: 'local_business', signals };
  return { type: 'unknown', signals: [...signals, 'equal saas and local scores'] };
}
