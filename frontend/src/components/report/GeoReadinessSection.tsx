'use client';

import { AnyBrandProfile, BrandProfileSaaS, WebsiteReadiness, ThirdPartyPresence } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getT, ReportTranslations } from '@/lib/reportTranslations';

interface GeoReadinessSectionProps {
  brandProfile?: AnyBrandProfile;
  websiteReadiness?: WebsiteReadiness;
  thirdParty?: ThirdPartyPresence[];
  language?: string;
}

interface GeoCategory {
  title: string;
  description: string;
  score: number;
  items: { label: string; status: 'pass' | 'partial' | 'fail'; detail?: string }[];
}

function statusIcon(status: 'pass' | 'partial' | 'fail') {
  if (status === 'pass') return <span className="text-green-500">✓</span>;
  if (status === 'partial') return <span className="text-yellow-500">◑</span>;
  return <span className="text-red-400">✗</span>;
}

function categoryScore(items: GeoCategory['items']): number {
  if (items.length === 0) return 0;
  const pts = items.reduce((s, i) => s + (i.status === 'pass' ? 1 : i.status === 'partial' ? 0.5 : 0), 0);
  return Math.round((pts / items.length) * 100);
}

function scoreVariant(score: number): 'success' | 'info' | 'warning' | 'error' {
  if (score >= 70) return 'success';
  if (score >= 45) return 'info';
  if (score >= 20) return 'warning';
  return 'error';
}

function buildCategories(
  brandProfile: AnyBrandProfile | undefined,
  websiteReadiness: WebsiteReadiness | undefined,
  thirdParty: ThirdPartyPresence[],
  t: ReportTranslations,
): GeoCategory[] {
  const p = brandProfile as any;
  const meta = p?.website_meta as BrandProfileSaaS['website_meta'] | undefined;
  const checks = websiteReadiness?.checks ?? [];
  const isSaaS = p?.mode === 'saas' || (p?.business_type && !['local_business', 'restaurant'].includes(p.business_type));
  const saasProfile = isSaaS ? (p as BrandProfileSaaS) : null;

  const findCheck = (keyword: string) =>
    checks.find(c => c.check.toLowerCase().includes(keyword.toLowerCase()));

  // 1. AI Crawler Access
  const crawlerItems: GeoCategory['items'] = [];

  if (meta && 'ai_bots_allowed' in meta) {
    const allowed = (meta as BrandProfileSaaS['website_meta']).ai_bots_allowed;
    crawlerItems.push({
      label: t.aiBotsAccess,
      status: allowed === 'allowed' ? 'pass' : allowed === 'partial' ? 'partial' : 'fail',
      detail: allowed === 'allowed' ? t.aiCrawlersNotBlocked : allowed === 'partial' ? t.someAIBotsBlocked : t.aiCrawlersBlocked,
    });
  }

  const robotsCheck = findCheck('robots');
  if (robotsCheck) {
    crawlerItems.push({ label: robotsCheck.check, status: robotsCheck.status, detail: robotsCheck.detail });
  }

  if (meta && 'has_llms_txt' in meta) {
    const hasLlms = (meta as BrandProfileSaaS['website_meta']).has_llms_txt;
    crawlerItems.push({
      label: t.llmsTxt,
      status: hasLlms ? 'pass' : 'fail',
      detail: hasLlms ? t.llmsTxtPresent : t.llmsTxtMissing,
    });
  }

  const llmsCheck = findCheck('llms.txt');
  if (llmsCheck && !crawlerItems.find(i => i.label === t.llmsTxt)) {
    crawlerItems.push({ label: llmsCheck.check, status: llmsCheck.status, detail: llmsCheck.detail });
  }

  // 2. AI Discoverability
  const discoverabilityItems: GeoCategory['items'] = [];

  if (meta && 'has_sitemap' in meta) {
    const hasSitemap = (meta as BrandProfileSaaS['website_meta']).has_sitemap;
    discoverabilityItems.push({
      label: t.xmlSitemap,
      status: hasSitemap ? 'pass' : 'fail',
      detail: hasSitemap ? t.sitemapDetected : t.noSitemap,
    });
  }

  discoverabilityItems.push({
    label: t.schemaOrgMarkup,
    status: meta?.has_schema_org ? 'pass' : 'fail',
    detail: meta?.has_schema_org ? t.structuredDataPresent : t.noSchemaMarkup,
  });

  const sslCheck = findCheck('SSL') || findCheck('HTTPS');
  if (sslCheck) {
    discoverabilityItems.push({ label: sslCheck.check, status: sslCheck.status, detail: sslCheck.detail });
  } else if (meta?.ssl !== undefined) {
    discoverabilityItems.push({
      label: t.httpsSsl,
      status: meta.ssl ? 'pass' : 'fail',
      detail: meta.ssl ? t.secureConnection : t.noSSL,
    });
  }

  // 3. Schema Markup Quality
  const schemaItems: GeoCategory['items'] = [];
  const schemaTypes = saasProfile?.website_meta.schema_types_found ?? [];
  const localMeta = !isSaaS ? (meta as { has_local_business_schema?: boolean } | undefined) : null;

  schemaItems.push({
    label: t.schemaTypesFound,
    status: schemaTypes.length >= 3 ? 'pass' : schemaTypes.length >= 1 ? 'partial' : 'fail',
    detail: schemaTypes.length > 0 ? schemaTypes.slice(0, 5).join(', ') : t.noSchemaTypes,
  });

  if (!isSaaS && localMeta) {
    schemaItems.push({
      label: t.localBusinessSchema,
      status: localMeta.has_local_business_schema ? 'pass' : 'fail',
      detail: localMeta.has_local_business_schema ? t.localBusinessSchemaPresent : t.localBusinessSchemaMissing,
    });
  }

  if (isSaaS) {
    const orgSchema = schemaTypes.includes('Organization') || schemaTypes.includes('SoftwareApplication');
    schemaItems.push({
      label: t.orgProductSchema,
      status: orgSchema ? 'pass' : 'fail',
      detail: orgSchema ? t.orgSchemaFound : t.orgSchemaAdd,
    });
  }

  const faqSchema = schemaTypes.includes('FAQPage') || schemaTypes.includes('FAQ');
  schemaItems.push({
    label: t.faqSchema,
    status: faqSchema ? 'pass' : 'fail',
    detail: faqSchema ? t.faqSchemaPresent : t.faqSchemaAdd,
  });

  // 4. Content Extractability
  const contentItems: GeoCategory['items'] = [];

  if (meta && 'has_faq' in meta) {
    contentItems.push({
      label: t.faqContent,
      status: meta.has_faq ? 'pass' : 'fail',
      detail: meta.has_faq ? t.faqDetected : t.noFaq,
    });
  }

  if (isSaaS && saasProfile) {
    contentItems.push({
      label: t.pricingPage,
      status: saasProfile.website_meta.has_pricing_page ? 'pass' : 'fail',
      detail: saasProfile.website_meta.has_pricing_page ? t.pricingAccessible : t.noPricingPage,
    });
  }

  if (!isSaaS && localMeta && 'nap_consistent' in (localMeta ?? {})) {
    const nap = (localMeta as { nap_consistent?: boolean }).nap_consistent;
    contentItems.push({
      label: t.napConsistency,
      status: nap ? 'pass' : 'fail',
      detail: nap ? t.napConsistent : t.napInconsistent,
    });
  }

  const aboutCheck = findCheck('About') || findCheck('about');
  if (aboutCheck) {
    contentItems.push({ label: aboutCheck.check, status: aboutCheck.status, detail: aboutCheck.detail });
  }

  const structuredCheck = findCheck('structured') || findCheck('content');
  if (structuredCheck) {
    contentItems.push({ label: structuredCheck.check, status: structuredCheck.status, detail: structuredCheck.detail });
  }

  // 5. E-E-A-T Signals
  const eeatItems: GeoCategory['items'] = [];

  const presentPlatforms = thirdParty.filter(p => p.status === 'present');
  const missingPlatforms = thirdParty.filter(p => p.status === 'missing');

  eeatItems.push({
    label: t.thirdPartyListings,
    status: presentPlatforms.length >= 3 ? 'pass' : presentPlatforms.length >= 1 ? 'partial' : 'fail',
    detail: presentPlatforms.length > 0
      ? `${t.presentOn}${presentPlatforms.slice(0, 4).map(p => p.platform).join(', ')}`
      : `${t.notFoundOn}${missingPlatforms.slice(0, 3).map(p => p.platform).join(', ')}`,
  });

  const ratingPlatforms = thirdParty.filter(p => p.rating && p.rating > 0);
  eeatItems.push({
    label: t.reviewsRatings,
    status: ratingPlatforms.length > 0 ? 'pass' : missingPlatforms.length > 0 ? 'fail' : 'partial',
    detail: ratingPlatforms.length > 0
      ? ratingPlatforms.map(p => `${p.platform}: ${p.rating}★`).join(', ')
      : t.noRatings,
  });

  const hasAboutCheck = findCheck('About page') || findCheck('About');
  eeatItems.push({
    label: t.aboutContent,
    status: hasAboutCheck ? hasAboutCheck.status : 'partial',
    detail: hasAboutCheck?.detail ?? 'About page presence supports expertise signals',
  });

  return [
    { title: t.aiCrawlerAccess, description: t.aiCrawlerAccessDesc, score: 0, items: crawlerItems },
    { title: t.aiDiscoverability, description: t.aiDiscoverabilityDesc, score: 0, items: discoverabilityItems },
    { title: t.schemaMarkupQuality, description: t.schemaMarkupQualityDesc, score: 0, items: schemaItems },
    { title: t.contentExtractability, description: t.contentExtractabilityDesc, score: 0, items: contentItems },
    { title: t.eeatSignals, description: t.eeatDesc, score: 0, items: eeatItems },
  ].map(cat => ({ ...cat, score: categoryScore(cat.items) }));
}

