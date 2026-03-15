import OpenAI from 'openai';
import {
  AuditScores,
  BrandProfile,
  Recommendation,
  WebsiteReadiness,
  ThirdPartyPresence,
  VerifiedClaim,
  Competitor,
  SourceAnalysis,
  ChecklistResult,
} from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { LANGUAGE_NAMES } from '../config/constants';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function generateRecommendations(
  profile: BrandProfile,
  scores: AuditScores,
  websiteReadiness: WebsiteReadiness,
  thirdParty: ThirdPartyPresence[],
  hallucinations: VerifiedClaim[],
  competitors: Competitor[],
  sourceAnalysis: SourceAnalysis,
  language: string = 'en',
  checklistGaps: ChecklistResult[] = []
): Promise<Recommendation[]> {
  const languageName = LANGUAGE_NAMES[language as keyof typeof LANGUAGE_NAMES] ?? 'English';
  const p = profile as any;
  const brandName = p.brand_name ?? p.brand?.name ?? 'Brand';
  const missingPlatforms = (thirdParty ?? []).filter(tp => tp.status === 'missing').map(tp => tp.platform);
  const criticalIssues = (hallucinations ?? []).filter(h => h.severity === 'high');
  const failedChecks = websiteReadiness?.checks?.filter(c => c.status === 'fail') ?? [];

  const systemPrompt = `You are an AI visibility consultant specializing in brand visibility in AI model responses (ChatGPT, Claude, Gemini, Perplexity).
Generate specific, actionable recommendations based on THIS audit's concrete findings.
Every recommendation MUST reference a specific finding. No generic advice.
IMPORTANT: Write ALL text fields (title, description, based_on) in ${languageName}. Do not use any other language.
Return ONLY a valid JSON array. No markdown.`;

  // Format checklist gaps for GPT — only include gaps, sorted by importance
  const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedGaps = [...checklistGaps].sort(
    (a, b) => importanceOrder[a.item.importance] - importanceOrder[b.item.importance]
  );
  const checklistSection = sortedGaps.length > 0
    ? `\nChecklist gaps (${sortedGaps.length} missing items — use these as primary sources for recommendations):\n` +
      sortedGaps.map(g =>
        `- [${g.item.importance.toUpperCase()}] ${g.item.title} | effort: ${g.item.effort} | ${g.detail ?? 'not detected'} | fix: ${g.item.fix}`
      ).join('\n')
    : '\nChecklist gaps: none detected';

  const userPrompt = `Business Mode: ${p.mode ?? p.business_type ?? 'general'}
Brand: ${brandName} (${p.brand?.domain ?? p.location?.city ?? ''})
Category: ${p.brand?.category ?? p.category ?? ''}

Scores:
- AI Visibility Score: ${scores.visibilityScore}/100 ${getScoreLabel(scores.visibilityScore)}
- AI Accuracy Score: ${scores.accuracyScore !== null ? `${scores.accuracyScore}/100` : 'No data'}
- Composite Score: ${scores.compositeScore}/100
- Market Rank: #${scores.marketRank}

Hallucination Issues (${hallucinations.length} total):
${criticalIssues.length > 0 ? criticalIssues.map(h => `- [HIGH] ${h.claim_text} → ${h.correction}`).join('\n') : 'None critical'}

Website Readiness Score: ${websiteReadiness.score}/100
Failed checks: ${failedChecks.map(c => c.check).join(', ') || 'none'}

Missing third-party presence: ${missingPlatforms.join(', ') || 'none'}

Competitors visible instead of brand: ${competitors.slice(0, 5).map(c => `${c.name} (${c.total_mentions} mentions)`).join(', ') || 'none detected'}

Sources AI cites about brand: ${sourceAnalysis.brand_site_cited ? 'Brand website cited' : 'Brand website NOT cited by AI'}
Top third-party sources AI uses: ${sourceAnalysis.third_party_sources.slice(0, 5).map(s => s.url).join(', ') || 'none'}
${checklistSection}

Generate 5-10 recommendations. Each MUST:
1. Reference a SPECIFIC finding from this audit (checklist gaps, scores, or detected issues)
2. Include a concrete, implementable action
3. Prioritize checklist gaps marked CRITICAL or HIGH first
4. For local businesses: prioritize Google Business Profile first

Return JSON array:
[{
  "priority": "critical" | "high" | "medium" | "low",
  "effort": "quick_win" | "moderate" | "significant",
  "title": "string (max 60 chars)",
  "description": "string (2-3 sentences, specific and actionable)",
  "based_on": "string (specific audit finding this is based on)",
  "category": "accuracy" | "visibility" | "website" | "presence" | "content" | "technical"
}]

Sort: critical → high → medium → low, then quick_win → moderate → significant.`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2500,
      temperature: 0,
    });

    const raw = res.choices[0]?.message?.content ?? '[]';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as Recommendation[];
  } catch (e) {
    logger.error('Failed to generate recommendations', { error: e });
    return getDefaultRecommendations(profile, scores, missingPlatforms, criticalIssues, failedChecks, languageName);
  }
}

