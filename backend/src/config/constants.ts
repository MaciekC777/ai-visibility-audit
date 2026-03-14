import { PlanLimits, PlanType, Language, Region } from '../types';

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    auditsPerMonth: 1,
    models: ['openai'],
    promptsPerAudit: 10,
  },
  starter: {
    auditsPerMonth: 5,
    models: ['openai', 'anthropic', 'gemini'],
    promptsPerAudit: 16,
  },
  pro: {
    auditsPerMonth: 20,
    models: ['openai', 'anthropic', 'gemini', 'perplexity'],
    promptsPerAudit: 21, // + keyword prompts
  },
  agency: {
    auditsPerMonth: Infinity,
    models: ['openai', 'anthropic', 'gemini', 'perplexity'],
    promptsPerAudit: 21,
  },
};

export const SCORING_WEIGHTS = {
  visibility: {
    mentionRate: 40,
    positionScore: 30,
    modelCoverage: 20,
    sentimentBonus: 10,
  },
  perception: {
    positive: 60,
    neutral: 30,
    negative: 0,
    base: 10,
  },
};

export const HALLUCINATION_PENALTIES = {
  high: 15,
  medium: 8,
  low: 3,
  // Legacy
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
  anthropic: 'claude-sonnet-4-20250514',
  gemini: 'gemini-2.0-flash',
  perplexity: 'sonar',
} as const;

// Region → Language mapping
export const REGION_LANGUAGE: Record<Region, Language> = {
  global: 'en',
  germany: 'de',
  france: 'fr',
  spain: 'es',
  poland: 'pl',
  portugal: 'pt',
};

// Language code → full language name (for LLM prompts)
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  pl: 'Polish',
  pt: 'Portuguese',
};

// ─── Third-party platforms per mode and plan ──────────────────────────────────

export const SAAS_PLATFORMS_BY_PLAN: Record<PlanType, string[]> = {
  free: ['G2', 'Capterra'],
  starter: ['G2', 'Capterra', 'ProductHunt', 'Reddit', 'Wikipedia'],
  pro: ['G2', 'Capterra', 'ProductHunt', 'Reddit', 'Wikipedia', 'GitHub', 'Crunchbase', 'Trustpilot', 'LinkedIn', 'StackOverflow'],
  agency: ['G2', 'Capterra', 'ProductHunt', 'Reddit', 'Wikipedia', 'GitHub', 'Crunchbase', 'Trustpilot', 'LinkedIn', 'StackOverflow'],
};

export const LOCAL_PLATFORMS_BY_PLAN: Record<PlanType, string[]> = {
  free: ['Google Business Profile', 'Google Maps', 'Facebook'],
  starter: ['Google Business Profile', 'Google Maps', 'Facebook', 'Yelp', 'Tripadvisor', 'Instagram'],
  pro: ['Google Business Profile', 'Google Maps', 'Facebook', 'Yelp', 'Tripadvisor', 'Instagram', 'Foursquare', 'Apple Maps', 'Trustpilot'],
  agency: ['Google Business Profile', 'Google Maps', 'Facebook', 'Yelp', 'Tripadvisor', 'Instagram', 'Foursquare', 'Apple Maps', 'Trustpilot'],
};

export const PLATFORM_URLS: Record<string, string> = {
  'G2': 'https://www.g2.com/products/{slug}/reviews',
  'Capterra': 'https://www.capterra.com/p/{slug}',
  'ProductHunt': 'https://www.producthunt.com/products/{slug}',
  'Trustpilot': 'https://www.trustpilot.com/review/{domain}',
  'LinkedIn': 'https://www.linkedin.com/company/{slug}',
  'Crunchbase': 'https://www.crunchbase.com/organization/{slug}',
  'AppSumo': 'https://appsumo.com/products/{slug}',
  'Clutch': 'https://clutch.co/profile/{slug}',
  'Reddit': 'https://www.reddit.com/search/?q={slug}',
  'Wikipedia': 'https://en.wikipedia.org/wiki/{slug}',
  'GitHub': 'https://github.com/{slug}',
  'StackOverflow': 'https://stackoverflow.com/questions/tagged/{slug}',
  'Google Business Profile': 'https://www.google.com/maps/search/{slug}',
  'Google Maps': 'https://www.google.com/maps/search/{slug}',
  'Facebook': 'https://www.facebook.com/{slug}',
  'Yelp': 'https://www.yelp.com/biz/{slug}',
  'Tripadvisor': 'https://www.tripadvisor.com/Search?q={slug}',
  'Instagram': 'https://www.instagram.com/{slug}',
  'Foursquare': 'https://foursquare.com/v/{slug}',
  'Apple Maps': 'https://maps.apple.com/?q={slug}',
};

export const SCRAPE_PATHS_SAAS = ['/', '/about', '/pricing', '/features', '/product'];
export const SCRAPE_PATHS_LOCAL = ['/', '/about', '/contact', '/services'];
export const SCRAPE_PATHS = SCRAPE_PATHS_SAAS; // backwards compat

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 30;

// Retry config for AI model calls
export const RETRY_DELAYS_MS = [2000, 6000, 18000];
export const MODEL_TIMEOUT_MS = 45_000;
