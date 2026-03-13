// ─── Core Enums ──────────────────────────────────────────────────────────────

export type BusinessMode = 'saas' | 'local';
export type Region = 'global' | 'germany' | 'france' | 'spain' | 'poland' | 'portugal';
export type Language = 'en' | 'de' | 'fr' | 'es' | 'pl' | 'pt';
export type PlanType = 'free' | 'starter' | 'pro' | 'agency';

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

// ─── Verifiable Facts ─────────────────────────────────────────────────────────

export interface VerifiableFact {
  id: string; // F1, F2, ...
  category: 'pricing' | 'feature' | 'company' | 'integration' | 'location' | 'hours' | 'service' | 'contact' | 'rating';
  statement: string;
  source: string;
}

// ─── Brand Profiles ───────────────────────────────────────────────────────────

export interface PricingPlan {
  name: string;
  price: string;
  billing_period: string;
  key_limits: string[];
}

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
    model: string; // freemium | subscription | one-time | usage-based
    plans: PricingPlan[];
    free_trial: boolean;
    enterprise: boolean;
  };
  features: {
    core: string[];
    differentiators: string[];
    integrations: string[];
    platforms: string[];
  };
  market: {
    target_regions: string[];
    languages: string[];
    primary_language: string;
  };
  competitors: {
    direct: string[];
    indirect: string[];
  };
  keywords: string[];
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
    languages_detected: string[];
  };
  verifiable_facts: VerifiableFact[];
  scrapedAt: string;
}

export interface OpeningHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
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
    opening_hours: OpeningHours;
  };
  services: {
    primary: string[];
    secondary: string[];
    specialties: string[];
  };
  pricing: {
    range: string;
    sample_prices: Array<{ item: string; price: string }>;
  };
  market: {
    service_area: string;
    primary_language: string;
    target_audience: string;
  };
  competitors: {
    local: string[];
    chains: string[];
  };
  online_presence: {
    google_business?: string;
    google_rating?: number;
    google_reviews_count?: number;
    facebook?: string;
    instagram?: string;
    yelp?: string;
    tripadvisor?: string;
  };
  keywords: string[];
  website_meta: {
    has_website: boolean;
    has_schema_org: boolean;
    schema_types_found: string[];
    has_local_business_schema: boolean;
    has_sitemap: boolean;
    ssl: boolean;
    nap_consistent: boolean;
    has_faq: boolean;
  };
  verifiable_facts: VerifiableFact[];
  scrapedAt: string;
}

export type BrandProfile = BrandProfileSaaS | BrandProfileLocal;

// ─── Prompts ──────────────────────────────────────────────────────────────────

export type PromptCategory =
  | 'A_discovery'
  | 'B_factual'
  | 'C_comparison'
  | 'D_recommendation'
  | 'E_evaluation'
  | 'K_keyword';

export interface PromptItem {
  id: string; // A1, A2, B1, ..., K1
  category: PromptCategory;
  text: string;
  language: Language;
}

// ─── Model Responses ─────────────────────────────────────────────────────────

export interface ModelResponse {
  model: string;
  promptId: string;
  promptText: string;
  promptCategory: PromptCategory;
  response: string;
  sources_cited: string[];
  timestamp: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  search_enabled: boolean;
  error?: string;
  refused?: boolean;
  explicit_unknown?: boolean;
}

// ─── Visibility Analysis ──────────────────────────────────────────────────────

export interface MentionResult {
  brand_mentioned: boolean;
  mention_type: 'recommended' | 'listed' | 'briefly_mentioned' | 'not_found';
  position_in_list: number | null;
  total_items_in_list: number | null;
  competitors_mentioned: string[];
  recommendation_strength: 'primary' | 'one_of_many' | 'mentioned_not_recommended' | 'absent';
  context_snippet: string | null;
  sources_referenced: string[];
}

export interface PromptMentionResult extends MentionResult {
  model: string;
  promptId: string;
}

export interface VisibilityAnalysis {
  mentionRate: number; // 0-1 (A+D+K prompts)
  positionScore: number; // 0-1 normalized
  modelCoverage: number; // 0-1
  sentimentBonus: number; // 0-1
  mentionsByModel: Record<string, number>;
  mentionsByCategory: Record<string, number>;
  promptMentions: PromptMentionResult[];
}

// ─── Source Analysis ──────────────────────────────────────────────────────────

