import { BrandProfileSaaS, ChecklistResult, ChecklistEvaluation, ThirdPartyPresence } from '../types';
import { SAAS_CHECKLIST, ChecklistItem } from '../config/saasChecklist';

// ─── Importance weights (mirrors websiteReadiness scorer) ─────────────────────

const WEIGHTS: Record<string, number> = {
  critical: 3,
  high: 2,
  medium: 1.5,
  low: 1,
};

// ─── Third-party platform mapping ────────────────────────────────────────────

const THIRD_PARTY_MAP: Record<string, string[]> = {
  offsite_01: ['G2'],
  offsite_02: ['Trustpilot'],
  offsite_03: ['Capterra', 'Software Advice'],
  offsite_04: ['Product Hunt', 'ProductHunt'],
  offsite_05: ['Crunchbase'],
};

// ─── Auto-detection: maps checklist ID → website_meta field or logic ─────────

function evaluateAutoItem(
  item: ChecklistItem,
  meta: BrandProfileSaaS['website_meta']
): ChecklistResult {
  let status: ChecklistResult['status'] = 'fail';
  let detail: string | undefined;

  switch (item.id) {
    // AI Access
    case 'ai_01':
      status = meta.has_llms_txt ? 'pass' : 'fail';
      detail = meta.has_llms_txt ? '/llms.txt found' : '/llms.txt not found';
      break;
    case 'ai_02':
      if (meta.ai_bots_allowed === 'allowed') { status = 'pass'; detail = 'AI bots allowed'; }
      else if (meta.ai_bots_allowed === 'partial') { status = 'partial'; detail = 'Some AI bots blocked'; }
      else if (meta.ai_bots_allowed === 'blocked') { status = 'fail'; detail = 'AI bots blocked'; }
      else { status = 'partial'; detail = 'robots.txt not found — AI bot access unknown'; }
      break;
    case 'ai_03':
      status = meta.has_sitemap ? 'pass' : 'fail';
      detail = meta.has_sitemap ? 'sitemap.xml found' : 'sitemap.xml not found';
      break;
    case 'ai_04':
      // Partial — we can't fully verify SSR without executing JS
      status = 'partial';
      detail = 'Cannot fully verify SSR without JS execution — manual check recommended';
      break;

    // Technical
    case 'tech_01':
      status = meta.ssl ? 'pass' : 'fail';
      detail = meta.ssl ? 'HTTPS enabled' : 'Site is not using HTTPS';
      break;
    case 'tech_02':
      status = meta.has_open_graph ? 'pass' : 'fail';
      detail = meta.has_open_graph ? 'Open Graph tags detected' : 'No og:title meta tag found';
      break;
    case 'tech_03':
      status = meta.has_canonical ? 'pass' : 'fail';
      detail = meta.has_canonical ? 'Canonical tag found' : 'No rel=canonical tag found on homepage';
      break;
    case 'tech_04':
      status = meta.has_date_modified ? 'pass' : 'fail';
      detail = meta.has_date_modified ? 'dateModified signal detected' : 'No dateModified in JSON-LD or meta tags';
      break;

    // Entity
    case 'entity_01':
      status = meta.has_schema_org ? 'pass' : 'fail';
      detail = meta.has_schema_org
        ? `Schema.org found: ${meta.schema_types_found.join(', ')}`
        : 'No Schema.org markup found';
      break;
    case 'entity_02':
      status = meta.has_about_page ? 'pass' : 'fail';
      detail = meta.has_about_page ? '/about page found' : 'No /about page found';
      break;
    case 'entity_03':
      status = meta.has_linkedin ? 'pass' : 'fail';
      detail = meta.has_linkedin ? 'LinkedIn link found on site' : 'No LinkedIn link found on site';
      break;

    // Content
    case 'content_01':
      status = meta.has_faq ? 'pass' : 'fail';
      detail = meta.has_faq ? 'FAQ content detected' : 'No FAQ page or section found';
      break;
    case 'content_02':
      status = meta.has_blog ? 'pass' : 'fail';
      detail = meta.has_blog ? 'Blog/resources section found' : 'No blog or resources section found';
      break;
    case 'content_03':
      status = meta.has_case_studies ? 'pass' : 'fail';
      detail = meta.has_case_studies ? 'Case studies / customers page found' : 'No case studies or customer stories page found';
      break;
    case 'content_04':
      status = meta.has_comparison_page ? 'pass' : 'fail';
      detail = meta.has_comparison_page ? 'Comparison / alternatives page found' : 'No comparison or alternatives page found';
      break;
    case 'content_05':
      status = meta.has_press_page ? 'pass' : 'fail';
      detail = meta.has_press_page ? 'Press / media page found' : 'No press or media page found';
      break;
    case 'content_06':
      status = meta.has_testimonials ? 'pass' : 'fail';
      detail = meta.has_testimonials ? 'Testimonials section detected' : 'No customer testimonials section found';
      break;

    // Conversion
    case 'conv_01':
      status = meta.has_pricing_page ? 'pass' : 'fail';
      detail = meta.has_pricing_page ? 'Pricing page found' : 'No public pricing page found';
      break;
    case 'conv_02':
      if (meta.has_free_trial_cta || meta.has_demo_cta) {
        status = 'pass';
        const found = [meta.has_free_trial_cta && 'free trial CTA', meta.has_demo_cta && 'demo CTA']
          .filter(Boolean).join(' and ');
        detail = `Found: ${found}`;
      } else {
        status = 'fail';
        detail = 'No free trial or demo CTA found on homepage';
      }
      break;
    case 'conv_03':
      status = meta.has_contact_page ? 'pass' : 'fail';
      detail = meta.has_contact_page ? '/contact page found' : 'No /contact page found';
      break;

    // Multilingual — only applicable if site appears multilingual
    case 'multi_01': {
      const isMultilingual = (meta.languages_detected?.length ?? 0) > 1;
      if (!isMultilingual) {
        status = 'not_applicable';
        detail = 'Site appears to be single-language';
      } else {
        status = meta.has_hreflang ? 'pass' : 'fail';
        detail = meta.has_hreflang ? 'hreflang tags detected' : 'Multilingual site without hreflang tags';
      }
      break;
    }
    case 'multi_02': {
      const isMultilingual = (meta.languages_detected?.length ?? 0) > 1;
      if (!isMultilingual) {
        status = 'not_applicable';
        detail = 'Site appears to be single-language';
      } else {
        // Check if URL contains language path (hreflang presence implies it)
        status = meta.has_hreflang ? 'pass' : 'partial';
        detail = meta.has_hreflang
          ? 'Separate language URLs detected via hreflang'
          : 'Multilingual site — verify URL structure is path-based (/en/, /pl/) not IP-based';
      }
      break;
    }

    default:
      status = 'partial';
      detail = 'Manual verification required';
  }

  return { item, status, detail };
}

