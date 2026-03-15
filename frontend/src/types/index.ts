export type AuditStatus =
  | 'pending'
  | 'scraping'
  | 'third_party_check'
  | 'generating_prompts'
  | 'querying_models'
  | 'analyzing'
  | 'scoring'
  | 'completed'
  | 'failed';

export type PlanType = 'free' | 'starter' | 'pro' | 'agency';
export type BusinessMode = 'saas' | 'local';
export type Region = 'global' | 'germany' | 'france' | 'spain' | 'poland' | 'portugal';
export type Language = 'en' | 'de' | 'fr' | 'es' | 'pl' | 'pt';

export interface Audit {
  id: string;
  user_id: string;
  domain: string;
  brand_name: string | null;
  target_keywords: string[] | null;
  target_market: string; // stores region
  target_language: string;
  status: AuditStatus;
  error_message: string | null;
  plan: PlanType;
  visibility_score: number | null;
  accuracy_score: number | null;
  perception_score: number | null;
  market_rank: number | null;
  models_queried: string[] | null;
  total_prompts: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface AuditResult {
  id: string;
  audit_id: string;
  result_type: string;
  data: unknown;
  created_at: string;
}

// ─── Brand Profiles ───────────────────────────────────────────────────────────

export interface BrandProfileSaaS {
  mode: 'saas';
  brand: {
    name: string;
    domain: string;
    description: string;
    tagline: string;
    category: string;
    subcategories: string[];
    founded_year?: string;
    headquarters?: string;
  };
  pricing: {
    currency: string;
    model: string;
    plans: Array<{ name: string; price: string; billing_period: string; key_limits: string[] }>;
    free_trial: boolean;
    enterprise: boolean;
  };
  features: {
    core: string[];
    differentiators: string[];
    integrations: string[];
    platforms: string[];
  };
  website_meta: {
    has_schema_org: boolean;
    schema_types_found: string[];
    has_llms_txt: boolean;
    has_sitemap: boolean;
    has_robots_txt: boolean;
    ai_bots_allowed: 'allowed' | 'partial' | 'blocked' | 'unknown';
    ssl: boolean;
    has_faq: boolean;
    has_pricing_page: boolean;
  };
  verifiable_facts: VerifiableFact[];
  scrapedAt: string;
}

export interface BrandProfileLocal {
  mode: 'local';
  brand: {
    name: string;
    domain: string;
    description: string;
    category: string;
    subcategories: string[];
  };
  location: {
    address: string;
    city: string;
    region: string;
    country: string;
    postal_code: string;
    coordinates?: { lat: number; lng: number };
  };
  contact: {
    phone: string;
    email: string;
    opening_hours: Record<string, string>;
  };
  services: {
    primary: string[];
    secondary: string[];
    specialties: string[];
  };
  online_presence: {
    google_business?: string;
    google_rating?: number;
    google_reviews_count?: number;
  };
  website_meta: {
    has_schema_org: boolean;
    has_local_business_schema: boolean;
    nap_consistent: boolean;
    ssl: boolean;
    has_faq: boolean;
  };
  verifiable_facts: VerifiableFact[];
  scrapedAt: string;
}

export type BrandProfile = BrandProfileSaaS | BrandProfileLocal;

// ─── New universal brand profile (v2 pipeline) ────────────────────────────────

export interface BrandKnowledgeMap {
  brand_name: string;
  business_type: string;
  one_liner: string;
  category: string;
  subcategories: string[];
  target_audience: string[];
  core_offerings: string[];
  key_features: string[];
  signature_items: string[];
  unique_selling_points: string[];
  associated_concepts: string[];
  typical_occasions: string[];
  pricing: {
    model: string;
    plans: Array<{ name: string; price: string; highlights: string[] }>;
    price_range: string;
  };
  location: {
    city: string | null;
    region: string | null;
    country: string | null;
    neighborhood: string | null;
    service_area: string;
  };
  competitors_from_website: string[];
  competitors_likely: string[];
  contact_info: {
    email: string | null;
    phone: string | null;
    address: string | null;
    hours: string | null;
  };
  social_proof: {
    customer_count: string | null;
    notable_customers: string[];
    awards_certifications: string[];
  };
  integrations: string[];
  founding_year: string | null;
  verifiable_facts: {
    pricing_details: string[];
    feature_claims: string[];
    metrics_claimed: string[];
    factual_details: string[];
    contact_details: string[];
  };
}

// Accepts both old and new profile shapes
export type AnyBrandProfile = BrandProfile | BrandKnowledgeMap;

/** Extract brand name from either BrandProfile or BrandKnowledgeMap */
export function getBrandName(profile: AnyBrandProfile | null | undefined): string {
  if (!profile) return '';
  if ('brand_name' in profile) return profile.brand_name;
  return (profile as BrandProfile).brand?.name ?? '';
}

/** Extract category from either profile shape */
export function getBrandCategory(profile: AnyBrandProfile | null | undefined): string {
  if (!profile) return '';
  if ('brand_name' in profile) return (profile as BrandKnowledgeMap).category ?? '';
  return (profile as BrandProfile).brand?.category ?? '';
}

export interface VerifiableFact {
  id: string;
  category: string;
  statement: string;
  source: string;
}

// ─── Model Responses ──────────────────────────────────────────────────────────

export interface ModelResponse {
  model: string;
  promptId: string;
  promptText: string;
  promptCategory: string;
  response: string;
  sources_cited: string[];
  timestamp: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  search_enabled: boolean;
  error?: string;
  refused?: boolean;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

export interface VerifiedClaim {
  claim_text: string;
  claim_type: string;
  verdict: 'correct' | 'incorrect' | 'partially_correct' | 'unverifiable' | 'outdated';
  severity: 'high' | 'medium' | 'low';
  explanation: string;
  correction: string;
  model: string;
  promptId: string;
}

export interface SentimentResult {
  promptId: string;
  model: string;
  overall_sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  tone: string;
  specific_praise: string[];
  specific_criticism: string[];
  fabricated_opinions: boolean;
  fabricated_opinions_detail: string | null;
}

export interface Competitor {
  name: string;
  total_mentions: number;
  co_mention_rate: number;
  replacement_rate: number;
  avg_position: number;
  models: string[];
}

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'quick_win' | 'moderate' | 'significant';
  title: string;
  description: string;
  based_on: string;
  category: 'accuracy' | 'visibility' | 'website' | 'presence';
}

export interface WebsiteReadinessCheck {
  check: string;
  status: 'pass' | 'fail' | 'partial';
  importance: 'critical' | 'high' | 'medium' | 'low';
  detail?: string;
  recommendation?: string;
}

export interface WebsiteReadiness {
  mode: BusinessMode;
  checks: WebsiteReadinessCheck[];
  score: number;
}

export interface ThirdPartyPresence {
  platform: string;
  status: 'present' | 'missing';
  url: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  recommendation: string;
}

export interface VisibilityAnalysis {
  mentionRate: number;
  positionScore: number;
  modelCoverage: number;
  sentimentBonus: number;
  mentionsByModel: Record<string, number>;
  mentionsByCategory: Record<string, number>;
}

export interface SourceAnalysis {
  brand_site_cited: boolean;
  brand_site_citation_count: number;
  third_party_sources: Array<{ url: string; count: number }>;
  competitor_sites_cited: string[];
  total_sources: number;
}

// ─── Full Report ──────────────────────────────────────────────────────────────

export interface CompetitorSearchResult {
  competitors: Array<{ name: string }>;
  searchQueries: string[];
}

export interface AuditSummary {
  paragraph1: string;
  paragraph2: string;
}

export interface AuditReport {
  audit: Audit;
  brandProfile?: BrandProfile;
  promptResults?: ModelResponse[];
  hallucinations?: VerifiedClaim[];
  competitors?: Competitor[];
  sentiment?: SentimentResult[];
  recommendations?: Recommendation[];
  websiteReadiness?: WebsiteReadiness;
  thirdParty?: ThirdPartyPresence[];
  visibilityAnalysis?: VisibilityAnalysis;
  sourceAnalysis?: SourceAnalysis;
  summary?: AuditSummary;
  competitorSearch?: CompetitorSearchResult;
}
