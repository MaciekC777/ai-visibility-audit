export interface ScrapedData {
  // Basic
  companyName: string | null;
  domain: string;
  language: string | null;

  // Auto-detected business type
  detectedBusinessType: 'saas' | 'local_business' | 'unknown';
  businessTypeSignals: string[];

  // Location (mainly local business)
  location: {
    city: string | null;
    region: string | null;
    country: string | null;
    fullAddress: string | null;
  } | null;

  // Services / offering
  services: string[];

  // Additional signals
  pricingPageFound: boolean;
  schemaTypes: string[];
  metaDescription: string | null;

  // Raw control data
  scrapedAt: string;
  pagesScraped: string[];
}
