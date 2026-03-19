export interface GeneratedPrompt {
  id: string;
  category: 'discovery' | 'services' | 'reputation' | 'competition';
  type: 'direct' | 'indirect';
  promptText: string;
  variables: Record<string, string>;
  expectedInResponse: string[];
}

export interface AuditInitResult {
  scrapingResults: {
    companyName: string | null;
    domain: string;
    detectedBusinessType: 'saas' | 'local_business' | 'unknown';
    userSelectedBusinessType: 'saas' | 'local_business';
    businessTypeMatch: boolean;
    businessTypeSignals: string[];
    location: {
      city: string | null;
      region: string | null;
      country: string | null;
      fullAddress: string | null;
    } | null;
    servicesFound: string[];
    keywordsFromUser: string[];
    pricingPageFound: boolean;
    schemaTypes: string[];
    pagesScraped: string[];
    scrapedAt: string;
    warnings: string[];
  };
  prompts: GeneratedPrompt[];
  auditId: string;
  status: 'ready' | 'missing_data';
  missingDataFlags: string[];
}
