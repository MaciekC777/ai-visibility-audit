import { ScrapedData } from '../scraper/types';

// ─── Schema.org type → Polish descriptor ─────────────────────────────────────

const SCHEMA_TO_DESCRIPTOR: Array<[string, string]> = [
  ['restaurant', 'restauracja'],
  ['foodestablishment', 'restauracja'],
  ['cafe', 'kawiarnia'],
  ['bakery', 'piekarnia'],
  ['barber', 'fryzjer'],
  ['beautysalon', 'salon beauty'],
  ['hairsalon', 'salon fryzjerski'],
  ['autorepair', 'warsztat samochodowy'],
  ['automotivebusiness', 'firma motoryzacyjna'],
  ['dentist', 'gabinet stomatologiczny'],
  ['physician', 'gabinet lekarski'],
  ['medicalbusiness', 'gabinet'],
  ['optician', 'optyk'],
  ['veterinarycare', 'weterynarz'],
  ['legalservice', 'kancelaria'],
  ['accountingservice', 'biuro rachunkowe'],
  ['financialservice', 'firma finansowa'],
  ['insurance', 'ubezpieczalnia'],
  ['realestateagent', 'biuro nieruchomości'],
  ['store', 'sklep'],
  ['clothingstore', 'sklep odzieżowy'],
  ['electronicsstore', 'sklep elektroniczny'],
  ['florist', 'kwiaciarnia'],
  ['gym', 'siłownia'],
  ['sportactivitylocation', 'centrum sportu'],
  ['hotel', 'hotel'],
  ['lodgingbusiness', 'hotel'],
  ['travelagency', 'biuro podróży'],
  ['educationalorganization', 'szkoła'],
  ['school', 'szkoła'],
  ['softwaredevelopment', 'firma IT'],
  ['softwareapplication', 'narzędzie'],
  ['webapplication', 'aplikacja webowa'],
  ['mobileapplication', 'aplikacja mobilna'],
  ['cleaningservice', 'firma sprzątająca'],
  ['photographystudio', 'studio fotograficzne'],
  ['eventplanner', 'agencja eventowa'],
  ['printingservice', 'drukarnia'],
  ['constructioncompany', 'firma budowlana'],
  ['plumber', 'hydraulik'],
  ['electrician', 'elektryk'],
  ['localbusiness', 'firma'],
  ['organization', 'firma'],
];

// ─── Keywords → SaaS descriptor enrichment ───────────────────────────────────

const KEYWORD_TO_SAAS_DESCRIPTOR: Array<[RegExp, string]> = [
  [/\bcrm\b/i, 'narzędzie CRM'],
  [/project.?manag|zarządzanie.?projekt/i, 'narzędzie do zarządzania projektami'],
  [/task.?manag|zadania/i, 'narzędzie do zarządzania zadaniami'],
  [/hr\b|human.?resourc|rekrutac/i, 'narzędzie HR'],
  [/e.?commerce|sklep.?internet/i, 'platforma e-commerce'],
  [/marketing.?automat/i, 'narzędzie do marketing automation'],
  [/\bmarketing\b/i, 'narzędzie marketingowe'],
  [/analytic|raportow/i, 'narzędzie analityczne'],
  [/accounting|faktur|księgow/i, 'narzędzie księgowe'],
  [/invoic|faktur/i, 'narzędzie do fakturowania'],
  [/communic|komunikac/i, 'narzędzie komunikacyjne'],
  [/help.?desk|support|obsługa.?klienta/i, 'platforma helpdesk'],
  [/design|grafik/i, 'narzędzie do projektowania'],
  [/seo|pozycjonow/i, 'narzędzie SEO'],
  [/email|newsletter/i, 'platforma email marketingu'],
  [/data.?base|baz.?danych/i, 'narzędzie bazodanowe'],
  [/security|bezpieczeń/i, 'narzędzie bezpieczeństwa'],
  [/ai\b|artificial.?intel|sztuczna.?intel/i, 'narzędzie AI'],
  [/survey|ankiet/i, 'narzędzie do ankiet'],
  [/payment|płatnoś/i, 'platforma płatności'],
];

// ─── Plural forms ─────────────────────────────────────────────────────────────

