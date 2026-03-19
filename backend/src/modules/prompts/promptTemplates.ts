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
    // ── Direct (A) — brand name + descriptor ─────────────────────────────────
    {
      id: 'discovery_direct',
      category: 'discovery',
      type: 'direct',
      template: 'Natknąłem się na {businessDescriptor} {companyName}{locationClause} i zastanawiam się czy to jest wiarygodna firma. Co o nich wiesz?',
      expectedVariables: ['businessDescriptor', 'companyName', 'locationClause'],
      expectedInResponseKeys: ['companyName', 'services'],
    },
    {
      id: 'services_direct',
      category: 'services',
      type: 'direct',
      template: 'Rozważam skorzystanie z {businessDescriptor} {companyName}{locationClause}. Potrzebuję konkretnie {primaryService} — czy oni to oferują i jak to u nich wygląda?',
      expectedVariables: ['businessDescriptor', 'companyName', 'locationClause', 'primaryService'],
      expectedInResponseKeys: ['companyName', 'services'],
    },
    {
      id: 'reputation_direct',
      category: 'reputation',
      type: 'direct',
      template: 'Przed wydaniem pieniędzy chcę sprawdzić opinie o {businessDescriptor} {companyName}{locationClause}. Czy klienci są z nich zadowoleni? Były jakieś problemy?',
      expectedVariables: ['businessDescriptor', 'companyName', 'locationClause'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'competition_direct',
      category: 'competition',
      type: 'direct',
      template: 'Rozważam {businessDescriptor} {companyName}{locationClause} ale nie chcę kupować kota w worku. Jakie mam inne opcje i czy jest coś lepszego w podobnej cenie?',
      expectedVariables: ['businessDescriptor', 'companyName', 'locationClause'],
      expectedInResponseKeys: ['companyName'],
    },

    // ── Indirect (B) — no brand name, descriptor + need ──────────────────────
    {
      id: 'discovery_indirect',
      category: 'discovery',
      type: 'indirect',
      template: 'Szukam dobrej/ego {businessDescriptor}{serviceClause}{locationClause}. Nie znam się za bardzo na tym rynku — kogo warto rozważyć?',
      expectedVariables: ['businessDescriptor', 'serviceClause', 'locationClause'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'services_indirect',
      category: 'services',
      type: 'indirect',
      template: 'Mam taki problem: {problemDescription}. Czy jest jakiś {businessDescriptor}{locationClause} który się w tym specjalizuje? Zależy mi na konkretnym doświadczeniu, nie na firmie od wszystkiego.',
      expectedVariables: ['problemDescription', 'businessDescriptor', 'locationClause'],
      expectedInResponseKeys: ['companyName', 'services'],
    },
    {
      id: 'reputation_indirect',
      category: 'reputation',
      type: 'indirect',
      template: 'Szukam {businessDescriptor}{serviceClause}{locationClause} i zależy mi na kimś sprawdzonym — wiele firm ładnie wygląda na stronie ale potem jakość jest słaba. Kogo polecacie z czystym sumieniem?',
      expectedVariables: ['businessDescriptor', 'serviceClause', 'locationClause'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'competition_indirect',
      category: 'competition',
      type: 'indirect',
      template: 'Zróbcie mi porównanie najlepszych {businessDescriptorPlural}{serviceClause}{locationClause}. Interesuje mnie kto ma najlepszy stosunek jakości do ceny. Top 3–5.',
      expectedVariables: ['businessDescriptorPlural', 'serviceClause', 'locationClause'],
      expectedInResponseKeys: ['companyName'],
    },
  ],

  saas: [
    // ── Direct (A) ────────────────────────────────────────────────────────────
    {
      id: 'discovery_direct',
      category: 'discovery',
      type: 'direct',
      template: 'Natknąłem się na {businessDescriptor} {companyName} i zastanawiam się czy warto. Co to za narzędzie i do czego dokładnie służy?',
      expectedVariables: ['businessDescriptor', 'companyName'],
      expectedInResponseKeys: ['companyName', 'services'],
    },
    {
      id: 'services_direct',
      category: 'services',
      type: 'direct',
      template: 'Rozważam {businessDescriptor} {companyName} do {primaryService}. Jakie mają funkcje i czy to dobry wybór do tego zastosowania?',
      expectedVariables: ['businessDescriptor', 'companyName', 'primaryService'],
      expectedInResponseKeys: ['companyName', 'services'],
    },
    {
      id: 'reputation_direct',
      category: 'reputation',
      type: 'direct',
      template: 'Przed zakupem chcę sprawdzić opinie o {businessDescriptor} {companyName}. Czy użytkownicy są zadowoleni? Jakie są główne skargi?',
      expectedVariables: ['businessDescriptor', 'companyName'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'competition_direct',
      category: 'competition',
      type: 'direct',
      template: 'Rozważam {businessDescriptor} {companyName} ale chcę wiedzieć jakie są alternatywy. Co jest lepsze, gorsze i czym się różnią cenowo?',
      expectedVariables: ['businessDescriptor', 'companyName'],
      expectedInResponseKeys: ['companyName'],
    },

    // ── Indirect (B) ─────────────────────────────────────────────────────────
    {
      id: 'discovery_indirect',
      category: 'discovery',
      type: 'indirect',
      template: 'Szukam dobrego {businessDescriptor}{serviceClause}. Nie znam się za bardzo na tym rynku — kogo warto rozważyć?',
      expectedVariables: ['businessDescriptor', 'serviceClause'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'services_indirect',
      category: 'services',
      type: 'indirect',
      template: 'Mam taki problem: {problemDescription}. Czy jest jakiś {businessDescriptor} który się w tym specjalizuje? Zależy mi na konkretnej funkcjonalności, nie na narzędziu od wszystkiego.',
      expectedVariables: ['problemDescription', 'businessDescriptor'],
      expectedInResponseKeys: ['companyName', 'services'],
    },
    {
      id: 'reputation_indirect',
      category: 'reputation',
      type: 'indirect',
      template: 'Szukam {businessDescriptor}{serviceClause} i zależy mi na czymś sprawdzonym — wiele narzędzi ładnie wygląda w demo ale w praktyce zawodzi. Co polecacie z czystym sumieniem?',
      expectedVariables: ['businessDescriptor', 'serviceClause'],
      expectedInResponseKeys: ['companyName'],
    },
    {
      id: 'competition_indirect',
      category: 'competition',
      type: 'indirect',
      template: 'Zróbcie mi porównanie najlepszych {businessDescriptorPlural}{serviceClause}. Interesuje mnie kto ma najlepszy stosunek funkcji do ceny. Top 3–5.',
      expectedVariables: ['businessDescriptorPlural', 'serviceClause'],
      expectedInResponseKeys: ['companyName'],
    },
  ],
};
