export interface BrandProfile {
  domain: string;
  brandName: string;
  description: string;
  usps: string[];
  pricingTiers: string[];
  founded?: string;
  category: string;
  keywords: string[];
  scrapedAt: string;
}

export interface ThirdPartyPresence {
  platform: string;
  url: string;
  present: boolean;
  statusCode?: number;
}

export interface PromptItem {
  id: string;
  category: 'awareness' | 'comparison' | 'recommendation' | 'direct' | 'feature' | 'problem';
  text: string;
  language: string;
}

export interface ModelResponse {
  model: string;
  promptId: string;
  response: string;
  latencyMs: number;
  error?: string;
}

export interface VisibilityAnalysis {
  mentionRate: number; // 0-1
  modelCoverage: number; // 0-1
  avgPositionScore: number; // 0-100
  categoryBreadth: number; // 0-1
  mentionsByModel: Record<string, number>;
  mentionsByCategory: Record<string, number>;
  positionsByPrompt: Record<string, number | null>;
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
  score: number; // -1 to 1
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
  score: number; // 0-100
}

export interface AuditScores {
  visibilityScore: number;
  accuracyScore: number;
  perceptionScore: number;
  marketRank: number;
}

export interface AuditResultData {
  brand_profile?: BrandProfile;
  prompt_results?: ModelResponse[];
  hallucinations?: Hallucination[];
  competitors?: Competitor[];
  sentiment?: SentimentResult[];
  recommendations?: Recommendation[];
  website_readiness?: WebsiteReadiness;
  third_party?: ThirdPartyPresence[];
  visibility_analysis?: VisibilityAnalysis;
}

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

export interface PlanLimits {
  auditsPerMonth: number;
  models: string[];
  promptsPerAudit: number;
}

export interface AuthenticatedRequest extends Express.Request {
  userId: string;
  userPlan: PlanType;
}
