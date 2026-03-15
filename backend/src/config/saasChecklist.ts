// ─── SaaS AI Visibility Checklist ─────────────────────────────────────────────
//
// Based on: GEO / AEO / LLMO / AISO research (Princeton, IIT Delhi, Georgia Tech)
// + official docs from Google, Bing, OpenAI, Anthropic (March 2026)
//
// Detection modes:
//   'auto'        — scraper detects reliably via HEAD request or HTML parsing
//   'partial'     — scraper gives a signal but may have false positives/negatives
//   'third_party' — result comes from thirdPartyChecker (already runs in pipeline)

export type ChecklistCategory =
  | 'ai_access'    // AI-specific crawlability & discoverability
  | 'technical'    // Core technical hygiene
  | 'entity'       // Brand entity & E-E-A-T signals
  | 'content'      // Content quality & format
  | 'conversion'   // Conversion & trust signals
  | 'off_site'     // External presence & citations
  | 'multilingual'; // International / multi-language

export type DetectionMethod = 'auto' | 'partial' | 'third_party';

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  title: string;
  why: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  effort: 'quick_win' | 'moderate' | 'significant';
  detection: DetectionMethod;
  fix: string;
}

export const SAAS_CHECKLIST: ChecklistItem[] = [

  // ── AI Access ───────────────────────────────────────────────────────────────

  {
    id: 'ai_01',
    category: 'ai_access',
    title: 'llms.txt file',
    why: 'Provides AI models with direct, structured brand context — reduces hallucinations and improves citation accuracy without relying on HTML parsing',
    importance: 'high',
    effort: 'quick_win',
    detection: 'auto',
    fix: 'Create /llms.txt with brand description, product list, key facts, pricing overview, and links to key pages. Keep it updated when products change.',
  },
  {
    id: 'ai_02',
    category: 'ai_access',
    title: 'AI search bots allowed in robots.txt',
    why: 'OAI-SearchBot, ClaudeBot, and PerplexityBot must crawl your site to include it in AI-powered search citations. Blocking them = invisible in AI answers.',
    importance: 'high',
    effort: 'quick_win',
    detection: 'auto',
    fix: 'In robots.txt explicitly allow OAI-SearchBot, ClaudeBot, PerplexityBot, GoogleOther. You can separately block training bots (GPTBot, Google-Extended) if protecting IP.',
  },
  {
    id: 'ai_03',
    category: 'ai_access',
    title: 'XML Sitemap present and submitted',
    why: 'A complete sitemap ensures all key pages are discovered and indexed by search engines and AI crawlers. Missing sitemap = pages that may never be cited.',
    importance: 'medium',
    effort: 'quick_win',
    detection: 'auto',
    fix: 'Create sitemap.xml at /sitemap.xml, submit to Google Search Console and Bing Webmaster Tools, and configure auto-regeneration on publish.',
  },
  {
    id: 'ai_04',
    category: 'ai_access',
    title: 'Content rendered server-side (SSR)',
    why: 'AI crawlers often skip JavaScript execution — if content loads client-side only, the page appears empty. Critical for SPA/React/Next.js apps.',
    importance: 'high',
    effort: 'significant',
    detection: 'partial',
    fix: 'Ensure all key page content is present in the initial HTML response. Use SSR or SSG — not client-side rendering only. Verify with curl or "View Source".',
  },

  // ── Technical ───────────────────────────────────────────────────────────────

  {
    id: 'tech_01',
    category: 'technical',
    title: 'HTTPS / SSL enabled',
    why: 'SSL is a baseline trust signal. Non-HTTPS pages are deprioritized in search rankings and ignored by some AI crawlers.',
    importance: 'medium',
    effort: 'quick_win',
    detection: 'auto',
    fix: 'Enable HTTPS across your entire domain and redirect all HTTP traffic to HTTPS with a 301 redirect.',
  },
  {
    id: 'tech_02',
    category: 'technical',
    title: 'Open Graph meta tags',
    why: 'OG tags (og:title, og:description, og:image) control how your brand appears in AI-parsed previews and help models extract consistent brand metadata.',
    importance: 'medium',
    effort: 'quick_win',
    detection: 'auto',
    fix: 'Add og:title, og:description, og:image, og:site_name and og:url to every key page. Keep og:description under 200 characters and factually accurate.',
  },
  {
    id: 'tech_03',
    category: 'technical',
    title: 'Canonical tags present',
    why: 'Without canonicals, duplicate URLs split crawl authority — AI may cite an incorrect or outdated version of your page.',
    importance: 'medium',
    effort: 'quick_win',
    detection: 'auto',
    fix: 'Add rel=canonical to every page pointing to the preferred URL version. Resolve www/non-www and http/https duplicates with 301 redirects.',
  },
  {
    id: 'tech_04',
    category: 'technical',
    title: 'Content freshness signals (dateModified)',
    why: 'AI systems have a strong recency bias — content older than 3 months loses citation priority rapidly. Visible update dates are a key freshness signal.',
    importance: 'medium',
    effort: 'quick_win',
    detection: 'partial',
    fix: 'Add dateModified to JSON-LD Article/BlogPosting schemas. Display "Last updated: [date]" visibly on each content page. Update key pages every 30–90 days.',
  },

  // ── Entity ──────────────────────────────────────────────────────────────────

  {
    id: 'entity_01',
    category: 'entity',
    title: 'Organization Schema.org markup',
    why: 'Organization schema establishes brand identity for AI — name, domain, category, contact and social links — reducing entity confusion and hallucinations.',
    importance: 'high',
    effort: 'moderate',
    detection: 'auto',
    fix: 'Add JSON-LD Organization schema to homepage with name, url, logo, sameAs (LinkedIn, Crunchbase, G2), foundingDate, and contactPoint.',
  },
  {
    id: 'entity_02',
    category: 'entity',
    title: 'About / Team page',
    why: 'E-E-A-T requires demonstrable expertise. An About page with named team members and credentials is a core Authoritativeness signal used by AI.',
    importance: 'high',
    effort: 'moderate',
    detection: 'auto',
    fix: 'Create a detailed About page with company story, founding year, team bios with credentials, and mission statement. Link it from the main navigation.',
  },
  {
    id: 'entity_03',
    category: 'entity',
    title: 'LinkedIn company page linked from site',
    why: 'LinkedIn is a primary sameAs signal for brand entity verification by AI. It is frequently cited as a trust source in AI-generated brand summaries.',
    importance: 'medium',
    effort: 'quick_win',
    detection: 'auto',
    fix: 'Create and maintain a LinkedIn company page. Add its URL to Organization schema sameAs and link from your website footer or contact page.',
  },

  // ── Content ─────────────────────────────────────────────────────────────────

  {
    id: 'content_01',
    category: 'content',
    title: 'FAQ page or FAQ section',
    why: 'FAQ content in Q&A format directly matches how AI models process queries. FAQPage schema significantly increases citation rate for informational queries.',
    importance: 'high',
    effort: 'moderate',
    detection: 'auto',
    fix: 'Add FAQ section to homepage AND create a dedicated /faq page. Use FAQPage JSON-LD schema. Cover 15–20 real questions using exact language customers use.',
  },
  {
    id: 'content_02',
    category: 'content',
    title: 'Blog / Resources section',
    why: 'Regular expert content builds topical authority. AI models cite sites with comprehensive topic coverage — query fan-out means you need depth, not just one page.',
    importance: 'high',
    effort: 'significant',
    detection: 'auto',
    fix: 'Start a blog or resources section. Publish 1–2 articles per week. Use answer-first format: direct answer in first 40–60 words, then data, then detail.',
  },
  {
    id: 'content_03',
    category: 'content',
    title: 'Case studies / Customer stories',
    why: '~74% of AI citations come from evidence-based content. Case studies provide Experience signals (first E in E-E-A-T) and are strongly preferred over marketing copy.',
    importance: 'high',
    effort: 'significant',
    detection: 'auto',
    fix: 'Create 3–5 detailed case studies with measurable results. Include customer name, problem, solution, and specific metrics. Add to /case-studies or /customers.',
  },
  {
    id: 'content_04',
    category: 'content',
    title: 'Comparison / Alternatives page',
    why: 'AI models frequently handle comparison queries ("X vs Y", "alternatives to X"). A dedicated page lets you control the narrative and capture that traffic.',
    importance: 'medium',
    effort: 'moderate',
    detection: 'auto',
    fix: 'Create comparison pages (e.g., /compare/brand-vs-competitor). Use HTML tables — not images. AI extracts tabular data at 40% higher rate than prose.',
  },
  {
    id: 'content_05',
    category: 'content',
    title: 'Press / Media mentions page',
    why: 'Media mentions build the Authoritativeness component of E-E-A-T. AI models use press coverage as a trust proxy when evaluating brand credibility.',
    importance: 'low',
    effort: 'moderate',
    detection: 'auto',
    fix: 'Create a /press page listing media mentions, awards, and publications. Include logos, article titles, dates and links. Even 3–5 mentions help.',
  },
  {
    id: 'content_06',
    category: 'content',
    title: 'Customer testimonials on site',
    why: '82% of AI citations for product queries come from review/social-proof content. On-site testimonials with specifics support the Trust component of E-E-A-T.',
    importance: 'medium',
    effort: 'moderate',
    detection: 'auto',
    fix: 'Add a testimonials section to homepage or a dedicated reviews page. Include customer name, company, role, and specific outcome achieved.',
  },

  // ── Conversion ──────────────────────────────────────────────────────────────

  {
    id: 'conv_01',
    category: 'conversion',
    title: 'Public pricing page',
    why: 'AI models cannot answer pricing queries without publicly accessible data. Pricing queries are the highest-intent category and drive purchase decisions.',
    importance: 'high',
    effort: 'moderate',
    detection: 'auto',
    fix: 'Make pricing page publicly accessible (no login required). Include all plan names, prices, billing periods, key limits, and what is included in each tier.',
  },
  {
    id: 'conv_02',
    category: 'conversion',
    title: 'Free trial or demo CTA',
    why: 'AI models recommending tools prefer low-barrier entry points. "Free trial available" is a positive recommendation signal that increases citation likelihood.',
    importance: 'medium',
    effort: 'quick_win',
    detection: 'auto',
    fix: 'Add a prominent "Start free trial" or "Book a demo" CTA on homepage. Ensure the text is in HTML (not only rendered in images or canvas elements).',
  },
  {
    id: 'conv_03',
    category: 'conversion',
    title: 'Contact page',
    why: 'Contact information signals Trustworthiness (the T in E-E-A-T). Missing contact details reduce confidence of both AI systems and potential customers.',
    importance: 'medium',
    effort: 'quick_win',
    detection: 'auto',
    fix: 'Create a /contact page with email address, physical address if applicable, and a contact form. Add this information to Organization schema contactPoint.',
  },

  // ── Off-site ────────────────────────────────────────────────────────────────

  {
    id: 'offsite_01',
    category: 'off_site',
    title: 'G2 listing with reviews',
    why: '82% of AI citations for product queries come from review aggregators. G2 is the most-cited B2B software review platform in AI recommendations.',
    importance: 'critical',
    effort: 'moderate',
    detection: 'third_party',
    fix: 'Claim your G2 profile, complete all sections with accurate data, and implement a customer review collection process. Target 10+ reviews for AI inclusion.',
  },
  {
    id: 'offsite_02',
    category: 'off_site',
    title: 'Trustpilot listing with reviews',
    why: 'Trustpilot is widely indexed and cited by AI models as an independent trust signal. Even 5–10 reviews significantly improve AI mention rate.',
    importance: 'high',
    effort: 'moderate',
    detection: 'third_party',
    fix: 'Create a Trustpilot profile and send review invitations to existing customers. Respond to all reviews — positive and negative — to improve engagement signals.',
  },
  {
    id: 'offsite_03',
    category: 'off_site',
    title: 'Capterra / Software Advice listing',
    why: 'Capterra is a top citation source for Perplexity and ChatGPT in software recommendation queries. Absence means competitors fill those answer slots instead.',
    importance: 'high',
    effort: 'moderate',
    detection: 'third_party',
    fix: 'Register on Capterra and Software Advice. Complete your profile fully. Collect at least 10 verified reviews — this is the threshold for AI recommendation inclusion.',
  },
  {
    id: 'offsite_04',
    category: 'off_site',
    title: 'Product Hunt listing',
    why: 'Product Hunt profiles are frequently cited by AI models for SaaS discovery queries and add a credibility signal for early-stage and growth-stage products.',
    importance: 'medium',
    effort: 'moderate',
    detection: 'third_party',
    fix: 'Create a Product Hunt profile with full description, screenshots, and feature highlights. Run a launch campaign to collect upvotes for increased visibility.',
  },
  {
    id: 'offsite_05',
    category: 'off_site',
    title: 'Crunchbase company profile',
    why: 'Crunchbase is used by AI models to verify company facts (funding, founding date, HQ). It contributes to entity confidence and brand legitimacy signals.',
    importance: 'medium',
    effort: 'quick_win',
    detection: 'third_party',
    fix: 'Create a Crunchbase profile with accurate: founding date, HQ, description, founders, and funding rounds. Link it in your Organization schema sameAs.',
  },

  // ── Multilingual ────────────────────────────────────────────────────────────

  {
    id: 'multi_01',
    category: 'multilingual',
    title: 'hreflang tags for multilingual content',
    why: 'Without hreflang, AI crawlers may index the wrong language version or miss localized content entirely — reducing visibility in non-English markets.',
    importance: 'medium',
    effort: 'moderate',
    detection: 'auto',
    fix: 'Add hreflang link tags with x-default and all language variants on every page. Ensure canonical tags stay within the same language version.',
  },
  {
    id: 'multi_02',
    category: 'multilingual',
    title: 'Separate URL structure per language (/en/, /pl/)',
    why: 'Dedicated URLs per language are strongly preferred over IP-based locale detection — crawlers cannot simulate different geolocations.',
    importance: 'medium',
    effort: 'significant',
    detection: 'auto',
    fix: 'Use separate URL paths (/en/, /pl/) or subdomains (en.domain.com). Avoid cookie or IP-based language switching which is invisible to crawlers.',
  },
];
