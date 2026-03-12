import OpenAI from 'openai';
import { ModelResponse, BrandProfile, Hallucination } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function detectHallucinations(
  responses: ModelResponse[],
  profile: BrandProfile
): Promise<Hallucination[]> {
  const responsesWithMentions = responses.filter((r) =>
    r.response.toLowerCase().includes(profile.brandName.toLowerCase())
  );

  if (responsesWithMentions.length === 0) return [];

  const groundTruth = `
Brand: ${profile.brandName}
Domain: ${profile.domain}
Category: ${profile.category}
Description: ${profile.description}
Key features/USPs: ${profile.usps.slice(0, 5).join('; ')}
Pricing tiers: ${profile.pricingTiers.join(', ') || 'not available'}
  `.trim();

  const systemPrompt = `You are a fact-checker for AI model responses.
Given ground truth about a brand and AI model responses about it, identify any claims that appear to be hallucinations.
Return a JSON array of hallucinations, each with:
- promptId: string
- model: string
- claim: string (the specific incorrect claim)
- verdict: "confirmed_false" | "unverifiable" | "confirmed_true"
- explanation: string (why this is flagged)

Only include claims about the brand that are factually dubious. Return ONLY the JSON array.`;

  const sample = responsesWithMentions.slice(0, 8); // limit API calls

  const userPrompt = `Ground truth:\n${groundTruth}\n\nResponses to fact-check:\n${sample
    .map((r) => `[${r.model}][promptId:${r.promptId}]: ${r.response.slice(0, 400)}`)
    .join('\n\n')}`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.1,
    });
    const raw = res.choices[0]?.message?.content ?? '[]';
    return JSON.parse(raw) as Hallucination[];
  } catch (e) {
    logger.error('Hallucination detection failed', { error: e });
    return [];
  }
}
