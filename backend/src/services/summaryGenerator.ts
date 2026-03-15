import OpenAI from 'openai';
import { AuditScores, BrandProfile, Competitor, SentimentResult, VerifiedClaim } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { LANGUAGE_NAMES } from '../config/constants';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface AuditSummary {
  paragraph1: string; // current state — what's working
  paragraph2: string; // challenges + strategic direction
}

export async function generateSummary(
  profile: BrandProfile,
  scores: AuditScores,
  competitors: Competitor[],
  sentiments: SentimentResult[],
  hallucinations: VerifiedClaim[],
  language: string = 'en'
): Promise<AuditSummary> {
  const languageName = LANGUAGE_NAMES[language as keyof typeof LANGUAGE_NAMES] ?? 'English';
  const p = profile as any;
  const brandName = p.brand_name ?? p.brand?.name ?? 'Brand';

  const safeSentiments = sentiments ?? [];
  const safeCompetitors = competitors ?? [];
  const safeHallucinations = hallucinations ?? [];

  const positiveCount = safeSentiments.filter(s => s.overall_sentiment === 'positive').length;
  const negativeCount = safeSentiments.filter(s => s.overall_sentiment === 'negative').length;
  const sentimentLabel = positiveCount > negativeCount * 2
    ? 'predominantly positive'
    : negativeCount > positiveCount
    ? 'predominantly negative'
    : 'mixed';

  const topCompetitors = safeCompetitors.slice(0, 3).map(c => c.name).join(', ');
  const highThreat = safeCompetitors.filter(c => c.replacement_rate > 0.2);
  const criticalHallucinations = safeHallucinations.filter(h => h.severity === 'high');

  const systemPrompt = `You are an AI visibility analyst writing an executive summary for a brand audit report.
Write exactly 2 paragraphs. Be specific — use the exact numbers provided. No generic filler.
IMPORTANT: Write entirely in ${languageName}. Do not mix languages.
Return ONLY a JSON object: { "paragraph1": "...", "paragraph2": "..." }`;

  const userPrompt = `Brand: ${brandName} (${p.brand?.domain ?? p.location?.city ?? ''})
Category: ${p.brand?.category ?? p.category ?? ''} | Mode: ${p.mode ?? p.business_type ?? 'general'}

Scores:
- Visibility: ${scores.visibilityScore}/100
- Accuracy: ${scores.accuracyScore !== null ? `${scores.accuracyScore}/100` : 'N/A'}
- Perception: ${scores.perceptionScore}/100
- Composite: ${scores.compositeScore}/100
- Market Rank: #${scores.marketRank}

AI Sentiment: ${sentimentLabel} (${positiveCount} positive, ${negativeCount} negative out of ${safeSentiments.length} responses)
Competitors found in AI responses: ${topCompetitors || 'none'}
High-threat competitors (replace brand): ${highThreat.map(c => c.name).join(', ') || 'none'}
Critical hallucinations: ${criticalHallucinations.length}

Paragraph 1 — Current state: Summarize what's working. Mention the exact visibility score, market rank, sentiment, and any strong positive signals. Be confident and data-driven.

Paragraph 2 — Challenges & direction: Identify the main gaps (low score areas, competitor threats, hallucinations). Give 2-3 concrete strategic directions without being vague. End with a forward-looking sentence.

Keep each paragraph 3-5 sentences. Professional tone, not marketing fluff.`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.4,
    });

    const raw = res.choices[0]?.message?.content ?? '{}';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as AuditSummary;
  } catch (e) {
    logger.error('Failed to generate summary', { error: e });
    return getFallbackSummary(brandName, scores);
  }
}

function getFallbackSummary(brandName: string, scores: AuditScores): AuditSummary {
  return {
    paragraph1: `${brandName} achieved an AI visibility score of ${scores.visibilityScore}/100 and holds market rank #${scores.marketRank}. The perception score stands at ${scores.perceptionScore}/100, reflecting the overall tone of AI-generated responses about the brand.`,
    paragraph2: `To improve AI visibility, focus on expanding online presence across key platforms, ensuring factual consistency across all brand touchpoints, and creating content that AI models can reliably cite. Addressing these areas is expected to improve both visibility and accuracy scores in subsequent audits.`,
  };
}
