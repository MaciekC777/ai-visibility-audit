export interface PromptTemplate {
  id: string;
  category: 'awareness' | 'comparison' | 'recommendation' | 'direct' | 'feature' | 'problem';
  template: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Awareness
  {
    id: 'awareness_1',
    category: 'awareness',
    template: 'What are the most popular tools for {{category}}? List the top options.',
  },
  {
    id: 'awareness_2',
    category: 'awareness',
    template: 'Which {{category}} software do most companies use in {{year}}?',
  },
  // Comparison
  {
    id: 'comparison_1',
    category: 'comparison',
    template: 'How does {{brandName}} compare to its competitors in the {{category}} space?',
  },
  {
    id: 'comparison_2',
    category: 'comparison',
    template: 'What are the main alternatives to {{brandName}} for {{category}}?',
  },
  // Recommendation
  {
    id: 'recommendation_1',
    category: 'recommendation',
    template:
      'What {{category}} tool would you recommend for a small business? Give me your top 3 picks.',
  },
  {
    id: 'recommendation_2',
    category: 'recommendation',
    template:
      'I need a {{category}} solution for my team. What are the best options available today?',
  },
  // Direct
  {
    id: 'direct_1',
    category: 'direct',
    template: 'What do you know about {{brandName}}? Tell me about their product and pricing.',
  },
  {
    id: 'direct_2',
    category: 'direct',
    template: 'Is {{brandName}} a good tool for {{category}}? What are its pros and cons?',
  },
  // Feature
  {
    id: 'feature_1',
    category: 'feature',
    template: 'Which {{category}} tools have the best {{feature}}? Give me a comparison.',
  },
  {
    id: 'feature_2',
    category: 'feature',
    template: 'What software is best known for {{feature}} in the {{category}} market?',
  },
  // Problem
  {
    id: 'problem_1',
    category: 'problem',
    template: 'I am struggling with {{problem}}. What software solutions can help me?',
  },
  {
    id: 'problem_2',
    category: 'problem',
    template:
      'What is the best way to solve {{problem}} using AI or software tools in {{year}}?',
  },
];

export function fillTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `[${key}]`);
}
