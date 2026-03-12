import OpenAI from 'openai';
import { AuditScores, BrandProfile, Recommendation, WebsiteReadiness, ThirdPartyPresence } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function generateRecommendations(
  profile: BrandProfile,
  scores: AuditScores,
  websiteReadiness: WebsiteReadiness,
  thirdParty: ThirdPartyPresence[]
): Promise<Recommendation[]> {
  const missingPlatforms = thirdParty.filter((p) => !p.present).map((p) => p.platform);

  const systemPrompt = `You are an AI visibility expert. Generate actionable recommendations in JSON format.
Return a JSON array of recommendations, each with:
- priority: "critical" | "high" | "medium" | "low"
- category: string (e.g. "Content Strategy", "Third-Party Presence", "Brand Positioning")
- title: string (short action title)
- description: string (detailed explanation, 2-3 sentences)
- effort: "low" | "medium" | "high"
- impact: "low" | "medium" | "high"

Return ONLY the JSON array, no markdown, no explanation.`;

  const userPrompt = `Brand: ${profile.brandName} (${profile.domain})
Category: ${profile.category}

Scores:
- Visibility: ${scores.visibilityScore}/100
- Accuracy: ${scores.accuracyScore}/100
- Perception: ${scores.perceptionScore}/100
- Market Rank: #${scores.marketRank}

Website Readiness Score: ${websiteReadiness.score}/100
Missing: structured data=${!websiteReadiness.hasStructuredData}, about page=${!websiteReadiness.hasAboutPage}, pricing=${!websiteReadiness.hasPricingPage}

Missing third-party presence: ${missingPlatforms.join(', ') || 'none'}

Generate 5-8 prioritized recommendations to improve this brand's AI visibility.`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.4,
    });

    const raw = res.choices[0]?.message?.content ?? '[]';
    return JSON.parse(raw) as Recommendation[];
  } catch (e) {
    logger.error('Failed to generate recommendations', { error: e });
    return getDefaultRecommendations(scores, missingPlatforms);
  }
}

function getDefaultRecommendations(
  scores: AuditScores,
  missingPlatforms: string[]
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (scores.visibilityScore < 40) {
    recs.push({
      priority: 'critical',
      category: 'Content Strategy',
      title: 'Create AI-optimized content',
      description:
        'Your brand has low AI visibility. Create long-form, fact-rich content that AI models can reference. Focus on publishing comprehensive guides, case studies, and comparison articles.',
      effort: 'high',
      impact: 'high',
    });
  }

  if (missingPlatforms.length > 0) {
    recs.push({
      priority: 'high',
      category: 'Third-Party Presence',
      title: `Get listed on ${missingPlatforms.slice(0, 3).join(', ')}`,
      description:
        'AI models heavily weight third-party review sites. Getting listed and collecting reviews on G2, Capterra, and Trustpilot significantly boosts AI mention rates.',
      effort: 'low',
      impact: 'high',
    });
  }

  return recs;
}
