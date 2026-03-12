import { ThirdPartyPresence } from '../types';
import { logger } from '../utils/logger';

const PLATFORMS = [
  { name: 'G2', urlTemplate: 'https://www.g2.com/products/{slug}/reviews' },
  { name: 'Capterra', urlTemplate: 'https://www.capterra.com/p/{slug}' },
  { name: 'Trustpilot', urlTemplate: 'https://www.trustpilot.com/review/{domain}' },
  { name: 'ProductHunt', urlTemplate: 'https://www.producthunt.com/products/{slug}' },
  { name: 'LinkedIn', urlTemplate: 'https://www.linkedin.com/company/{slug}' },
  { name: 'Crunchbase', urlTemplate: 'https://www.crunchbase.com/organization/{slug}' },
  { name: 'AppSumo', urlTemplate: 'https://appsumo.com/products/{slug}' },
  { name: 'Clutch', urlTemplate: 'https://clutch.co/profile/{slug}' },
];

function domainToSlug(domain: string): string {
  return domain.replace(/^www\./, '').split('.')[0].toLowerCase();
}

async function checkUrl(url: string): Promise<{ present: boolean; statusCode?: number }> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIVisibilityBot/1.0)' },
      signal: AbortSignal.timeout(8_000),
      redirect: 'follow',
    });
    return { present: res.status < 404, statusCode: res.status };
  } catch {
    return { present: false };
  }
}

export async function checkThirdPartyPresence(domain: string): Promise<ThirdPartyPresence[]> {
  const slug = domainToSlug(domain);
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '');

  const checks = PLATFORMS.map(async (platform) => {
    const url = platform.urlTemplate
      .replace('{slug}', slug)
      .replace('{domain}', cleanDomain);
    logger.debug(`Checking ${platform.name}: ${url}`);
    const result = await checkUrl(url);
    return {
      platform: platform.name,
      url,
      ...result,
    };
  });

  return Promise.all(checks);
}