export interface SourceAnalysis {
  brand_site_cited: boolean;
  brand_site_citation_count: number;
  third_party_sources: Array<{ url: string; count: number }>;
  competitor_sites_cited: string[];
  total_sources: number;
}

// ─── Competitor Analysis ──────────────────────────────────────────────────────

export interface Competitor {
  name: string;
  total_mentions: number;
  co_mention_rate: number; // how often alongside the audited brand
  replacement_rate: number; // how often AI recommends this instead of audited brand
  avg_position: number;
  models: string[];
}

// ─── Hallucination Detection ──────────────────────────────────────────────────

export interface ExtractedClaim {
  claim_text: string;
  claim_type: 'pricing' | 'feature' | 'company_info' | 'location' | 'hours' | 'service' | 'contact' | 'metric';
  verifiable: boolean;
  model: string;
  promptId: string;
}

export interface VerifiedClaim extends ExtractedClaim {
  mapped_fact_id: string; // F1, F2, ... or 'no_match'
  verdict: 'correct' | 'incorrect' | 'partially_correct' | 'unverifiable' | 'outdated';
  severity: 'high' | 'medium' | 'low';
  explanation: string;
  correction: string;
}

// Legacy type for backwards compat
export interface Hallucination {
  promptId: string;
  model: string;
  claim: string;
  verdict: 'confirmed_false' | 'unverifiable' | 'confirmed_true';
  verdict_new?: 'correct' | 'incorrect' | 'partially_correct' | 'unverifiable' | 'outdated';
  severity?: 'high' | 'medium' | 'low';
  explanation: string;
  correction?: string;
}

// ─── Sentiment ────────────────────────────────────────────────────────────────

export interface SentimentResult {
  promptId: string;
  model: string;
  overall_sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  tone: 'enthusiastic' | 'balanced' | 'cautious' | 'dismissive' | 'unknown';
  specific_praise: string[];
  specific_criticism: string[];
  fabricated_opinions: boolean;
  fabricated_opinions_detail: string | null;
}

// ─── Website Readiness ────────────────────────────────────────────────────────

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
  score: number; // 0-100 weighted
  // Legacy fields for backwards compat
  hasStructuredData?: boolean;
  hasAboutPage?: boolean;
  hasPricingPage?: boolean;
  hasBlogOrResources?: boolean;
  hasPressMentions?: boolean;
  metaTitleOptimized?: boolean;
  metaDescriptionOptimized?: boolean;
}

// ─── Third Party ──────────────────────────────────────────────────────────────

export interface ThirdPartyPresence {
  platform: string;
  status: 'present' | 'missing';
  url: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  recommendation: string;
  // Legacy
  present?: boolean;
  statusCode?: number;
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'quick_win' | 'moderate' | 'significant';
  title: string;
  description: string;
  based_on: string;
  category: 'accuracy' | 'visibility' | 'website' | 'presence';
  // Legacy
  impact?: 'low' | 'medium' | 'high';
}

// ─── Scores ───────────────────────────────────────────────────────────────────

export interface AuditScores {
  visibilityScore: number; // 0-100
  accuracyScore: number | null; // 0-100 or null if no claims
  compositeScore: number; // 0-100
  perceptionScore: number; // 0-100
  marketRank: number;
}

// ─── Audit Result Data ────────────────────────────────────────────────────────

export interface AuditResultData {
  brand_profile?: BrandProfile;
  prompt_results?: ModelResponse[];
  hallucinations?: VerifiedClaim[];
  competitors?: Competitor[];
  sentiment?: SentimentResult[];
  recommendations?: Recommendation[];
  website_readiness?: WebsiteReadiness;
  third_party?: ThirdPartyPresence[];
  visibility_analysis?: VisibilityAnalysis;
  source_analysis?: SourceAnalysis;
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export interface PlanLimits {
  auditsPerMonth: number;
  models: string[];
  promptsPerAudit: number; // base; keywords add more for pro
}

export interface AuthenticatedRequest extends Express.Request {
  userId: string;
  userPlan: PlanType;
}

// ─── Audit Input ──────────────────────────────────────────────────────────────

export interface AuditInput {
  auditId: string;
  domain: string;
  plan: PlanType;
  businessMode: BusinessMode;
  region: Region;
  language: Language;
  keywords?: string[];
}