// ─── Third-party detection ────────────────────────────────────────────────────

function evaluateThirdPartyItem(
  item: ChecklistItem,
  thirdParty: ThirdPartyPresence[]
): ChecklistResult {
  const platformNames = THIRD_PARTY_MAP[item.id] ?? [];
  const match = thirdParty.find(p =>
    platformNames.some(name => p.platform.toLowerCase().includes(name.toLowerCase()))
  );

  if (!match) {
    return {
      item,
      status: 'fail',
      detail: `${platformNames[0] ?? item.title} not found in third-party check`,
    };
  }

  return {
    item,
    status: match.status === 'present' ? 'pass' : 'fail',
    detail: match.status === 'present'
      ? `${match.platform} profile found`
      : `${match.platform} profile not found`,
  };
}

// ─── Main evaluator ───────────────────────────────────────────────────────────

export function evaluateChecklist(
  profile: BrandProfileSaaS,
  thirdParty: ThirdPartyPresence[]
): ChecklistEvaluation {
  const meta = profile.website_meta;
  const results: ChecklistResult[] = [];

  for (const item of SAAS_CHECKLIST) {
    let result: ChecklistResult;

    if (item.detection === 'third_party') {
      result = evaluateThirdPartyItem(item, thirdParty);
    } else {
      result = evaluateAutoItem(item, meta);
    }

    results.push(result);
  }

  const applicable = results.filter(r => r.status !== 'not_applicable');
  const gaps = results.filter(r => r.status === 'fail' || r.status === 'partial');
  const passed = applicable.filter(r => r.status === 'pass').length;
  const total = applicable.length;

  // Weighted score
  let totalWeight = 0;
  let passedWeight = 0;
  for (const r of applicable) {
    const w = WEIGHTS[r.item.importance] ?? 1;
    totalWeight += w;
    if (r.status === 'pass') passedWeight += w;
    else if (r.status === 'partial') passedWeight += w * 0.5;
  }
  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

  return { results, gaps, score, passed, total };
}
