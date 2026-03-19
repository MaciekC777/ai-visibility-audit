import { GeneratedPrompt } from './types';

export interface PromptTemplate {
  id: string;
  category: GeneratedPrompt['category'];
  type: GeneratedPrompt['type'];
  template: string;
  /** Variable names used in the template */
  expectedVariables: string[];
  /** Variable names whose resolved values should appear in AI response */
  expectedInResponseKeys: Array<'companyName' | 'services'>;
}

export const TEMPLATES: Record<'saas' | 'local_business', PromptTemplate[]> = {
  local_business: [
    {
      id: 'discovery_direct',
      category: 'discovery',
      type: 'direct',
      template: 'Szukam informacji o {companyName}. Czym się zajmują i czy warto się nimi zainteresować?',
      expectedVariables: ['companyName'],
      expectedInResponseKeys: ['companyName', 'services'],
    },
    {
      id: 'discovery_indirect',
      category: 'discovery',
      type: 'indirect',
      template: 'Potrzebuję {primaryService} w {city}. Jakie firmy byś polecił?',
      expectedVariables: ['primaryService', 'city'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'services_direct',
      category: 'services',
      type: 'direct',
      template: 'Jakie usługi oferuje {companyName}? Zastanawiam się czy będą w stanie mi pomóc z {primaryService}.',
      expectedVariables: ['companyName', 'primaryService'],
      expectedInResponseKeys: ['services'],
    },
    {
      id: 'services_indirect',
      category: 'services',
      type: 'indirect',
      template: 'Mam problem z {serviceDescription}. Czy ktoś w {city} oferuje takie coś i ile to mniej więcej kosztuje?',
      expectedVariables: ['serviceDescription', 'city'],
      expectedInResponseKeys: ['companyName', 'services'],
    },
    {
      id: 'reputation_direct',
      category: 'reputation',
      type: 'direct',
      template: 'Jakie opinie ma {companyName}? Czy klienci są zadowoleni z ich usług?',
      expectedVariables: ['companyName'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'reputation_indirect',
      category: 'reputation',
      type: 'indirect',
      template: 'Szukam sprawdzonej firmy od {primaryService} w {city}. Zależy mi na kimś z dobrymi opiniami. Co polecacie?',
      expectedVariables: ['primaryService', 'city'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'competition_direct',
      category: 'competition',
      type: 'direct',
      template: 'Rozważam {companyName}, ale chcę porównać opcje. Jakie są alternatywy i czym się różnią?',
      expectedVariables: ['companyName'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'competition_indirect',
      category: 'competition',
      type: 'indirect',
      template: 'Jaka jest najlepsza firma od {primaryService} w {city}? Potrzebuję kogoś rzetelnego, zestawienie top 3–5 byłoby idealne.',
      expectedVariables: ['primaryService', 'city'],
      expectedInResponseKeys: ['companyName'],
    },
  ],

  saas: [
    {
      id: 'discovery_direct',
      category: 'discovery',
      type: 'direct',
      template: 'Szukam informacji o {companyName}. Co to za narzędzie i do czego służy?',
      expectedVariables: ['companyName'],
      expectedInResponseKeys: ['companyName', 'services'],
    },
    {
      id: 'discovery_indirect',
      category: 'discovery',
      type: 'indirect',
      template: 'Szukam narzędzia do {primaryService}. Co byś polecił?',
      expectedVariables: ['primaryService'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'services_direct',
      category: 'services',
      type: 'direct',
      template: 'Jakie funkcje oferuje {companyName}? Potrzebuję czegoś do {primaryService}.',
      expectedVariables: ['companyName', 'primaryService'],
      expectedInResponseKeys: ['services'],
    },
    {
      id: 'services_indirect',
      category: 'services',
      type: 'indirect',
      template: 'Potrzebuję narzędzia które potrafi {serviceDescription}. Jakie są opcje i ile kosztują?',
      expectedVariables: ['serviceDescription'],
      expectedInResponseKeys: ['companyName', 'services'],
    },
    {
      id: 'reputation_direct',
      category: 'reputation',
      type: 'direct',
      template: 'Jakie opinie ma {companyName}? Czy użytkownicy są zadowoleni?',
      expectedVariables: ['companyName'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'reputation_indirect',
      category: 'reputation',
      type: 'indirect',
      template: 'Szukam sprawdzonego narzędzia do {primaryService}. Zależy mi na czymś z dobrymi opiniami. Co polecacie?',
      expectedVariables: ['primaryService'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'competition_direct',
      category: 'competition',
      type: 'direct',
      template: 'Rozważam {companyName}, ale chcę porównać. Jakie są alternatywy i czym się różnią?',
      expectedVariables: ['companyName'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'competition_indirect',
      category: 'competition',
      type: 'indirect',
      template: 'Jakie jest najlepsze narzędzie do {primaryService}? Potrzebuję czegoś rzetelnego, porównanie top 3–5 byłoby idealne.',
      expectedVariables: ['primaryService'],
      expectedInResponseKeys: ['companyName'],
    },
  ],
};
