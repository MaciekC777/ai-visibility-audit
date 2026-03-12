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

export interface Audit {
  id: string;
  user_id: string;
  domain: string;
  brand_name: string | null;
  target_keywords: string[] | null;
  target_market: string;
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

export interface BrandProfile {
  domain: string;
  brandName: string;
  description: string;
  usps: string[];
  pricingTiers: string[];
  category: string;
  keywords: string[];
  scrapedAt: string;
}

export interface ModelResponse {
  model: string;
  promptId: string;
  response: string;
  latencyMs: number;
  error?: string;
}

export interface Hallucination {
  promptId: string;
  model: string;
  claim: string;
  verdict: 'confirmed_false' | 'unverifiable' | 'confirmed_true';
  explanation: string;
}

export interface SentimentResult {
  promptId: string;
  model: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
}

export interface Competitor {
  name: string;
  mentionCount: number;
  models: string[];
}

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface WebsiteReadiness {
  hasStructuredData: boolean;
  hasAboutPage: boolean;
  hasPricingPage: boolean;
  hasBlogOrResources: boolean;
  hasPressMentions: boolean;
  metaTitleOptimized: boolean;
  metaDescriptionOptimized: boolean;
  score: number;
}

export interface ThirdPartyPresence {
  platform: string;
  url: string;
  present: boolean;
  statusCode?: number;
}

export interface VisibilityAnalysis {
  mentionRate: number;
  modelCoverage: number;
  avgPositionScore: number;
  categoryBreadth: number;
  mentionsByModel: Record<string, number>;
  mentionsByCategory: Record<string, number>;
  positionsByPrompt: Record<string, number | null>;
}

export interface AuditReport {
  audit: Audit;
  brandProfile?: BrandProfile;
  promptResults?: ModelResponse[];
  hallucinations?: Hallucination[];
  competitors?: Competitor[];
  sentiment?: SentimentResult[];
  recommendations?: Recommendation[];
  websiteReadiness?: WebsiteReadiness;
  thirdParty?: ThirdPartyPresence[];
  visibilityAnalysis?: VisibilityAnalysis;
}
