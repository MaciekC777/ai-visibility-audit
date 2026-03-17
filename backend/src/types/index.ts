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
    // Extended signals for checklist evaluation
    has_about_page?: boolean;
    has_blog?: boolean;
    has_case_studies?: boolean;
    has_comparison_page?: boolean;
    has_press_page?: boolean;
    has_contact_page?: boolean;
    has_open_graph?: boolean;
    has_hreflang?: boolean;
    has_free_trial_cta?: boolean;
    has_demo_cta?: boolean;
    has_linkedin?: boolean;
    has_canonical?: boolean;
    has_date_modified?: boolean;
    has_testimonials?: boolean;
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
  | 'F_local_list'   // local only: "give me top 5 X in Y" ranking queries
  | 'K_keyword';

// New prompt categories (v2 — used in promptCategory field)
export type NewPromptCategory = 'discovery' | 'factual' | 'comparative' | 'evaluation' | 'practical';

export interface PromptItem {
  id: string;
  category?: PromptCategory;   // old-style category
  promptCategory?: string;     // new-style category (discovery|factual|comparative|evaluation|practical)
  text: string;
  prompt?: string;             // alias for text (new pipeline)
  persona?: string;
  test_intent?: string;
  language: Language;
}

// Domain-scoped reusable prompt (stored in domain_prompts table)
export interface StoredPrompt {
  id: string;
  domain: string;
  first_audit_id: string;
  category: NewPromptCategory;
  prompt_text: string;
  language: Language;
  created_at: string;
}

// ─── Model Responses ─────────────────────────────────────────────────────────

export interface ModelResponse {
  model: string;
  promptId: string;
  promptText: string;
  promptCategory: string;  // accepts both old PromptCategory values and new category names
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
  categoryBreadth: number; // 0-1 — % of prompt categories with ≥1 mention
  mentionsByModel: Record<string, number>;
  mentionsByCategory: Record<string, number>;
  promptMentions: PromptMentionResult[];
  allPromptMentions: PromptMentionResult[]; // all categories, for competitor extraction
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
  recommendation_stance?: 'recommended' | 'neutral' | 'discouraged';
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
  mode: string;  // BusinessMode or business_type string
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
  category: 'accuracy' | 'visibility' | 'website' | 'presence' | 'content' | 'technical';
  // Legacy
  impact?: 'low' | 'medium' | 'high';
}

// ─── Checklist ────────────────────────────────────────────────────────────────

import type { ChecklistItem } from '../config/saasChecklist';

export interface ChecklistResult {
  item: ChecklistItem;
  status: 'pass' | 'fail' | 'partial' | 'not_applicable';
  detail?: string;
}

export interface ChecklistEvaluation {
  results: ChecklistResult[];
  gaps: ChecklistResult[]; // failed or partial only
  score: number;           // 0-100 weighted
  passed: number;
  total: number;           // excludes not_applicable
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

// ─── New Universal Types (v2 pipeline) ───────────────────────────────────────

export type BusinessType =
  | 'saas'
  | 'ecommerce'
  | 'agency'
  | 'local_business'
  | 'restaurant'
  | 'media'
  | 'marketplace'
  | 'nonprofit'
  | 'other';

export interface BrandKnowledgeMap {
  brand_name: string;
  business_type: BusinessType;
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
  target_customer_situations: string[];
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
    nearby_landmarks: string[];
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
    review_platforms_mentioned: string[];
  };
  integrations: string[];
  founding_year: string | null;
  team_size_signal: string;
  verifiable_facts: {
    pricing_details: string[];
    feature_claims: string[];
    metrics_claimed: string[];
    factual_details: string[];
    contact_details: string[];
  };
}

export interface RawScrapedData {
  domain: string;
  pages: Array<{
    url: string;
    clean_text: string;
    meta: Record<string, string>;
    jsonld: any[];
  }>;
  nav_links: string[];
  technical_signals: {
    ssl: boolean;
    sitemap_exists: boolean;
    robots_txt: string;
    gptbot_allowed: boolean;
    claudebot_allowed: boolean;
    perplexitybot_allowed: boolean;
    google_extended_allowed: boolean;
    llms_txt_exists: boolean;
    hreflang_tags: string[];
    schema_types: string[];
    has_opengraph: boolean;
  };
}

// ─── Mention Classification (v2 — 6-level scale) ─────────────────────────────

export type MentionClassification =
  | 'strong_recommend'
  | 'recommended'
  | 'listed'
  | 'weak_mention'
  | 'negative_mention'
  | 'not_mentioned';

export interface UnifiedResponseAnalysis {
  promptId: string;
  model: string;
  category: string;
  brand_mentioned: boolean;
  brand_name_used: string | null;
  // v2 scoring fields
  mention_classification?: MentionClassification;
  has_authority_signals?: boolean;
  // existing optional fields
  visibility?: {
    mention_type: 'recommended' | 'listed' | 'briefly_mentioned' | 'not_found';
    position: number | null;
    total_items: number | null;
    context: string | null;
  };
  sentiment?: {
    overall: 'positive' | 'neutral' | 'negative' | 'mixed';
    strengths_mentioned: string[];
    weaknesses_mentioned: string[];
    recommendation_stance: 'recommended' | 'neutral' | 'discouraged';
  };
  competitors_in_response?: Array<{
    name: string;
    position: number | null;
    sentiment: 'positive' | 'neutral' | 'negative';
  }>;
  positioning?: {
    vs_competitor: string;
    brand_advantage: string;
    competitor_advantage: string;
    ai_preference: 'brand' | 'competitor' | 'neutral';
  };
  claims?: Array<{
    statement: string;
    type: string;
    confidence: 'stated_as_fact' | 'hedged' | 'speculative';
  }>;
}

export interface ClaimForVerification {
  statement: string;
  type: string;
  confidence: string;
  source_model: string;
  source_prompt_id: string;
}

export interface AggregatedResults {
  visibilityAnalysis: VisibilityAnalysis;
  sentimentResults: SentimentResult[];
  competitors: Competitor[];
  claims: ClaimForVerification[];
}

export interface NewAuditScores extends AuditScores {
  reputationScore: number | null;
  shareOfVoice: number;
  competitiveRank: number;
  overallScore: number;
}

// ─── Scoring component interfaces (v2) ───────────────────────────────────────

export interface VisibilityComponents {
  weighted_mention_avg: number;
  position_score: number;
  model_coverage: number;
  consistency_bonus: number;
}

export interface ReputationComponents {
  sentiment_avg: number | null;
  authority_ratio: number | null;
  recommend_strength: number | null;
  mention_count: number;
}

export interface CompetitiveComponents {
  share_of_voice: number | null;
  avg_rank: number | null;
}

export interface CompetitorEntry {
  name: string;
  mention_count: number;
  total_weight: number;
}

export interface ClaimStats {
  total: number;
  correct: number;
  incorrect: number;
  unverifiable: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
}