export function GeoReadinessSection({ brandProfile, websiteReadiness, thirdParty = [], language }: GeoReadinessSectionProps) {
  const t = getT(language);
  const categories = buildCategories(brandProfile, websiteReadiness, thirdParty, t);
  const overallScore = categories.length > 0
    ? Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length)
    : 0;

  return (
    <section id="geo-readiness" className="scroll-mt-24 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-gray-900">{t.geoReadinessAudit}</h2>
          <p className="text-sm text-gray-400 mt-1">{t.geoSubtitle}</p>
        </div>
        <div className="text-center shrink-0">
          <div className={`text-4xl font-bold ${overallScore >= 70 ? 'text-green-600' : overallScore >= 45 ? 'text-yellow-600' : 'text-red-600'}`}>
            {overallScore}
          </div>
          <div className="text-xs text-gray-400">{t.geoScore}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <Card key={cat.title}>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{cat.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>
                </div>
                <Badge variant={scoreVariant(cat.score)}>{cat.score}%</Badge>
              </div>

              {cat.items.length === 0 ? (
                <p className="text-xs text-gray-400 italic">{t.noData}</p>
              ) : (
                <div className="space-y-2">
                  {cat.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="shrink-0 text-sm mt-0.5 w-4 text-center">{statusIcon(item.status)}</span>
                      <div>
                        <div className="text-sm text-gray-700">{item.label}</div>
                        {item.detail && <div className="text-xs text-gray-400">{item.detail}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
