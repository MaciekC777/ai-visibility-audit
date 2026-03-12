import { PlanLimits, PlanType } from '../types';

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    auditsPerMonth: 1,
    models: ['openai', 'anthropic'],
    promptsPerAudit: 10,
  },
  starter: {
    auditsPerMonth: 5,
    models: ['openai', 'anthropic', 'gemini'],
    promptsPerAudit: 25,
  },
  pro: {
    auditsPerMonth: 20,
    models: ['openai', 'anthropic', 'gemini', 'perplexity'],
    promptsPerAudit: 50,
  },
  agency: {
    auditsPerMonth: Infinity,
    models: ['openai', 'anthropic', 'gemini', 'perplexity'],
    promptsPerAudit: 100,
  },
};

export const SCORING_WEIGHTS = {
  visibility: {
    mentionRate: 40,
    modelCoverage: 30,
    avgPosition: 20,
    categoryBreadth: 10,
  },
  perception: {
    positive: 60,
    neutral: 30,
    negative: 0,
    base: 10,
  },
};

export const HALLUCINATION_PENALTIES = {
  confirmed_false: 20,
  unverifiable: 5,
  confirmed_true: 0,
};

export const POSITION_SCORES: Record<number, number> = {
  1: 100,
  2: 80,
  3: 60,
};
export const POSITION_SCORE_LATER = 40;
export const POSITION_SCORE_NONE = 0;

export const MODEL_NAMES = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-1.5-flash',
  perplexity: 'llama-3-sonar-large-32k-online',
} as const;

export const THIRD_PARTY_PLATFORMS = [
  { name: 'G2', urlTemplate: 'https://www.g2.com/products/{slug}' },
  { name: 'Capterra', urlTemplate: 'https://www.capterra.com/p/{slug}' },
  { name: 'Trustpilot', urlTemplate: 'https://www.trustpilot.com/review/{domain}' },
  { name: 'Clutch', urlTemplate: 'https://clutch.co/profile/{slug}' },
  { name: 'ProductHunt', urlTemplate: 'https://www.producthunt.com/products/{slug}' },
  { name: 'LinkedIn', urlTemplate: 'https://www.linkedin.com/company/{slug}' },
  { name: 'Crunchbase', urlTemplate: 'https://www.crunchbase.com/organization/{slug}' },
  { name: 'AppSumo', urlTemplate: 'https://appsumo.com/products/{slug}' },
];

export const SCRAPE_PATHS = ['/', '/about', '/pricing', '/features', '/product'];

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 30;
