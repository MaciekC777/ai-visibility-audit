import { ThirdPartyPresence, PlanType } from '../types';
import {
  SAAS_PLATFORMS_BY_PLAN,
  LOCAL_PLATFORMS_BY_PLAN,
  PLATFORM_URLS,
} from '../config/constants';
import { logger } from '../utils/logger';

function domainToSlug(domain: string): string {
  return domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('.')[0].toLowerCase();
}

async function checkUrl(url: string): Promise<{ present: boolean; statusCode?: number }> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIVisibilityBot/1.0)' },
      signal: AbortSignal.timeout(8_000),
      redirect: 'follow',
    });
    // 200-399 = present, 404/410 = missing, others = uncertain (treat as present)
    const present = res.status < 404 || (res.status >= 400 && res.status < 404);
    return { present: res.status < 404, statusCode: res.status };
  } catch {
    return { present: false };
  }
}

function getRecommendation(platform: string, present: boolean, mode: string): string {
  if (present) {
    if (platform === 'Google Business Profile') return 'Profile found — ensure it is complete with photos, hours, and regular posts';
    if (platform === 'G2' || platform === 'Capterra') return 'Listed — actively collect reviews to boost AI mention rate';
    return 'Present — monitor and keep profile updated';
  }

  // Not present
  if (platform === 'Google Business Profile') return '🔴 CRITICAL: Claim your Google Business Profile immediately — highest impact for local AI visibility';
  if (platform === 'G2') return 'Get listed on G2 — AI models heavily cite G2 for SaaS recommendations';
  if (platform === 'Capterra') return 'Get listed on Capterra — widely cited by AI models for software comparisons';
  if (platform === 'ProductHunt') return 'Launch on Product Hunt — increases AI discovery for new products';
  if (platform === 'Trustpilot') return 'Create Trustpilot profile and collect reviews';
  if (platform === 'LinkedIn') return 'Complete LinkedIn Company page — cited as authority signal';
  if (platform === 'Crunchbase') return 'Add Crunchbase profile — signals legitimacy and funding history';
  if (platform === 'Yelp') return 'Claim Yelp listing — commonly cited for local businesses';
  if (platform === 'Tripadvisor') return 'List on Tripadvisor — heavily cited for hospitality and tourism';
  return `Get listed on ${platform} to improve AI visibility`;
}

export async function checkThirdPartyPresence(
  domain: string,
  businessMode: string = 'saas',
  plan: PlanType = 'free'
): Promise<ThirdPartyPresence[]> {
  const slug = domainToSlug(domain);
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

  const platformList = (businessMode === 'local' || businessMode === 'local_business' || businessMode === 'restaurant')
    ? LOCAL_PLATFORMS_BY_PLAN[plan]
    : SAAS_PLATFORMS_BY_PLAN[plan];

  const checks = platformList.map(async (platformName): Promise<ThirdPartyPresence> => {
    const urlTemplate = PLATFORM_URLS[platformName];
    if (!urlTemplate) {
      return {
        platform: platformName,
        status: 'missing',
        url: null,
        recommendation: getRecommendation(platformName, false, businessMode),
      };
    }

    const url = urlTemplate
      .replace('{slug}', slug)
      .replace('{domain}', cleanDomain);

    logger.debug(`Checking ${platformName}: ${url}`);
    const result = await checkUrl(url);

    return {
      platform: platformName,
      status: result.present ? 'present' : 'missing',
      url: result.present ? url : null,
      rating: null,
      reviews_count: null,
      recommendation: getRecommendation(platformName, result.present, businessMode),
      // Legacy
      present: result.present,
      statusCode: result.statusCode,
    };
  });

  return Promise.all(checks);
}
