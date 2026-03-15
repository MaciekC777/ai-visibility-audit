import OpenAI from 'openai';
import { ModelResponse, BrandProfile, VerifiedClaim, ExtractedClaim, VerifiableFact, ClaimForVerification } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { LANGUAGE_NAMES } from '../config/constants';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// ─── Step 1: Extract claims ────────────────────────────────────────────────────

async function extractClaims(
  responses: ModelResponse[],
  brandName: string
): Promise<ExtractedClaim[]> {
  // Only analyze B (factual) + all responses that mention the brand
  const brandLower = brandName.toLowerCase();
  const factualResponses = responses.filter(r =>
    (r.promptCategory === 'B_factual' || r.response.toLowerCase().includes(brandLower)) &&
    !r.error && r.response.length > 50
  ).slice(0, 12); // limit to 12 for cost

  if (factualResponses.length === 0) return [];

  const systemPrompt = `You are a fact extraction engine.
Extract every verifiable factual claim about ${brandName} from the given texts.
Return ONLY a valid JSON array. No markdown.`;

  const userPrompt = `Brand: ${brandName}

For each response, extract factual claims. Return JSON array:
[{
  "claim_text": "string",
  "claim_type": "pricing" | "feature" | "company_info" | "location" | "hours" | "service" | "contact" | "metric",
  "verifiable": true/false,
  "model": "string",
  "promptId": "string"
}]

Only claims about ${brandName}. Mark verifiable=false for subjective statements.
Analyze regardless of language. Return in English.

Responses:
${factualResponses.map(r =>
    `[model:${r.model}][promptId:${r.promptId}]: ${r.response.slice(0, 600)}`
  ).join('\n\n')}`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0,
    });
    const raw = res.choices[0]?.message?.content ?? '[]';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as ExtractedClaim[];
  } catch (e) {
    logger.error('Claim extraction failed', { error: e });
    return [];
  }
}

// ─── Step 2: Verify claims vs ground truth ────────────────────────────────────

async function verifyClaims(
  claims: ExtractedClaim[],
  profile: BrandProfile,
  language: string = 'en'
): Promise<VerifiedClaim[]> {
  const languageName = LANGUAGE_NAMES[language as keyof typeof LANGUAGE_NAMES] ?? 'English';
  const verifiableClaims = claims.filter(c => c.verifiable);
  if (verifiableClaims.length === 0) return [];

  const systemPrompt = `You are a fact-checking engine.
Compare AI claims against verified facts from the brand's own website.
Write all text fields (explanation, correction) in ${languageName}.
Return ONLY a valid JSON array. No markdown.`;

  const facts = profile.verifiable_facts;
  const profileSummary = buildProfileSummary(profile);

  const userPrompt = `Verified facts:
${JSON.stringify(facts, null, 2)}

Brand profile summary:
${profileSummary}

Claims to verify (return same array with added fields):
${JSON.stringify(verifiableClaims, null, 2)}

For each claim add:
- "mapped_fact_id": "F1" | "F2" | ... | "no_match"
- "verdict": "correct" | "incorrect" | "partially_correct" | "unverifiable" | "outdated"
- "severity": "high" | "medium" | "low"
- "explanation": "string"
- "correction": "string (what it should be, or empty)"

Severity rules:
- HIGH: Wrong price, wrong address, wrong hours, nonexistent feature, wrong phone → directly misleads customers
- MEDIUM: Imprecise, partially true, outdated → could confuse
- LOW: Minor inaccuracy, rounding, incomplete → unlikely to harm

For LOCAL businesses: wrong address = HIGH, wrong hours = HIGH.
Return ONLY claims where verdict is NOT "correct". Return JSON array.`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 3000,
      temperature: 0,
    });
    const raw = res.choices[0]?.message?.content ?? '[]';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as VerifiedClaim[];
  } catch (e) {
    logger.error('Claim verification failed', { error: e });
    return [];
  }
}

function buildProfileSummary(profile: BrandProfile): string {
  if (profile.mode === 'saas') {
    return `Brand: ${profile.brand.name}
Category: ${profile.brand.category}
Description: ${profile.brand.description}
Founded: ${profile.brand.founded_year ?? 'unknown'}
Pricing: ${profile.pricing.plans.map(p => `${p.name}: ${p.price}`).join(', ')}
Core features: ${profile.features.core.slice(0, 5).join(', ')}
Free trial: ${profile.pricing.free_trial}`;
  } else {
    return `Brand: ${profile.brand.name}
Category: ${profile.brand.category}
Address: ${profile.location.address}, ${profile.location.city}
Phone: ${profile.contact.phone}
Services: ${profile.services.primary.slice(0, 5).join(', ')}
Hours: ${JSON.stringify(profile.contact.opening_hours)}`;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function detectHallucinations(
  responses: ModelResponse[],
  profile: any,
  language: string = 'en',
  claims?: ClaimForVerification[]
): Promise<VerifiedClaim[]> {
  const brandName = profile.brand.name;

  try {
    // Step 1: Extract claims
    const extractedClaims = await extractClaims(responses, brandName);
    logger.info('Extracted claims', { count: extractedClaims.length });

    if (extractedClaims.length === 0) return [];

    // Step 2: Verify vs ground truth
    const verifiedClaims = await verifyClaims(extractedClaims, profile, language);
    logger.info('Verified claims', { issues: verifiedClaims.length });

    return verifiedClaims;
  } catch (e) {
    logger.error('Hallucination detection failed', { error: e });
    return [];
  }
}
