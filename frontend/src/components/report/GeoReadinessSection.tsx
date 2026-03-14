'use client';

import { BrandProfile, BrandProfileSaaS, WebsiteReadiness, ThirdPartyPresence } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface GeoReadinessSectionProps {
  brandProfile?: BrandProfile;
  websiteReadiness?: WebsiteReadiness;
  thirdParty?: ThirdPartyPresence[];
}

interface GeoCategory {
  title: string;
  description: string;
  score: number; // 0–100
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
  brandProfile: BrandProfile | undefined,
  websiteReadiness: WebsiteReadiness | undefined,
  thirdParty: ThirdPartyPresence[],
): GeoCategory[] {
  const meta = brandProfile?.website_meta;
  const checks = websiteReadiness?.checks ?? [];
  const isSaaS = brandProfile?.mode === 'saas';
  const saasProfile = isSaaS ? (brandProfile as BrandProfileSaaS) : null;

  const findCheck = (keyword: string) =>
    checks.find(c => c.check.toLowerCase().includes(keyword.toLowerCase()));

  // 1. AI Crawler Access
  const crawlerItems: GeoCategory['items'] = [];

  if (meta && 'ai_bots_allowed' in meta) {
    const allowed = (meta as BrandProfileSaaS['website_meta']).ai_bots_allowed;
    crawlerItems.push({
      label: 'AI bots access (robots.txt)',
      status: allowed === 'allowed' ? 'pass' : allowed === 'partial' ? 'partial' : 'fail',
      detail: allowed === 'allowed' ? 'AI crawlers not blocked' : allowed === 'partial' ? 'Some AI bots blocked' : 'AI crawlers blocked or unknown',
    });
  }

  const robotsCheck = findCheck('robots');
  if (robotsCheck) {
    crawlerItems.push({ label: robotsCheck.check, status: robotsCheck.status, detail: robotsCheck.detail });
  }

  if (meta && 'has_llms_txt' in meta) {
    const hasLlms = (meta as BrandProfileSaaS['website_meta']).has_llms_txt;
    crawlerItems.push({
      label: 'llms.txt file',
      status: hasLlms ? 'pass' : 'fail',
      detail: hasLlms ? 'AI models can read brand context directly' : 'Missing — AI has no direct brand context file',
    });
  }

  const llmsCheck = findCheck('llms.txt');
  if (llmsCheck && !crawlerItems.find(i => i.label === 'llms.txt file')) {
    crawlerItems.push({ label: llmsCheck.check, status: llmsCheck.status, detail: llmsCheck.detail });
  }

  // 2. AI Discoverability
  const discoverabilityItems: GeoCategory['items'] = [];

  if (meta && 'has_sitemap' in meta) {
    const hasSitemap = (meta as BrandProfileSaaS['website_meta']).has_sitemap;
    discoverabilityItems.push({
      label: 'XML sitemap',
      status: hasSitemap ? 'pass' : 'fail',
      detail: hasSitemap ? 'Sitemap detected' : 'No sitemap found — crawlers may miss pages',
    });
  }

  discoverabilityItems.push({
    label: 'Schema.org markup',
    status: meta?.has_schema_org ? 'pass' : 'fail',
    detail: meta?.has_schema_org ? 'Structured data present' : 'No schema markup — AI cannot parse entities',
  });

  const sslCheck = findCheck('SSL') || findCheck('HTTPS');
  if (sslCheck) {
    discoverabilityItems.push({ label: sslCheck.check, status: sslCheck.status, detail: sslCheck.detail });
  } else if (meta?.ssl !== undefined) {
    discoverabilityItems.push({
      label: 'HTTPS / SSL',
      status: meta.ssl ? 'pass' : 'fail',
      detail: meta.ssl ? 'Secure connection' : 'No SSL — affects trust signals',
    });
  }

  // 3. Schema Markup Quality
  const schemaItems: GeoCategory['items'] = [];

  const schemaTypes = saasProfile?.website_meta.schema_types_found ?? [];
  const localMeta = !isSaaS ? (meta as { has_local_business_schema?: boolean } | undefined) : null;

  schemaItems.push({
    label: 'Schema.org types found',
    status: schemaTypes.length >= 3 ? 'pass' : schemaTypes.length >= 1 ? 'partial' : 'fail',
    detail: schemaTypes.length > 0 ? schemaTypes.slice(0, 5).join(', ') : 'No schema types detected',
  });

  if (!isSaaS && localMeta) {
    schemaItems.push({
      label: 'LocalBusiness schema',
      status: localMeta.has_local_business_schema ? 'pass' : 'fail',
      detail: localMeta.has_local_business_schema
        ? 'LocalBusiness schema present'
        : 'Missing — critical for local AI visibility',
    });
  }

  if (isSaaS) {
    const orgSchema = schemaTypes.includes('Organization') || schemaTypes.includes('SoftwareApplication');
    schemaItems.push({
      label: 'Organization / Product schema',
      status: orgSchema ? 'pass' : 'fail',
      detail: orgSchema ? 'Found in schema types' : 'Add Organization or SoftwareApplication schema',
    });
  }

  const faqSchema = schemaTypes.includes('FAQPage') || schemaTypes.includes('FAQ');
  schemaItems.push({
    label: 'FAQ schema',
    status: faqSchema ? 'pass' : 'fail',
    detail: faqSchema ? 'FAQ schema present' : 'Add FAQPage schema for Q&A visibility',
  });

  // 4. Content Extractability
  const contentItems: GeoCategory['items'] = [];

  if (meta && 'has_faq' in meta) {
    contentItems.push({
      label: 'FAQ / Q&A content',
      status: meta.has_faq ? 'pass' : 'fail',
      detail: meta.has_faq ? 'FAQ section detected' : 'No FAQ — AI models extract from Q&A structures',
    });
  }

  if (isSaaS && saasProfile) {
    contentItems.push({
      label: 'Pricing page',
      status: saasProfile.website_meta.has_pricing_page ? 'pass' : 'fail',
      detail: saasProfile.website_meta.has_pricing_page
        ? 'Pricing information accessible'
        : 'No pricing page — AI cannot answer pricing queries',
    });
  }

  if (!isSaaS && localMeta && 'nap_consistent' in (localMeta ?? {})) {
    const nap = (localMeta as { nap_consistent?: boolean }).nap_consistent;
    contentItems.push({
      label: 'NAP consistency (Name, Address, Phone)',
      status: nap ? 'pass' : 'fail',
      detail: nap ? 'Name, address, phone consistent' : 'Inconsistent NAP hurts local AI responses',
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
    label: 'Third-party listings',
    status: presentPlatforms.length >= 3 ? 'pass' : presentPlatforms.length >= 1 ? 'partial' : 'fail',
    detail: presentPlatforms.length > 0
      ? `Present on: ${presentPlatforms.slice(0, 4).map(p => p.platform).join(', ')}`
      : `Not found on ${missingPlatforms.slice(0, 3).map(p => p.platform).join(', ')}`,
  });

  const ratingPlatforms = thirdParty.filter(p => p.rating && p.rating > 0);
  eeatItems.push({
    label: 'Reviews & ratings',
    status: ratingPlatforms.length > 0 ? 'pass' : missingPlatforms.length > 0 ? 'fail' : 'partial',
    detail: ratingPlatforms.length > 0
      ? ratingPlatforms.map(p => `${p.platform}: ${p.rating}★`).join(', ')
      : 'No verified ratings found on tracked platforms',
  });

  const hasAboutCheck = findCheck('About page') || findCheck('About');
  eeatItems.push({
    label: 'About / Author content',
    status: hasAboutCheck ? hasAboutCheck.status : 'partial',
    detail: hasAboutCheck?.detail ?? 'About page presence supports expertise signals',
  });

  return [
    { title: 'AI Crawler Access', description: 'Can AI bots read and index your site?', score: 0, items: crawlerItems },
    { title: 'AI Discoverability', description: 'How well can AI find and understand your brand?', score: 0, items: discoverabilityItems },
    { title: 'Schema Markup Quality', description: 'Structured data AI models rely on for entities', score: 0, items: schemaItems },
    { title: 'Content Extractability', description: 'Can AI extract key facts, pricing, and Q&A?', score: 0, items: contentItems },
    { title: 'E-E-A-T Signals', description: 'Experience, Expertise, Authority, Trust signals', score: 0, items: eeatItems },
  ].map(cat => ({ ...cat, score: categoryScore(cat.items) }));
}

export function GeoReadinessSection({ brandProfile, websiteReadiness, thirdParty = [] }: GeoReadinessSectionProps) {
  const categories = buildCategories(brandProfile, websiteReadiness, thirdParty);
  const overallScore = categories.length > 0
    ? Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length)
    : 0;

  return (
    <section id="geo-readiness" className="scroll-mt-24 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-gray-900">GEO Readiness Audit</h2>
          <p className="text-sm text-gray-400 mt-1">
            Generative Engine Optimization — how ready is your site for AI-powered search
          </p>
        </div>
        <div className="text-center shrink-0">
          <div className={`text-4xl font-bold ${overallScore >= 70 ? 'text-green-600' : overallScore >= 45 ? 'text-yellow-600' : 'text-red-600'}`}>
            {overallScore}
          </div>
          <div className="text-xs text-gray-400">GEO Score</div>
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
                <p className="text-xs text-gray-400 italic">No data available</p>
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
