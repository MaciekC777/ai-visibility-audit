import * as cheerio from 'cheerio';
import {
  BrandProfileSaaS,
  BrandProfileLocal,
  BrandProfile,
  WebsiteReadiness,
  WebsiteReadinessCheck,
  BusinessMode,
  VerifiableFact,
  PricingPlan,
  OpeningHours,
} from '../types';
import { logger } from '../utils/logger';

export async function fetchPage(url: string, timeout = 10_000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIVisibilityBot/1.0; +https://aivisibility.io)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

// ─── Schema.org / JSON-LD extraction ─────────────────────────────────────────

function extractJsonLd($: ReturnType<typeof cheerio.load>): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() ?? '');
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch {}
  });
  return results;
}

function getSchemaTypes(jsonld: Record<string, unknown>[]): string[] {
  return jsonld.map(j => (j['@type'] as string) ?? '').filter(Boolean);
}

function getSchemaValue(jsonld: Record<string, unknown>[], type: string, field: string): string {
  const obj = jsonld.find(j => (j['@type'] as string)?.includes(type));
  return obj ? String((obj as any)[field] ?? '') : '';
}

// ─── Robots.txt parsing ───────────────────────────────────────────────────────

async function checkRobotsTxt(baseUrl: string): Promise<{
  has_robots_txt: boolean;
  ai_bots_allowed: 'allowed' | 'partial' | 'blocked' | 'unknown';
}> {
  const content = await fetchPage(`${baseUrl}/robots.txt`);
  if (!content) return { has_robots_txt: false, ai_bots_allowed: 'unknown' };

  const AI_BOTS = ['GPTBot', 'ClaudeBot', 'GoogleOther', 'PerplexityBot', 'anthropic-ai'];
  const lines = content.toLowerCase();
  let blockedCount = 0;

  for (const bot of AI_BOTS) {
    const botSection = content.match(new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?(?=User-agent:|$)`, 'i'));
    if (botSection && botSection[0].includes('Disallow: /')) blockedCount++;
  }

  let ai_bots_allowed: 'allowed' | 'partial' | 'blocked' | 'unknown' = 'allowed';
  if (blockedCount >= AI_BOTS.length) ai_bots_allowed = 'blocked';
  else if (blockedCount > 0) ai_bots_allowed = 'partial';
  else if (lines.includes('disallow: /')) ai_bots_allowed = 'partial';

  return { has_robots_txt: true, ai_bots_allowed };
}

// ─── SaaS brand profile ───────────────────────────────────────────────────────

export async function scrapeSaasBrandProfile(domain: string): Promise<BrandProfileSaaS> {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Fetch all pages in parallel
  const [homeHtml, aboutHtml, pricingHtml, featuresHtml, llmsTxt, sitemapXml] = await Promise.all([
    fetchPage(`${baseUrl}/`),
    fetchPage(`${baseUrl}/about`),
    fetchPage(`${baseUrl}/pricing`),
    fetchPage(`${baseUrl}/features`),
    fetchPage(`${baseUrl}/llms.txt`),
    fetchPage(`${baseUrl}/sitemap.xml`),
  ]);

  const $ = cheerio.load(homeHtml ?? '');
  const jsonld = extractJsonLd($);
  const schemaTypes = getSchemaTypes(jsonld);

  // Brand name
  const brandName =
    $('meta[property="og:site_name"]').attr('content')?.trim() ||
    getSchemaValue(jsonld, 'Organization', 'name') ||
    $('title').text().split(/[|\-–]/)[0].trim() ||
    cleanDomain.split('.')[0];

  // Description
  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('h1').first().text().trim() ||
    '';

  // Tagline
  const tagline =
    $('meta[property="og:description"]').attr('content') ||
    $('h1').first().text().trim() ||
    '';

  // Category inference
  const metaKeywords = $('meta[name="keywords"]').attr('content') ?? '';
  const category = inferSaaSCategory(brandName, description, metaKeywords);

  // Features extraction
  const coreFeatures: string[] = [];
  if (featuresHtml) {
    const $f = cheerio.load(featuresHtml);
    $f('h2, h3, [class*="feature"] h3, [class*="feature"] h4').each((_, el) => {
      const text = $f(el).text().trim();
      if (text.length > 3 && text.length < 100) coreFeatures.push(text);
    });
  }
  // Also from homepage
  $('h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 3 && text.length < 100 && !coreFeatures.includes(text)) coreFeatures.push(text);
  });

  // Pricing plans
  const plans: PricingPlan[] = [];
  if (pricingHtml) {
    const $p = cheerio.load(pricingHtml);
    const pricingJsonld = extractJsonLd($p);
    const offers = pricingJsonld.filter(j => (j['@type'] as string) === 'Offer');

    if (offers.length > 0) {
      for (const offer of offers.slice(0, 5)) {
        plans.push({
          name: String((offer as any).name ?? ''),
          price: String((offer as any).price ?? ''),
          billing_period: String((offer as any).billingPeriod ?? 'month'),
          key_limits: [],
        });
      }
    } else {
      // Heuristic extraction
      $p('[class*="plan"], [class*="tier"], [class*="pricing-card"], [class*="price-card"]').each((_, el) => {
        const name = $p(el).find('h2, h3, [class*="title"], [class*="name"]').first().text().trim();
        const price = $p(el).find('[class*="price"], [class*="amount"]').first().text().trim();
        if (name || price) {
          plans.push({ name: name.slice(0, 50), price: price.slice(0, 30), billing_period: 'month', key_limits: [] });
        }
      });
    }
  }

  // Currency detection
  const currency = detectCurrency(pricingHtml ?? homeHtml ?? '');

  // Founded year
  const foundedYear =
    getSchemaValue(jsonld, 'Organization', 'foundingDate') ||
    extractFoundedYear(aboutHtml ?? homeHtml ?? '');

  // Headquarters
  const headquarters =
    getSchemaValue(jsonld, 'Organization', 'address') ||
    getSchemaValue(jsonld, 'Organization', 'location') || '';

  // Integrations from features/home
  const integrations: string[] = [];
  $('[class*="integrat"], [class*="partner"], [class*="connect"]').find('img[alt]').each((_, el) => {
    const alt = $(el).attr('alt')?.trim();
    if (alt && alt.length > 1) integrations.push(alt);
  });

  // Languages detected
  const htmlLang = $('html').attr('lang') ?? '';
  const languagesDetected = htmlLang ? [htmlLang.split('-')[0]] : ['en'];

  // robots check
  const robotsCheck = await checkRobotsTxt(baseUrl);

  // Website meta
  const ssl = baseUrl.startsWith('https://');
  const hasFaq = (homeHtml ?? '').toLowerCase().includes('faq') ||
    (homeHtml ?? '').toLowerCase().includes('frequently asked');

  const websiteMeta = {
    has_schema_org: jsonld.length > 0,
    schema_types_found: schemaTypes,
    has_llms_txt: !!llmsTxt,
    has_sitemap: !!sitemapXml,
    has_robots_txt: robotsCheck.has_robots_txt,
    ai_bots_allowed: robotsCheck.ai_bots_allowed,
    ssl,
    has_faq: hasFaq,
    has_pricing_page: !!pricingHtml,
    languages_detected: languagesDetected,
  };

  // Auto-generate verifiable facts
  const verifiableFacts: VerifiableFact[] = [];
  let factId = 1;

  for (const plan of plans) {
    if (plan.name && plan.price) {
      verifiableFacts.push({
        id: `F${factId++}`,
        category: 'pricing',
        statement: `Plan ${plan.name} costs ${plan.price} ${currency}/${plan.billing_period}`,
        source: `${baseUrl}/pricing`,
      });
    }
  }
  for (const feature of coreFeatures.slice(0, 5)) {
    verifiableFacts.push({
      id: `F${factId++}`,
      category: 'feature',
      statement: `${brandName} offers ${feature}`,
      source: `${baseUrl}/features`,
    });
  }
  if (foundedYear) {
    verifiableFacts.push({
      id: `F${factId++}`,
      category: 'company',
      statement: `${brandName} was founded in ${foundedYear}`,
      source: `${baseUrl}/about`,
    });
  }
  for (const integration of integrations.slice(0, 5)) {
    verifiableFacts.push({
      id: `F${factId++}`,
      category: 'integration',
      statement: `${brandName} integrates with ${integration}`,
      source: `${baseUrl}/features`,
    });
  }

  // Competitor mentions (coarse extraction)
  const directCompetitors: string[] = [];
  const allText = `${homeHtml ?? ''} ${aboutHtml ?? ''}`.toLowerCase();
  const compMatches = allText.match(/(?:vs|versus|compared to|alternative to)\s+([A-Z][a-zA-Z]+)/g) ?? [];
  for (const m of compMatches.slice(0, 5)) {
    const name = m.split(/\s+/).pop() ?? '';
    if (name && !directCompetitors.includes(name)) directCompetitors.push(name);
  }

  return {
    mode: 'saas',
    brand: {
      name: brandName,
      domain: cleanDomain,
      description: description.slice(0, 500),
      tagline: tagline.slice(0, 200),
      category,
      subcategories: [],
      founded_year: foundedYear,
      headquarters: headquarters.slice(0, 100),
    },
    pricing: {
      currency,
      model: detectPricingModel(pricingHtml ?? ''),
      plans: plans.slice(0, 5),
      free_trial: (pricingHtml ?? homeHtml ?? '').toLowerCase().includes('free trial') ||
        (pricingHtml ?? homeHtml ?? '').toLowerCase().includes('try free'),
      enterprise: (pricingHtml ?? homeHtml ?? '').toLowerCase().includes('enterprise'),
    },
    features: {
      core: coreFeatures.slice(0, 10),
      differentiators: [],
      integrations: integrations.slice(0, 10),
      platforms: [],
    },
    market: {
      target_regions: [],
      languages: languagesDetected,
      primary_language: languagesDetected[0] ?? 'en',
    },
    competitors: {
      direct: directCompetitors,
      indirect: [],
    },
    keywords: metaKeywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 20),
    website_meta: websiteMeta,
    verifiable_facts: verifiableFacts,
    scrapedAt: new Date().toISOString(),
  };
}

// ─── Local Business brand profile ─────────────────────────────────────────────

export async function scrapeLocalBrandProfile(domain: string): Promise<BrandProfileLocal> {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const [homeHtml, aboutHtml, contactHtml, servicesHtml, sitemapXml] = await Promise.all([
    fetchPage(`${baseUrl}/`),
    fetchPage(`${baseUrl}/about`),
    fetchPage(`${baseUrl}/contact`),
    fetchPage(`${baseUrl}/services`),
    fetchPage(`${baseUrl}/sitemap.xml`),
  ]);

  const $ = cheerio.load(homeHtml ?? '');
  const jsonld = extractJsonLd($);
  const schemaTypes = getSchemaTypes(jsonld);

  const brandName =
    $('meta[property="og:site_name"]').attr('content')?.trim() ||
    getSchemaValue(jsonld, 'LocalBusiness', 'name') ||
    getSchemaValue(jsonld, 'Organization', 'name') ||
    $('title').text().split(/[|\-–]/)[0].trim() ||
    cleanDomain.split('.')[0];

  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('h1').first().text().trim() ||
    '';

  // Location extraction from schema or contact page
  const schemaAddress = jsonld.find(j => (j['@type'] as string)?.includes('LocalBusiness') ||
    (j['@type'] as string)?.includes('Organization'));

  let address = '';
  let city = '';
  let postalCode = '';
  let country = '';
  let phone = '';

  if (schemaAddress) {
    const addrObj = (schemaAddress as any)['address'];
    if (addrObj) {
      address = addrObj['streetAddress'] ?? '';
      city = addrObj['addressLocality'] ?? '';
      postalCode = addrObj['postalCode'] ?? '';
      country = addrObj['addressCountry'] ?? '';
    }
    phone = String((schemaAddress as any)['telephone'] ?? '');
  }

  // Fallback: HTML microdata
  if (!city) {
    city = $('[itemprop="addressLocality"]').first().text().trim();
  }
  // Fallback: Open Graph locality meta tag
  if (!city) {
    city = $('meta[property="og:locality"]').attr('content')?.trim() ?? '';
  }

  // Fallback: try contact page
  if (!address && contactHtml) {
    const $c = cheerio.load(contactHtml);
    const contactText = $c('body').text();
    const phoneMatch = contactText.match(/(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/);
    if (phoneMatch) phone = phoneMatch[0];

    // Try to find city via postal code pattern in contact page
    if (!city) {
      // Matches: "12345 CityName" or "12-345 CityName" (PL/CZ/DE/FR/ES/PT formats)
      const cityMatch = contactText.match(/\b\d{2}[- ]?\d{3}\s+([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽŁŚŻŹĆĄÓĘ][^\n\r,]{2,30})/);
      if (cityMatch) city = cityMatch[1].trim().split(/\s{2,}/)[0].trim();
    }
  }

  // Fallback: contact page microdata / itemprop
  if (!city && contactHtml) {
    const $c = cheerio.load(contactHtml);
    city = $c('[itemprop="addressLocality"]').first().text().trim();
  }

  // Opening hours
  const hoursSchema = jsonld.find(j =>
    (j['@type'] as string)?.includes('LocalBusiness') && (j as any)['openingHours']
  );
  const openingHours: OpeningHours = {
    monday: '', tuesday: '', wednesday: '', thursday: '',
    friday: '', saturday: '', sunday: 'zamknięte',
  };
  if (hoursSchema) {
    const hours = (hoursSchema as any)['openingHours'];
    if (Array.isArray(hours)) {
      for (const h of hours) {
        const parts = String(h).split(' ');
        const days = parts[0];
        const time = parts[1] ?? '';
        const dayMap: Record<string, keyof OpeningHours> = {
          Mo: 'monday', Tu: 'tuesday', We: 'wednesday', Th: 'thursday',
          Fr: 'friday', Sa: 'saturday', Su: 'sunday',
        };
        if (dayMap[days] && time) openingHours[dayMap[days]] = time;
      }
    }
  }

  // Services
  const services: string[] = [];
  if (servicesHtml) {
    const $s = cheerio.load(servicesHtml);
    $s('h2, h3, [class*="service"] h3').each((_, el) => {
      const text = $s(el).text().trim();
      if (text.length > 2 && text.length < 100) services.push(text);
    });
  }
  // Also from home
  $('h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 2 && text.length < 100 && !services.includes(text)) services.push(text);
  });

  // Google rating from schema
  const googleRating = parseFloat(getSchemaValue(jsonld, 'LocalBusiness', 'aggregateRating')) || undefined;
  const googleReviewsCount = parseInt(
    getSchemaValue(jsonld, 'AggregateRating', 'reviewCount') ||
    getSchemaValue(jsonld, 'LocalBusiness', 'reviewCount')
  ) || undefined;

  // Website meta
  const hasLocalBusinessSchema = schemaTypes.some(t =>
    ['LocalBusiness', 'Restaurant', 'MedicalBusiness', 'AutoDealer', 'LegalService',
      'HealthAndBeautyBusiness', 'FoodEstablishment', 'Store'].includes(t)
  );
  const ssl = baseUrl.startsWith('https://');
  const hasFaq = (homeHtml ?? '').toLowerCase().includes('faq');

  // NAP consistency (simplified check)
  const napConsistent = !!(address && phone);

  // Category
  const category = inferLocalCategory(brandName, description, services.join(' '));

  // Auto-generate verifiable facts
  const verifiableFacts: VerifiableFact[] = [];
  let factId = 1;

  if (address && city) {
    verifiableFacts.push({
      id: `F${factId++}`,
      category: 'location',
      statement: `${brandName} is located at ${address}, ${city}`,
      source: `${baseUrl}/contact`,
    });
  }

  const dayNames: Array<keyof OpeningHours> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of dayNames) {
    const hours = openingHours[day];
    if (hours && hours !== 'zamknięte' && hours !== 'closed') {
      verifiableFacts.push({
        id: `F${factId++}`,
        category: 'hours',
        statement: `${brandName} is open on ${day} from ${hours}`,
        source: `${baseUrl}/contact`,
      });
    } else if (hours === 'zamknięte' || hours === 'closed') {
      verifiableFacts.push({
        id: `F${factId++}`,
        category: 'hours',
        statement: `${brandName} is closed on ${day}`,
        source: `${baseUrl}/contact`,
      });
    }
  }

  for (const service of services.slice(0, 5)) {
    verifiableFacts.push({
      id: `F${factId++}`,
      category: 'service',
      statement: `${brandName} offers ${service}`,
      source: `${baseUrl}/services`,
    });
  }

  if (phone) {
    verifiableFacts.push({
      id: `F${factId++}`,
      category: 'contact',
      statement: `The phone number is ${phone}`,
      source: `${baseUrl}/contact`,
    });
  }

  if (googleRating) {
    verifiableFacts.push({
      id: `F${factId++}`,
      category: 'rating',
      statement: `${brandName} has a ${googleRating} rating on Google`,
      source: 'Google Business Profile',
    });
  }

  return {
    mode: 'local',
    brand: {
      name: brandName,
      domain: cleanDomain,
      description: description.slice(0, 500),
      category,
      subcategories: [],
    },
    location: {
      address: address.slice(0, 200),
      city: city.slice(0, 100),
      region: '',
      country: country.slice(0, 50),
      postal_code: postalCode,
    },
    contact: {
      phone: phone.slice(0, 30),
      email: '',
      opening_hours: openingHours,
    },
    services: {
      primary: services.slice(0, 5),
      secondary: services.slice(5, 10),
      specialties: [],
    },
    pricing: {
      range: '',
      sample_prices: [],
    },
    market: {
      service_area: city,
      primary_language: ($('html').attr('lang') ?? 'en').split('-')[0],
      target_audience: '',
    },
    competitors: {
      local: [],
      chains: [],
    },
    online_presence: {
      google_rating: googleRating,
      google_reviews_count: googleReviewsCount,
    },
    keywords: ($('meta[name="keywords"]').attr('content') ?? '')
      .split(',').map(k => k.trim()).filter(Boolean).slice(0, 20),
    website_meta: {
      has_website: true,
      has_schema_org: jsonld.length > 0,
      schema_types_found: schemaTypes,
      has_local_business_schema: hasLocalBusinessSchema,
      has_sitemap: !!sitemapXml,
      ssl,
      nap_consistent: napConsistent,
      has_faq: hasFaq,
    },
    verifiable_facts: verifiableFacts,
    scrapedAt: new Date().toISOString(),
  };
}

// ─── Unified scraper ──────────────────────────────────────────────────────────

export async function scrapeBrandProfile(domain: string, businessMode: BusinessMode = 'saas'): Promise<BrandProfile> {
  if (businessMode === 'local') {
    return scrapeLocalBrandProfile(domain);
  }
  return scrapeSaasBrandProfile(domain);
}

// ─── Website Readiness Audit ──────────────────────────────────────────────────

export async function analyzeWebsiteReadiness(
  domain: string,
  businessMode: BusinessMode,
  profile: BrandProfile
): Promise<WebsiteReadiness> {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;

  if (businessMode === 'saas') {
    return analyzeSaaSReadiness(baseUrl, profile as BrandProfileSaaS);
  }
  return analyzeLocalReadiness(baseUrl, profile as BrandProfileLocal);
}

async function analyzeSaaSReadiness(baseUrl: string, profile: BrandProfileSaaS): Promise<WebsiteReadiness> {
  const checks: WebsiteReadinessCheck[] = [];

  // llms.txt
  const llmsTxt = await fetchPage(`${baseUrl}/llms.txt`);
  checks.push({
    check: 'llms.txt file',
    status: llmsTxt ? 'pass' : 'fail',
    importance: 'high',
    detail: llmsTxt ? 'File exists and AI models can read brand context' : 'Missing llms.txt — AI models lack direct brand guidance',
    recommendation: llmsTxt ? undefined : 'Create /llms.txt with brand description, products, and key facts',
  });

  // robots.txt AI bots
  const robotsCheck = await checkRobotsTxt(baseUrl);
  checks.push({
    check: 'AI bots allowed in robots.txt',
    status: robotsCheck.ai_bots_allowed === 'allowed' ? 'pass' :
      robotsCheck.ai_bots_allowed === 'partial' ? 'partial' : 'fail',
    importance: 'medium',
    detail: `AI bot access: ${robotsCheck.ai_bots_allowed}`,
    recommendation: robotsCheck.ai_bots_allowed !== 'allowed' ?
      'Ensure GPTBot, ClaudeBot, GoogleOther, PerplexityBot are allowed in robots.txt' : undefined,
  });

  // Schema.org
  checks.push({
    check: 'Schema.org structured data',
    status: profile.website_meta.schema_types_found.length > 0 ? 'pass' : 'fail',
    importance: 'high',
    detail: profile.website_meta.schema_types_found.length > 0
      ? `Found: ${profile.website_meta.schema_types_found.join(', ')}`
      : 'No Schema.org markup found',
    recommendation: profile.website_meta.schema_types_found.length === 0
      ? 'Add Schema.org Product or Organization markup to your homepage' : undefined,
  });

  // Sitemap
  checks.push({
    check: 'Sitemap.xml',
    status: profile.website_meta.has_sitemap ? 'pass' : 'fail',
    importance: 'low',
  });

  // SSL
  checks.push({
    check: 'HTTPS / SSL',
    status: profile.website_meta.ssl ? 'pass' : 'fail',
    importance: 'medium',
  });

  // FAQ
  checks.push({
    check: 'FAQ section',
    status: profile.website_meta.has_faq ? 'pass' : 'fail',
    importance: 'medium',
    recommendation: profile.website_meta.has_faq ? undefined
      : 'Add an FAQ page — AI models frequently extract answers from FAQ sections',
  });

  // Pricing page
  checks.push({
    check: 'Public pricing page',
    status: profile.website_meta.has_pricing_page ? 'pass' : 'fail',
    importance: 'high',
    recommendation: profile.website_meta.has_pricing_page ? undefined
      : 'Make pricing publicly accessible — AI models cannot answer pricing queries without it',
  });

  // E-E-A-T: About page
  const aboutPage = await fetchPage(`${baseUrl}/about`);
  checks.push({
    check: 'About page (E-E-A-T)',
    status: aboutPage ? 'pass' : 'fail',
    importance: 'medium',
  });

  // Weighted score
  const score = calculateWeightedScore(checks, {
    critical: 3, high: 2, medium: 1.5, low: 1,
  });

  return {
    mode: 'saas',
    checks,
    score,
    // Legacy compat
    hasStructuredData: profile.website_meta.has_schema_org,
    hasAboutPage: !!aboutPage,
    hasPricingPage: profile.website_meta.has_pricing_page,
    hasBlogOrResources: false,
    hasPressMentions: false,
    metaTitleOptimized: false,
    metaDescriptionOptimized: false,
  };
}

async function analyzeLocalReadiness(baseUrl: string, profile: BrandProfileLocal): Promise<WebsiteReadiness> {
  const checks: WebsiteReadinessCheck[] = [];

  // Google Business Profile (CRITICAL for local)
  const hasGBP = !!(profile.online_presence?.google_business ||
    profile.online_presence?.google_rating);
  checks.push({
    check: 'Google Business Profile claimed & complete',
    status: hasGBP ? 'pass' : 'fail',
    importance: 'critical',
    detail: hasGBP ? 'Google Business Profile detected' : 'No Google Business Profile found',
    recommendation: hasGBP ? undefined
      : 'Claim and complete your Google Business Profile immediately — this is the #1 factor for local AI visibility',
  });

  // NAP Consistency (CRITICAL)
  checks.push({
    check: 'NAP consistency (Name/Address/Phone)',
    status: profile.website_meta.nap_consistent ? 'pass' : 'fail',
    importance: 'critical',
    recommendation: profile.website_meta.nap_consistent ? undefined
      : 'Ensure Name, Address and Phone are identical on your website, Google, and all directories',
  });

  // LocalBusiness Schema
  checks.push({
    check: 'LocalBusiness Schema.org markup',
    status: profile.website_meta.has_local_business_schema ? 'pass' : 'fail',
    importance: 'high',
    recommendation: profile.website_meta.has_local_business_schema ? undefined
      : 'Add JSON-LD LocalBusiness schema with address, hours, phone, and geo-coordinates',
  });

  // Opening hours on website
  const hasHours = Object.values(profile.contact.opening_hours).some(h => !!h);
  checks.push({
    check: 'Opening hours visible on website',
    status: hasHours ? 'pass' : 'fail',
    importance: 'high',
    recommendation: hasHours ? undefined : 'Add opening hours to your website and contact page',
  });

  // Address on website
  checks.push({
    check: 'Address visible on website',
    status: profile.location.address ? 'pass' : 'fail',
    importance: 'high',
  });

  // SSL
  checks.push({
    check: 'HTTPS / SSL',
    status: profile.website_meta.ssl ? 'pass' : 'fail',
    importance: 'medium',
  });

  // Schema OpeningHoursSpecification
  checks.push({
    check: 'Schema.org structured data',
    status: profile.website_meta.has_schema_org ? 'pass' : 'fail',
    importance: 'medium',
  });

  // Sitemap
  checks.push({
    check: 'Sitemap.xml',
    status: profile.website_meta.has_sitemap ? 'pass' : 'fail',
    importance: 'low',
  });

  const score = calculateWeightedScore(checks, {
    critical: 3, high: 2, medium: 1.5, low: 1,
  });

  return {
    mode: 'local',
    checks,
    score,
  };
}

function calculateWeightedScore(
  checks: WebsiteReadinessCheck[],
  weights: Record<string, number>
): number {
  let totalWeight = 0;
  let passedWeight = 0;
  for (const check of checks) {
    const w = weights[check.importance] ?? 1;
    totalWeight += w;
    if (check.status === 'pass') passedWeight += w;
    else if (check.status === 'partial') passedWeight += w * 0.5;
  }
  return totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferSaaSCategory(name: string, desc: string, keywords: string): string {
  const text = `${name} ${desc} ${keywords}`.toLowerCase();
  if (text.match(/crm|customer relationship/)) return 'CRM';
  if (text.match(/analytic|data insight|bi tool|business intelligence/)) return 'Analytics';
  if (text.match(/project manag|task manag|workflow|todo|sprint/)) return 'Project Management';
  if (text.match(/market|email campaign|seo|ad platform/)) return 'Marketing';
  if (text.match(/hr|recruit|hire|payroll|talent/)) return 'HR Software';
  if (text.match(/account|finance|invoic|billing|bookkeep/)) return 'Accounting';
  if (text.match(/design|figma|ui|ux|prototype/)) return 'Design';
  if (text.match(/devops|deploy|ci\/cd|hosting|cloud/)) return 'DevOps';
  if (text.match(/chat|messag|communicat|slack|team chat/)) return 'Communication';
  if (text.match(/ecommerce|shop|store|checkout|cart/)) return 'E-commerce';
  if (text.match(/secur|vpn|firewall|cybersecur/)) return 'Security';
  if (text.match(/ai|machine learning|llm|gpt|automat/)) return 'AI Tools';
  if (text.match(/video|screenshare|webinar|conferenc/)) return 'Video';
  return 'Software';
}

function inferLocalCategory(name: string, desc: string, services: string): string {
  const text = `${name} ${desc} ${services}`.toLowerCase();
  if (text.match(/restaur|food|eat|pizza|sushi|cafe|bistro|bar/)) return 'Restaurant';
  if (text.match(/hair|salon|barber|beauty|nail|spa|wax/)) return 'Beauty & Salon';
  if (text.match(/gym|fitness|yoga|pilates|sport|crossfit/)) return 'Fitness';
  if (text.match(/dentist|dental|doctor|medical|clinic|health|physio/)) return 'Healthcare';
  if (text.match(/lawyer|attorney|legal|law firm|notary/)) return 'Legal Services';
  if (text.match(/plumb|electric|carpenter|repair|handyman|contruct/)) return 'Home Services';
  if (text.match(/car|auto|vehicle|mechanic|garage|tyres/)) return 'Automotive';
  if (text.match(/hotel|accommodation|b&b|hostel|lodg/)) return 'Accommodation';
  if (text.match(/shop|store|boutique|retail/)) return 'Retail';
  if (text.match(/school|academy|tutoring|educat|training|cours/)) return 'Education';
  return 'Local Business';
}

function detectCurrency(html: string): string {
  if (html.includes('€') || html.toLowerCase().includes('eur')) return 'EUR';
  if (html.includes('£') || html.toLowerCase().includes('gbp')) return 'GBP';
  if (html.includes('zł') || html.toLowerCase().includes('pln')) return 'PLN';
  if (html.includes('$') || html.toLowerCase().includes('usd')) return 'USD';
  return 'USD';
}

function detectPricingModel(html: string): string {
  const lower = html.toLowerCase();
  if (lower.includes('freemium') || lower.includes('free plan')) return 'freemium';
  if (lower.includes('per seat') || lower.includes('per user')) return 'per-seat';
  if (lower.includes('usage') || lower.includes('pay as you go')) return 'usage-based';
  if (lower.includes('lifetime')) return 'one-time';
  return 'subscription';
}

function extractFoundedYear(html: string): string {
  const match = html.match(/(?:founded|established|since|est\.?)\s+(?:in\s+)?(\d{4})/i);
  return match ? match[1] : '';
}
