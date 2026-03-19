import * as cheerio from 'cheerio';
import { fetchPage } from '../../services/scraper';
import { parseSchemas, SchemaAddress } from './schemaParser';
import { detectBusinessType } from './businessTypeDetector';
import { ScrapedData } from './types';
import { logger } from '../../utils/logger';

const SUBPAGE_SLUGS = [
  '/about', '/o-nas', '/uslugi', '/services', '/pricing', '/cennik',
];

const NAV_STOP_WORDS = new Set([
  'home', 'about', 'contact', 'blog', 'news', 'login', 'sign in', 'sign up',
  'menu', 'close', 'open', 'back', 'next', 'prev', 'more', 'less', 'read more',
  'strona główna', 'o nas', 'kontakt', 'zaloguj', 'rejestracja', 'więcej',
]);

async function headCheck(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIVisibilityBot/1.0)' },
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function extractCompanyName(html: string, schemas: ReturnType<typeof parseSchemas>): string | null {
  const $ = cheerio.load(html);

  const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim();
  if (ogSiteName) return ogSiteName;

  if (schemas.localBusiness?.name) return schemas.localBusiness.name;
  if (schemas.softwareApplication?.name) return schemas.softwareApplication.name;
  if (schemas.organization?.name) return schemas.organization.name;

  const title = $('title').text().trim();
  if (title) {
    // Strip common suffixes: "Acme | Home", "Acme - Official Website"
    const cleaned = title
      .split(/\s*[\|–\-]\s*/)
      .map(s => s.trim())
      .filter(s => !/^(home|official|website|welcome to|welcome)$/i.test(s))[0] ?? '';
    if (cleaned.length > 1) return cleaned;
  }

  return null;
}

function extractLanguage(html: string): string | null {
  const match = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
  return match ? match[1].split('-')[0].toLowerCase() : null;
}

function extractMetaDescription(html: string): string | null {
  const $ = cheerio.load(html);
  return $('meta[name="description"]').attr('content')?.trim() ?? null;
}

function extractServices(htmlPages: string[]): string[] {
  const serviceSet = new Set<string>();

  for (const html of htmlPages) {
    const $ = cheerio.load(html);

    $('h1, h2, h3').each((_i, el) => {
      const text = $(el).text().trim();
      if (text.length > 3 && text.length < 80) serviceSet.add(text);
    });

    $('nav a, .nav a, .menu a, header a, [role="navigation"] a').each((_i, el) => {
      const text = $(el).text().trim();
      if (text.length > 2 && text.length < 40) serviceSet.add(text);
    });

    const schemas = parseSchemas(html);
    for (const s of schemas.services ?? []) serviceSet.add(s);
  }

  return [...serviceSet]
    .filter(s => !NAV_STOP_WORDS.has(s.toLowerCase()))
    .slice(0, 10);
}

function extractLocation(
  html: string,
  schemas: ReturnType<typeof parseSchemas>,
): ScrapedData['location'] {
  const addr: SchemaAddress | undefined =
    schemas.localBusiness?.address ?? schemas.organization?.address;

  if (addr && typeof addr === 'object') {
    return {
      city: addr.addressLocality ?? null,
      region: addr.addressRegion ?? null,
      country: addr.addressCountry ?? null,
      fullAddress: addr.streetAddress
        ? [addr.streetAddress, addr.addressLocality].filter(Boolean).join(', ')
        : null,
    };
  }

  // Heuristic: Polish postal code pattern → city
  const $ = cheerio.load(html);
  const text = $('body').text();
  const m = text.match(/\b(\d{2}-\d{3})\s+([A-ZŁŚŹŻĆŃÓ][a-ząęóśźżćńłA-ZŁŚŹŻĆŃÓ\s]{1,30})/);
  if (m) {
    return {
      city: m[2].trim(),
      region: null,
      country: 'PL',
      fullAddress: m[0].trim(),
    };
  }

  return null;
}

function hasPhysicalAddress(
  html: string,
  schemas: ReturnType<typeof parseSchemas>,
): boolean {
  if (schemas.localBusiness?.address || schemas.organization?.address) return true;
  return /\b\d{2}-\d{3}\b/.test(html); // Polish postal code
}

export async function scrapeDomain(domain: string): Promise<ScrapedData> {
  const baseUrl = /^https?:\/\//.test(domain) ? domain : `https://${domain}`;
  const pagesScraped: string[] = [];
  const htmlPages: string[] = [];

  // Always fetch homepage
  logger.info('Scraping homepage', { url: baseUrl });
  const homepageHtml = await fetchPage(baseUrl, 15_000);
  if (homepageHtml) {
    pagesScraped.push(baseUrl);
    htmlPages.push(homepageHtml);
  }

  // HEAD-check subpages, fetch up to 5
  let fetchedSubpages = 0;
  for (const slug of SUBPAGE_SLUGS) {
    if (fetchedSubpages >= 5) break;
    const url = `${baseUrl}${slug}`;
    const exists = await headCheck(url);
    if (exists) {
      const html = await fetchPage(url, 15_000);
      if (html) {
        pagesScraped.push(url);
        htmlPages.push(html);
        fetchedSubpages++;
        logger.info('Scraped subpage', { url });
      }
    }
  }

  const primaryHtml = homepageHtml ?? '';
  const primarySchemas = parseSchemas(primaryHtml);
  const allText = htmlPages
    .map(h => cheerio.load(h)('body').text())
    .join(' ');

  const pricingPageFound = pagesScraped.some(
    u => u.endsWith('/pricing') || u.endsWith('/cennik'),
  );
  const addressFound = hasPhysicalAddress(primaryHtml, primarySchemas);

  const { type: detectedBusinessType, signals: businessTypeSignals } = detectBusinessType(
    primarySchemas,
    allText,
    pricingPageFound,
    addressFound,
  );

  return {
    companyName: extractCompanyName(primaryHtml, primarySchemas),
    domain,
    language: extractLanguage(primaryHtml),
    detectedBusinessType,
    businessTypeSignals,
    location: extractLocation(primaryHtml, primarySchemas),
    services: extractServices(htmlPages),
    pricingPageFound,
    schemaTypes: [...new Set(primarySchemas.types)],
    metaDescription: extractMetaDescription(primaryHtml),
    scrapedAt: new Date().toISOString(),
    pagesScraped,
  };
}
