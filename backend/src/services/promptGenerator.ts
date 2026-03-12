import { BrandProfile, PromptItem } from '../types';
import { PROMPT_TEMPLATES, fillTemplate } from '../config/promptTemplates';
import { PLAN_LIMITS } from '../config/constants';
import { PlanType } from '../types';

export function generatePrompts(
  profile: BrandProfile,
  plan: PlanType,
  _language = 'en'
): PromptItem[] {
  const limit = PLAN_LIMITS[plan].promptsPerAudit;
  const year = new Date().getFullYear().toString();
  const vars = {
    brandName: profile.brandName,
    category: profile.category,
    year,
    feature: profile.usps[0] ?? 'automation',
    problem: `managing ${profile.category.toLowerCase()} efficiently`,
    useCase: 'a growing team',
  };

  const filled: PromptItem[] = PROMPT_TEMPLATES.map((t) => ({
    id: t.id,
    category: t.category,
    text: fillTemplate(t.template, vars),
    language: 'en',
  }));

  // Shuffle and limit
  const shuffled = filled.sort(() => Math.random() - 0.5).slice(0, limit);
  return shuffled;
}