const PLURAL_MAP: Record<string, string> = {
  restauracja: 'restauracji',
  kawiarnia: 'kawiarni',
  piekarnia: 'piekarni',
  fryzjer: 'fryzjerów',
  'salon beauty': 'salonów beauty',
  'salon fryzjerski': 'salonów fryzjerskich',
  'warsztat samochodowy': 'warsztatów samochodowych',
  'firma motoryzacyjna': 'firm motoryzacyjnych',
  'gabinet stomatologiczny': 'gabinetów stomatologicznych',
  'gabinet lekarski': 'gabinetów lekarskich',
  gabinet: 'gabinetów',
  optyk: 'optyków',
  weterynarz: 'weterynarzy',
  kancelaria: 'kancelarii',
  'biuro rachunkowe': 'biur rachunkowych',
  'firma finansowa': 'firm finansowych',
  ubezpieczalnia: 'ubezpieczalni',
  'biuro nieruchomości': 'biur nieruchomości',
  sklep: 'sklepów',
  'sklep odzieżowy': 'sklepów odzieżowych',
  'sklep elektroniczny': 'sklepów elektronicznych',
  kwiaciarnia: 'kwiaciarni',
  siłownia: 'siłowni',
  'centrum sportu': 'centrów sportu',
  hotel: 'hoteli',
  'biuro podróży': 'biur podróży',
  szkoła: 'szkół',
  'firma IT': 'firm IT',
  narzędzie: 'narzędzi',
  'narzędzie CRM': 'narzędzi CRM',
  'narzędzie do zarządzania projektami': 'narzędzi do zarządzania projektami',
  'narzędzie do zarządzania zadaniami': 'narzędzi do zarządzania zadaniami',
  'narzędzie HR': 'narzędzi HR',
  'platforma e-commerce': 'platform e-commerce',
  'narzędzie do marketing automation': 'narzędzi do marketing automation',
  'narzędzie marketingowe': 'narzędzi marketingowych',
  'narzędzie analityczne': 'narzędzi analitycznych',
  'narzędzie księgowe': 'narzędzi księgowych',
  'narzędzie do fakturowania': 'narzędzi do fakturowania',
  'narzędzie komunikacyjne': 'narzędzi komunikacyjnych',
  'platforma helpdesk': 'platform helpdesk',
  'narzędzie do projektowania': 'narzędzi do projektowania',
  'narzędzie SEO': 'narzędzi SEO',
  'platforma email marketingu': 'platform email marketingu',
  'narzędzie bazodanowe': 'narzędzi bazodanowych',
  'narzędzie bezpieczeństwa': 'narzędzi bezpieczeństwa',
  'narzędzie AI': 'narzędzi AI',
  'narzędzie do ankiet': 'narzędzi do ankiet',
  'platforma płatności': 'platform płatności',
  'aplikacja webowa': 'aplikacji webowych',
  'aplikacja mobilna': 'aplikacji mobilnych',
  'firma sprzątająca': 'firm sprzątających',
  'studio fotograficzne': 'studiów fotograficznych',
  'agencja eventowa': 'agencji eventowych',
  drukarnia: 'drukarni',
  'firma budowlana': 'firm budowlanych',
  hydraulik: 'hydraulików',
  elektryk: 'elektryków',
  firma: 'firm',
  platforma: 'platform',
};

export function pluralize(descriptor: string): string {
  return PLURAL_MAP[descriptor] ?? `${descriptor} (wielu)`;
}

// ─── Main resolver ────────────────────────────────────────────────────────────

export function resolveBusinessDescriptor(
  scraped: Pick<ScrapedData, 'schemaTypes'>,
  userKeywords: string[],
  businessType: 'saas' | 'local_business',
): string {
  // 1. Schema.org type — highest priority
  for (const schemaType of scraped.schemaTypes) {
    const matched = SCHEMA_TO_DESCRIPTOR.find(
      ([key]) => key === schemaType.toLowerCase(),
    );
    if (matched) {
      const descriptor = matched[1];
      // For SaaS schema types, still try keyword enrichment
      if (businessType === 'saas' && (schemaType.toLowerCase() === 'softwareapplication' || schemaType.toLowerCase() === 'webapplication')) {
        const enriched = enrichSaasDescriptor(userKeywords);
        return enriched ?? descriptor;
      }
      return descriptor;
    }
  }

  // 2. Keywords
  if (businessType === 'saas') {
    const enriched = enrichSaasDescriptor(userKeywords);
    if (enriched) return enriched;
  } else {
    // Local business: look for Polish type keywords
    const allKeywords = userKeywords.join(' ');
    const localMatch = SCHEMA_TO_DESCRIPTOR.find(([_key, label]) => {
      return new RegExp(`\\b${label}\\b`, 'i').test(allKeywords);
    });
    if (localMatch) return localMatch[1];
  }

  // 3. Fallback
  return businessType === 'saas' ? 'narzędzie' : 'firma';
}

function enrichSaasDescriptor(keywords: string[]): string | null {
  const combined = keywords.join(' ');
  for (const [pattern, descriptor] of KEYWORD_TO_SAAS_DESCRIPTOR) {
    if (pattern.test(combined)) return descriptor;
  }
  return null;
}
