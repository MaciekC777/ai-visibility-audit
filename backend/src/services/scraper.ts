import * as cheerio from 'cheerio';
import { BrandProfile, WebsiteReadiness } from '../types';
import { SCRAPE_PATHS } from '../config/constants';
import { logger } from '../utils/logger';

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIVisibilityBot/1.0)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractText($: ReturnType<typeof cheerio.load>, selector: string): string {
  return $(selector).first().text().trim();
}

export async function scrapeBrandProfile(domain: string): Promise<BrandProfile> {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const pages: Record<string, string> = {};

  for (const path of SCRAPE_PATHS) {
    try {
      pages[path] = await fetchPage(`${baseUrl}${path}`);
    } catch (e) {
      logger.debug(`Could not fetch ${baseUrl}${path}`, { error: (e as Error).message });
    }
  }

  const homeHtml = pages['/'] ?? '';
  const $ = cheerio.load(homeHtml);

  const brandName =
    extractText($, 'meta[property="og:site_name"]').replace(/content="|"/g, '') ||
    extractText($, 'title').split('|')[0].split('-')[0].trim() ||
    domain.replace(/^www\./, '').split('.')[0];

  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    extractText($, 'h1') ||
    '';

  // Extract USPs from h2/h3/li elements on homepage
  const usps: string[] = [];
  $('h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 10 && text.length < 120) usps.push(text);
  });

  // Pricing tiers from pricing page
  const pricingTiers: string[] = [];
  if (pages['/pricing']) {
    const $p = cheerio.load(pages['/pricing']);
    $p('[class*="plan"], [class*="tier"], [class*="price"]').each((_, el) => {
      const text = $p(el).text().trim().slice(0, 60);
      if (text) pricingTiers.push(text);
    });
  }

  // Infer category from meta keywords or title
  const metaKeywords = $('meta[name="keywords"]').attr('content') ?? '';
  const category = inferCategory(brandName, description, metaKeywords);

  return {
    domain,
    brandName,
    description: description.slice(0, 500),
    usps: usps.slice(0, 10),
    pricingTiers: pricingTiers.slice(0, 5),
    category,
    keywords: metaKeywords.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 20),
    scrapedAt: new Date().toISOString(),
  };
}

export async function analyzeWebsiteReadiness(
  domain: string,
  pages: Record<string, string>
): Promise<WebsiteReadiness> {
  const homeHtml = pages['/'] ?? '';
  const $ = cheerio.load(homeHtml);

  const hasStructuredData =
    $('script[type="application/ld+json"]').length > 0;
  const hasAboutPage = !!pages['/about'];
  const hasPricingPage = !!pages['/pricing'];
  const hasBlogOrResources = !!(pages['/blog'] || pages['/resources']);

  const metaTitle = $('title').text();
  const metaDesc = $('meta[name="description"]').attr('content') ?? '';

  const metaTitleOptimized = metaTitle.length >= 30 && metaTitle.length <= 70;
  const metaDescriptionOptimized = metaDesc.length >= 120 && metaDesc.length <= 160;
  const hasPressMentions =
    homeHtml.toLowerCase().includes('press') ||
    homeHtml.toLowerCase().includes('featured in') ||
    homeHtml.toLowerCase().includes('as seen in');

  const checks = [
    hasStructuredData,
    hasAboutPage,
    hasPricingPage,
    hasBlogOrResources,
    hasPressMentions,
    metaTitleOptimized,
    metaDescriptionOptimized,
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return {
    hasStructuredData,
    hasAboutPage,
    hasPricingPage,
    hasBlogOrResources,
    hasPressMentions,
    metaTitleOptimized,
    metaDescriptionOptimized,
    score,
  };
}

function inferCategory(name: string, desc: string, keywords: string): string {
  const text = `${name} ${desc} ${keywords}`.toLowerCase();
  if (text.match(/crm|customer relationship/)) return 'CRM';
  if (text.match(/analytics|data|insight/)) return 'Analytics';
  if (text.match(/project manag|task|workflow/)) return 'Project Management';
  if (text.match(/market|email|campaign/)) return 'Marketing';
  if (text.match(/hr|recruit|hire/)) return 'HR Software';
  if (text.match(/account|finance|invoice/)) return 'Accounting';
  if (text.match(/design|figma|ui|ux/)) return 'Design';
  if (text.match(/devops|deploy|ci\/cd/)) return 'DevOps';
  if (text.match(/chat|messag|communicat/)) return 'Communication';
  if (text.match(/ecommerce|shop|store/)) return 'E-commerce';
  return 'Software';
}