function getScoreLabel(score: number): string {
  if (score >= 80) return '(Excellent)';
  if (score >= 60) return '(Good)';
  if (score >= 40) return '(Moderate)';
  if (score >= 20) return '(Weak)';
  return '(Invisible)';
}

function getDefaultRecommendations(
  profile: BrandProfile,
  scores: AuditScores,
  missingPlatforms: string[],
  criticalIssues: VerifiedClaim[],
  failedChecks: WebsiteReadiness['checks'],
  _languageName?: string
): Recommendation[] {
  const recs: Recommendation[] = [];
  const dp = profile as any;
  const brandName = dp.brand_name ?? dp.brand?.name ?? 'Brand';
  const brandDomain = dp.brand?.domain ?? dp.location?.city ?? '';
  const profileMode = dp.mode ?? dp.business_type ?? 'saas';

  // Local: GBP first
  if ((profileMode === 'local' || profileMode === 'local_business' || profileMode === 'restaurant') && missingPlatforms.includes('Google Business Profile')) {
    recs.push({
      priority: 'critical',
      effort: 'quick_win',
      title: 'Claim your Google Business Profile',
      description: `${brandName} has no Google Business Profile, which is the #1 factor for local AI visibility. Claim and complete your profile with photos, hours, address, and category.`,
      based_on: 'Google Business Profile not detected during third-party check',
      category: 'presence',
    });
  }

  if (criticalIssues.length > 0) {
    recs.push({
      priority: 'critical',
      effort: 'quick_win',
      title: 'Fix factual errors AI models report about you',
      description: `AI models have ${criticalIssues.length} critical factual error(s) about ${brandName}. Fix: ${criticalIssues[0]?.correction || 'see Accuracy Report'}. Publish correct facts prominently on your homepage and add schema markup.`,
      based_on: `${criticalIssues.length} HIGH severity claims detected in Accuracy Report`,
      category: 'accuracy',
    });
  }

  if (scores.visibilityScore < 30) {
    recs.push({
      priority: 'high',
      effort: 'significant',
      title: 'Build AI-indexable content about your brand',
      description: `${brandName} has very low AI visibility (${scores.visibilityScore}/100). Create comprehensive, fact-rich content: detailed about page, feature descriptions, case studies, and FAQ. AI models need factual anchors to recommend you.`,
      based_on: `Visibility score ${scores.visibilityScore}/100 — brand rarely mentioned in AI responses`,
      category: 'visibility',
    });
  }

  if (profileMode !== 'local' && profileMode !== 'local_business' && profileMode !== 'restaurant' && failedChecks.length > 0) {
    const llmsFailed = failedChecks.find(c => c.check?.includes('llms.txt'));
    if (llmsFailed) {
      recs.push({
        priority: 'high',
        effort: 'quick_win',
        title: 'Create /llms.txt to guide AI models',
        description: `${brandName} is missing /llms.txt. This file gives AI models direct context about your brand, features, and key facts. Create it at ${brandDomain}/llms.txt with brand summary, product list, and pricing overview.`,
        based_on: 'llms.txt file missing from website readiness audit',
        category: 'website',
      });
    }
  }

  if (missingPlatforms.length > 0) {
    const topMissing = missingPlatforms.filter(p => p !== 'Google Business Profile').slice(0, 3);
    if (topMissing.length > 0) {
      recs.push({
        priority: 'high',
        effort: 'moderate',
        title: `Get listed on ${topMissing.join(', ')}`,
        description: `AI models heavily cite ${topMissing[0]} and similar platforms when recommending products/services. Getting listed and collecting at least 10 reviews significantly boosts mention rate.`,
        based_on: `Third-party check: ${topMissing.join(', ')} not detected`,
        category: 'presence',
      });
    }
  }

  return recs;
}
