import { PromptItem, PromptCategory, BusinessMode, Language, PlanType } from '../types';

// ─── SaaS Prompt Templates ────────────────────────────────────────────────────
// Variables: {brand}, {category}, {year}, {feature_1}, {competitor_1}, {competitor_2},
//            {persona}, {use_case}, {budget}, {plan_name}, {specific_feature},
//            {market_suffix} (e.g. "in Germany" or ""), {f1}, {f2}, {f3}, {keyword}

export const SAAS_PROMPTS_EN: Array<{ id: string; category: PromptCategory; template: string; tier: 'free' | 'starter' | 'pro' }> = [
  // Free (10)
  { id: 'A1', category: 'A_discovery',    tier: 'free',    template: 'What are the best {category} tools in {year}?' },
  { id: 'A2', category: 'A_discovery',    tier: 'free',    template: 'I need a {category} with {feature_1}. What do you recommend?' },
  { id: 'A3', category: 'A_discovery',    tier: 'free',    template: 'Do you know {brand}? What is it?' },
  { id: 'B1', category: 'B_factual',      tier: 'free',    template: 'How much does {brand} cost? What pricing plans does it offer?' },
  { id: 'B2', category: 'B_factual',      tier: 'free',    template: 'What features does {brand} offer?' },
  { id: 'B3', category: 'B_factual',      tier: 'free',    template: 'Tell me about {brand}.' },
  { id: 'C1', category: 'C_comparison',   tier: 'free',    template: 'What are alternatives to {competitor_1}?' },
  { id: 'D1', category: 'D_recommendation', tier: 'free',  template: 'I\'m a {persona} looking for a {category}. Recommend something.' },
  { id: 'D2', category: 'D_recommendation', tier: 'free',  template: 'Help me choose a {category} for {use_case}.' },
  { id: 'E1', category: 'E_evaluation',   tier: 'free',    template: 'What are the pros and cons of {brand}?' },
  // Starter (+6 = 16)
  { id: 'A4', category: 'A_discovery',    tier: 'starter', template: 'Best {category} {market_suffix} {year}' },
  { id: 'B4', category: 'B_factual',      tier: 'starter', template: 'Does {brand} support {specific_feature}?' },
  { id: 'C2', category: 'C_comparison',   tier: 'starter', template: 'Compare {brand} vs {competitor_1}' },
  { id: 'C3', category: 'C_comparison',   tier: 'starter', template: '{brand} vs {competitor_2} — which is better for {use_case}?' },
  { id: 'D3', category: 'D_recommendation', tier: 'starter', template: 'I need a {category} under {budget}/month. What are my options?' },
  { id: 'E2', category: 'E_evaluation',   tier: 'starter', template: 'Is {brand} worth it?' },
  // Pro (+5 = 21, plus keyword prompts)
  { id: 'A5', category: 'A_discovery',    tier: 'pro',     template: 'Is {brand} a good {category}?' },
  { id: 'B5', category: 'B_factual',      tier: 'pro',     template: 'What is the price of {brand}\'s {plan_name} plan?' },
  { id: 'C4', category: 'C_comparison',   tier: 'pro',     template: 'I\'m switching from {competitor_1}. Are there better options?' },
  { id: 'D4', category: 'D_recommendation', tier: 'pro',   template: '{category} with {f1}, {f2}, {f3} for {persona} {market_suffix}?' },
  { id: 'E3', category: 'E_evaluation',   tier: 'pro',     template: 'Is {brand} good for beginners?' },
  // Keyword prompts (pro only, dynamically generated)
  { id: 'K1', category: 'K_keyword',      tier: 'pro',     template: 'Best tools for {keyword} in {year}' },
  { id: 'K2', category: 'K_keyword',      tier: 'pro',     template: 'I need help with {keyword}. What {category} should I use?' },
];

// ─── Local Business Prompt Templates ─────────────────────────────────────────
// Polish (PL)
export const LOCAL_PROMPTS_PL: Array<{ id: string; category: PromptCategory; template: string; tier: 'free' | 'starter' | 'pro' }> = [
  { id: 'A1', category: 'A_discovery',    tier: 'free',    template: 'Polecisz dobry {category} w {city}?' },
  { id: 'A2', category: 'A_discovery',    tier: 'free',    template: 'Najlepszy {category} w {city} — co polecacie?' },
  { id: 'A3', category: 'A_discovery',    tier: 'free',    template: 'Czy znasz {brand}? Co to za firma?' },
  { id: 'B1', category: 'B_factual',      tier: 'free',    template: 'Gdzie jest {brand}? Jaki mają adres i godziny otwarcia?' },
  { id: 'B2', category: 'B_factual',      tier: 'free',    template: 'Co oferuje {brand}?' },
  { id: 'B3', category: 'B_factual',      tier: 'free',    template: 'Opowiedz mi o {brand} w {city}.' },
  { id: 'C1', category: 'C_comparison',   tier: 'free',    template: 'Jaki {category} w {city} zamiast {competitor_1}?' },
  { id: 'D1', category: 'D_recommendation', tier: 'free',  template: 'Szukam {category} w {city} na {use_case}. Co polecisz?' },
  { id: 'D2', category: 'D_recommendation', tier: 'free',  template: 'Potrzebuję {service_1} w {city}. Gdzie najlepiej iść?' },
  { id: 'E1', category: 'E_evaluation',   tier: 'free',    template: 'Co ludzie myślą o {brand} w {city}? Jakie opinie?' },
  { id: 'A4', category: 'A_discovery',    tier: 'starter', template: 'Top {category} w {city} z dobrymi opiniami' },
  { id: 'B4', category: 'B_factual',      tier: 'starter', template: 'Czy {brand} oferuje {specific_service}?' },
  { id: 'C2', category: 'C_comparison',   tier: 'starter', template: 'Co lepsze w {city}: {brand} czy {competitor_1}?' },
  { id: 'C3', category: 'C_comparison',   tier: 'starter', template: '{brand} vs {competitor_2} — gdzie lepiej {use_case}?' },
  { id: 'D3', category: 'D_recommendation', tier: 'starter', template: 'Szukam taniego {category} w {city}. Opcje?' },
  { id: 'E2', category: 'E_evaluation',   tier: 'starter', template: 'Czy warto iść do {brand}?' },
  { id: 'A5', category: 'A_discovery',    tier: 'pro',     template: 'Czy {brand} to dobry {category}?' },
  { id: 'B5', category: 'B_factual',      tier: 'pro',     template: 'Ile kosztuje {sample_service} w {brand}?' },
  { id: 'C4', category: 'C_comparison',   tier: 'pro',     template: 'Chodziłem do {competitor_1} ale szukam czegoś lepszego w {city}.' },
  { id: 'D4', category: 'D_recommendation', tier: 'pro',   template: 'Potrzebuję {service_1} i {service_2} w {city}. Najlepiej blisko {district}.' },
  { id: 'E3', category: 'E_evaluation',   tier: 'pro',     template: 'Czy {brand} to dobry wybór dla kogoś kto pierwszy raz {use_case}?' },
  { id: 'K1', category: 'K_keyword',      tier: 'pro',     template: 'Najlepsze {keyword} w {city} {year}' },
  { id: 'K2', category: 'K_keyword',      tier: 'pro',     template: '{keyword} w {city} — gdzie polecacie?' },
];

// English (EN) for Local
export const LOCAL_PROMPTS_EN: Array<{ id: string; category: PromptCategory; template: string; tier: 'free' | 'starter' | 'pro' }> = [
  { id: 'A1', category: 'A_discovery',    tier: 'free',    template: 'Can you recommend a good {category} in {city}?' },
  { id: 'A2', category: 'A_discovery',    tier: 'free',    template: 'Best {category} in {city} — what do you suggest?' },
  { id: 'A3', category: 'A_discovery',    tier: 'free',    template: 'Do you know {brand}? What kind of business is it?' },
  { id: 'B1', category: 'B_factual',      tier: 'free',    template: 'Where is {brand} located? What are their hours?' },
  { id: 'B2', category: 'B_factual',      tier: 'free',    template: 'What does {brand} offer?' },
  { id: 'B3', category: 'B_factual',      tier: 'free',    template: 'Tell me about {brand} in {city}.' },
  { id: 'C1', category: 'C_comparison',   tier: 'free',    template: 'Good {category} in {city} instead of {competitor_1}?' },
  { id: 'D1', category: 'D_recommendation', tier: 'free',  template: 'I\'m looking for a {category} in {city} for {use_case}. Suggestions?' },
  { id: 'D2', category: 'D_recommendation', tier: 'free',  template: 'I need {service_1} in {city}. Where should I go?' },
  { id: 'E1', category: 'E_evaluation',   tier: 'free',    template: 'What do people think about {brand} in {city}? Reviews?' },
  { id: 'A4', category: 'A_discovery',    tier: 'starter', template: 'Top {category} in {city} with good reviews' },
  { id: 'B4', category: 'B_factual',      tier: 'starter', template: 'Does {brand} offer {specific_service}?' },
  { id: 'C2', category: 'C_comparison',   tier: 'starter', template: 'Which is better in {city}: {brand} or {competitor_1}?' },
  { id: 'C3', category: 'C_comparison',   tier: 'starter', template: '{brand} vs {competitor_2} — where is better for {use_case}?' },
  { id: 'D3', category: 'D_recommendation', tier: 'starter', template: 'I\'m looking for an affordable {category} in {city}. Options?' },
  { id: 'E2', category: 'E_evaluation',   tier: 'starter', template: 'Is {brand} worth visiting?' },
  { id: 'A5', category: 'A_discovery',    tier: 'pro',     template: 'Is {brand} a good {category}?' },
  { id: 'B5', category: 'B_factual',      tier: 'pro',     template: 'How much does {sample_service} cost at {brand}?' },
  { id: 'C4', category: 'C_comparison',   tier: 'pro',     template: 'I used to go to {competitor_1} but looking for something better in {city}.' },
  { id: 'D4', category: 'D_recommendation', tier: 'pro',   template: 'I need {service_1} and {service_2} in {city}, ideally near {district}.' },
  { id: 'E3', category: 'E_evaluation',   tier: 'pro',     template: 'Is {brand} a good choice for someone doing {use_case} for the first time?' },
  { id: 'K1', category: 'K_keyword',      tier: 'pro',     template: 'Best {keyword} in {city} {year}' },
  { id: 'K2', category: 'K_keyword',      tier: 'pro',     template: '{keyword} in {city} — where do you recommend?' },
];

// German (DE) for Local
export const LOCAL_PROMPTS_DE: Array<{ id: string; category: PromptCategory; template: string; tier: 'free' | 'starter' | 'pro' }> = [
  { id: 'A1', category: 'A_discovery',    tier: 'free',    template: 'Kannst du ein gutes {category} in {city} empfehlen?' },
  { id: 'A2', category: 'A_discovery',    tier: 'free',    template: 'Bestes {category} in {city} — was empfehlt ihr?' },
  { id: 'A3', category: 'A_discovery',    tier: 'free',    template: 'Kennst du {brand}? Was ist das für ein Geschäft?' },
  { id: 'B1', category: 'B_factual',      tier: 'free',    template: 'Wo befindet sich {brand}? Wie sind die Öffnungszeiten?' },
  { id: 'B2', category: 'B_factual',      tier: 'free',    template: 'Was bietet {brand} an?' },
  { id: 'B3', category: 'B_factual',      tier: 'free',    template: 'Erzähl mir über {brand} in {city}.' },
  { id: 'C1', category: 'C_comparison',   tier: 'free',    template: 'Gutes {category} in {city} statt {competitor_1}?' },
  { id: 'D1', category: 'D_recommendation', tier: 'free',  template: 'Ich suche ein {category} in {city} für {use_case}. Vorschläge?' },
  { id: 'D2', category: 'D_recommendation', tier: 'free',  template: 'Ich brauche {service_1} in {city}. Wohin am besten?' },
  { id: 'E1', category: 'E_evaluation',   tier: 'free',    template: 'Was denken die Leute über {brand} in {city}? Bewertungen?' },
  { id: 'A4', category: 'A_discovery',    tier: 'starter', template: 'Top {category} in {city} mit guten Bewertungen' },
  { id: 'B4', category: 'B_factual',      tier: 'starter', template: 'Bietet {brand} {specific_service} an?' },
  { id: 'C2', category: 'C_comparison',   tier: 'starter', template: 'Was ist besser in {city}: {brand} oder {competitor_1}?' },
  { id: 'C3', category: 'C_comparison',   tier: 'starter', template: '{brand} vs {competitor_2} — wo ist es besser für {use_case}?' },
  { id: 'D3', category: 'D_recommendation', tier: 'starter', template: 'Ich suche ein günstiges {category} in {city}. Optionen?' },
  { id: 'E2', category: 'E_evaluation',   tier: 'starter', template: 'Lohnt sich {brand}?' },
  { id: 'A5', category: 'A_discovery',    tier: 'pro',     template: 'Ist {brand} ein gutes {category}?' },
  { id: 'B5', category: 'B_factual',      tier: 'pro',     template: 'Was kostet {sample_service} bei {brand}?' },
  { id: 'C4', category: 'C_comparison',   tier: 'pro',     template: 'Ich war bei {competitor_1}, suche aber etwas Besseres in {city}.' },
  { id: 'D4', category: 'D_recommendation', tier: 'pro',   template: 'Ich brauche {service_1} und {service_2} in {city}, am besten in der Nähe von {district}.' },
  { id: 'E3', category: 'E_evaluation',   tier: 'pro',     template: 'Ist {brand} gut für jemanden, der {use_case} zum ersten Mal macht?' },
  { id: 'K1', category: 'K_keyword',      tier: 'pro',     template: 'Bestes {keyword} in {city} {year}' },
  { id: 'K2', category: 'K_keyword',      tier: 'pro',     template: '{keyword} in {city} — was empfehlt ihr?' },
];

// French (FR)
export const LOCAL_PROMPTS_FR: Array<{ id: string; category: PromptCategory; template: string; tier: 'free' | 'starter' | 'pro' }> = [
  { id: 'A1', category: 'A_discovery',    tier: 'free',    template: 'Pouvez-vous recommander un bon {category} à {city}?' },
  { id: 'A2', category: 'A_discovery',    tier: 'free',    template: 'Meilleur {category} à {city} — qu\'est-ce que vous suggérez?' },
  { id: 'A3', category: 'A_discovery',    tier: 'free',    template: 'Connaissez-vous {brand}? Quel type d\'entreprise est-ce?' },
  { id: 'B1', category: 'B_factual',      tier: 'free',    template: 'Où se trouve {brand}? Quels sont leurs horaires?' },
  { id: 'B2', category: 'B_factual',      tier: 'free',    template: 'Que propose {brand}?' },
  { id: 'B3', category: 'B_factual',      tier: 'free',    template: 'Parlez-moi de {brand} à {city}.' },
  { id: 'C1', category: 'C_comparison',   tier: 'free',    template: 'Bon {category} à {city} plutôt que {competitor_1}?' },
  { id: 'D1', category: 'D_recommendation', tier: 'free',  template: 'Je cherche un {category} à {city} pour {use_case}. Des suggestions?' },
  { id: 'D2', category: 'D_recommendation', tier: 'free',  template: 'J\'ai besoin de {service_1} à {city}. Où aller?' },
  { id: 'E1', category: 'E_evaluation',   tier: 'free',    template: 'Que pensent les gens de {brand} à {city}? Des avis?' },
  { id: 'A4', category: 'A_discovery',    tier: 'starter', template: 'Top {category} à {city} avec de bonnes avis' },
  { id: 'B4', category: 'B_factual',      tier: 'starter', template: '{brand} offre-t-il {specific_service}?' },
  { id: 'C2', category: 'C_comparison',   tier: 'starter', template: 'Qu\'est-ce qui est mieux à {city}: {brand} ou {competitor_1}?' },
  { id: 'C3', category: 'C_comparison',   tier: 'starter', template: '{brand} vs {competitor_2} — où est-il mieux pour {use_case}?' },
  { id: 'D3', category: 'D_recommendation', tier: 'starter', template: 'Je cherche un {category} abordable à {city}. Options?' },
  { id: 'E2', category: 'E_evaluation',   tier: 'starter', template: '{brand} vaut-il la peine?' },
  { id: 'A5', category: 'A_discovery',    tier: 'pro',     template: '{brand} est-il un bon {category}?' },
  { id: 'B5', category: 'B_factual',      tier: 'pro',     template: 'Combien coûte {sample_service} chez {brand}?' },
  { id: 'C4', category: 'C_comparison',   tier: 'pro',     template: 'J\'allais chez {competitor_1} mais je cherche quelque chose de mieux à {city}.' },
  { id: 'D4', category: 'D_recommendation', tier: 'pro',   template: 'J\'ai besoin de {service_1} et {service_2} à {city}, idéalement près de {district}.' },
  { id: 'E3', category: 'E_evaluation',   tier: 'pro',     template: '{brand} est-il un bon choix pour quelqu\'un qui fait {use_case} pour la première fois?' },
  { id: 'K1', category: 'K_keyword',      tier: 'pro',     template: 'Meilleur {keyword} à {city} {year}' },
  { id: 'K2', category: 'K_keyword',      tier: 'pro',     template: '{keyword} à {city} — où recommandez-vous?' },
];

// Spanish (ES)
export const LOCAL_PROMPTS_ES: Array<{ id: string; category: PromptCategory; template: string; tier: 'free' | 'starter' | 'pro' }> = [
  { id: 'A1', category: 'A_discovery',    tier: 'free',    template: '¿Puedes recomendar un buen {category} en {city}?' },
  { id: 'A2', category: 'A_discovery',    tier: 'free',    template: 'Mejor {category} en {city} — ¿qué sugieres?' },
  { id: 'A3', category: 'A_discovery',    tier: 'free',    template: '¿Conoces {brand}? ¿Qué tipo de negocio es?' },
  { id: 'B1', category: 'B_factual',      tier: 'free',    template: '¿Dónde está {brand}? ¿Cuáles son sus horarios?' },
  { id: 'B2', category: 'B_factual',      tier: 'free',    template: '¿Qué ofrece {brand}?' },
  { id: 'B3', category: 'B_factual',      tier: 'free',    template: 'Cuéntame sobre {brand} en {city}.' },
  { id: 'C1', category: 'C_comparison',   tier: 'free',    template: '¿Buen {category} en {city} en lugar de {competitor_1}?' },
  { id: 'D1', category: 'D_recommendation', tier: 'free',  template: 'Busco un {category} en {city} para {use_case}. ¿Sugerencias?' },
  { id: 'D2', category: 'D_recommendation', tier: 'free',  template: 'Necesito {service_1} en {city}. ¿A dónde ir?' },
  { id: 'E1', category: 'E_evaluation',   tier: 'free',    template: '¿Qué piensan las personas sobre {brand} en {city}? ¿Reseñas?' },
  { id: 'A4', category: 'A_discovery',    tier: 'starter', template: 'Top {category} en {city} con buenas reseñas' },
  { id: 'B4', category: 'B_factual',      tier: 'starter', template: '¿{brand} ofrece {specific_service}?' },
  { id: 'C2', category: 'C_comparison',   tier: 'starter', template: '¿Cuál es mejor en {city}: {brand} o {competitor_1}?' },
  { id: 'C3', category: 'C_comparison',   tier: 'starter', template: '{brand} vs {competitor_2} — ¿dónde es mejor para {use_case}?' },
  { id: 'D3', category: 'D_recommendation', tier: 'starter', template: 'Busco un {category} económico en {city}. ¿Opciones?' },
  { id: 'E2', category: 'E_evaluation',   tier: 'starter', template: '¿Vale la pena {brand}?' },
  { id: 'A5', category: 'A_discovery',    tier: 'pro',     template: '¿Es {brand} un buen {category}?' },
  { id: 'B5', category: 'B_factual',      tier: 'pro',     template: '¿Cuánto cuesta {sample_service} en {brand}?' },
  { id: 'C4', category: 'C_comparison',   tier: 'pro',     template: 'Iba a {competitor_1} pero busco algo mejor en {city}.' },
  { id: 'D4', category: 'D_recommendation', tier: 'pro',   template: 'Necesito {service_1} y {service_2} en {city}, idealmente cerca de {district}.' },
  { id: 'E3', category: 'E_evaluation',   tier: 'pro',     template: '¿Es {brand} buena opción para alguien que hace {use_case} por primera vez?' },
  { id: 'K1', category: 'K_keyword',      tier: 'pro',     template: 'Mejor {keyword} en {city} {year}' },
  { id: 'K2', category: 'K_keyword',      tier: 'pro',     template: '{keyword} en {city} — ¿dónde recomiendan?' },
];

// Portuguese (PT)
export const LOCAL_PROMPTS_PT: Array<{ id: string; category: PromptCategory; template: string; tier: 'free' | 'starter' | 'pro' }> = [
  { id: 'A1', category: 'A_discovery',    tier: 'free',    template: 'Pode recomendar um bom {category} em {city}?' },
  { id: 'A2', category: 'A_discovery',    tier: 'free',    template: 'Melhor {category} em {city} — o que sugerem?' },
  { id: 'A3', category: 'A_discovery',    tier: 'free',    template: 'Conhece {brand}? Que tipo de negócio é?' },
  { id: 'B1', category: 'B_factual',      tier: 'free',    template: 'Onde fica {brand}? Quais são os horários?' },
  { id: 'B2', category: 'B_factual',      tier: 'free',    template: 'O que oferece {brand}?' },
  { id: 'B3', category: 'B_factual',      tier: 'free',    template: 'Fale-me sobre {brand} em {city}.' },
  { id: 'C1', category: 'C_comparison',   tier: 'free',    template: 'Bom {category} em {city} em vez de {competitor_1}?' },
  { id: 'D1', category: 'D_recommendation', tier: 'free',  template: 'Procuro um {category} em {city} para {use_case}. Sugestões?' },
  { id: 'D2', category: 'D_recommendation', tier: 'free',  template: 'Preciso de {service_1} em {city}. Onde ir?' },
  { id: 'E1', category: 'E_evaluation',   tier: 'free',    template: 'O que as pessoas pensam sobre {brand} em {city}? Avaliações?' },
  { id: 'A4', category: 'A_discovery',    tier: 'starter', template: 'Top {category} em {city} com boas avaliações' },
  { id: 'B4', category: 'B_factual',      tier: 'starter', template: '{brand} oferece {specific_service}?' },
  { id: 'C2', category: 'C_comparison',   tier: 'starter', template: 'Qual é melhor em {city}: {brand} ou {competitor_1}?' },
  { id: 'C3', category: 'C_comparison',   tier: 'starter', template: '{brand} vs {competitor_2} — onde é melhor para {use_case}?' },
  { id: 'D3', category: 'D_recommendation', tier: 'starter', template: 'Procuro um {category} económico em {city}. Opções?' },
  { id: 'E2', category: 'E_evaluation',   tier: 'starter', template: 'Vale a pena {brand}?' },
  { id: 'A5', category: 'A_discovery',    tier: 'pro',     template: '{brand} é um bom {category}?' },
  { id: 'B5', category: 'B_factual',      tier: 'pro',     template: 'Quanto custa {sample_service} no {brand}?' },
  { id: 'C4', category: 'C_comparison',   tier: 'pro',     template: 'Ia ao {competitor_1} mas procuro algo melhor em {city}.' },
  { id: 'D4', category: 'D_recommendation', tier: 'pro',   template: 'Preciso de {service_1} e {service_2} em {city}, idealmente perto de {district}.' },
  { id: 'E3', category: 'E_evaluation',   tier: 'pro',     template: '{brand} é boa opção para quem faz {use_case} pela primeira vez?' },
  { id: 'K1', category: 'K_keyword',      tier: 'pro',     template: 'Melhor {keyword} em {city} {year}' },
  { id: 'K2', category: 'K_keyword',      tier: 'pro',     template: '{keyword} em {city} — onde recomendam?' },
];

const LOCAL_TEMPLATES_BY_LANG: Partial<Record<Language, typeof LOCAL_PROMPTS_EN>> = {
  pl: LOCAL_PROMPTS_PL,
  en: LOCAL_PROMPTS_EN,
  de: LOCAL_PROMPTS_DE,
  fr: LOCAL_PROMPTS_FR,
  es: LOCAL_PROMPTS_ES,
  pt: LOCAL_PROMPTS_PT,
};

// ─── Template variable filler ─────────────────────────────────────────────────

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `[${key}]`);
}

// ─── Prompt generator function ────────────────────────────────────────────────

export interface PromptGenVars {
  brand: string;
  category: string;
  year: string;
  feature_1?: string;
  competitor_1?: string;
  competitor_2?: string;
  persona?: string;
  use_case?: string;
  budget?: string;
  plan_name?: string;
  specific_feature?: string;
  specific_service?: string;
  market_suffix?: string;
  f1?: string;
  f2?: string;
  f3?: string;
  // Local
  city?: string;
  service_1?: string;
  service_2?: string;
  sample_service?: string;
  district?: string;
  [key: string]: string | undefined;
}

function getTierLimit(plan: PlanType): 'free' | 'starter' | 'pro' {
  if (plan === 'free') return 'free';
  if (plan === 'starter') return 'starter';
  return 'pro'; // pro + agency
}

export function generateSaaSPrompts(
  vars: PromptGenVars,
  plan: PlanType,
  keywords: string[] = []
): PromptItem[] {
  const tierLimit = getTierLimit(plan);
  const tierOrder = ['free', 'starter', 'pro'] as const;
  const allowedTiers = tierOrder.slice(0, tierOrder.indexOf(tierLimit) + 1);

  const basePrompts = SAAS_PROMPTS_EN
    .filter(t => t.id !== 'K1' && t.id !== 'K2' && (allowedTiers as string[]).includes(t.tier))
    .map(t => ({
      id: t.id,
      category: t.category,
      text: fillTemplate(t.template, vars as Record<string, string>),
      language: 'en' as Language,
    }));

  // Add keyword prompts for pro (max 5 keywords × 2 templates = 10)
  const keywordPrompts: PromptItem[] = [];
  if (tierLimit === 'pro' && keywords.length > 0) {
    const maxKeywords = Math.min(keywords.length, 5);
    for (let i = 0; i < maxKeywords; i++) {
      const kw = keywords[i];
      keywordPrompts.push({
        id: `K1_${i}`,
        category: 'K_keyword',
        text: fillTemplate(SAAS_PROMPTS_EN.find(t => t.id === 'K1')!.template, { ...vars as Record<string, string>, keyword: kw }),
        language: 'en',
      });
      keywordPrompts.push({
        id: `K2_${i}`,
        category: 'K_keyword',
        text: fillTemplate(SAAS_PROMPTS_EN.find(t => t.id === 'K2')!.template, { ...vars as Record<string, string>, keyword: kw }),
        language: 'en',
      });
    }
  }

  return [...basePrompts, ...keywordPrompts];
}

export function generateLocalPrompts(
  vars: PromptGenVars,
  plan: PlanType,
  language: Language,
  keywords: string[] = []
): PromptItem[] {
  const templates = LOCAL_TEMPLATES_BY_LANG[language] ?? LOCAL_PROMPTS_EN;
  const tierLimit = getTierLimit(plan);
  const tierOrder = ['free', 'starter', 'pro'] as const;
  const allowedTiers = tierOrder.slice(0, tierOrder.indexOf(tierLimit) + 1);

  const hasCity = !!(vars.city && vars.city.trim());

  const basePrompts = templates
    .filter(t => t.id !== 'K1' && t.id !== 'K2' && (allowedTiers as string[]).includes(t.tier))
    .filter(t => hasCity || !t.template.includes('{city}'))
    .map(t => ({
      id: t.id,
      category: t.category,
      text: fillTemplate(t.template, vars as Record<string, string>),
      language,
    }));

  // Keyword prompts for pro
  const k1Template = templates.find(t => t.id === 'K1');
  const k2Template = templates.find(t => t.id === 'K2');
  const keywordPrompts: PromptItem[] = [];
  if (tierLimit === 'pro' && keywords.length > 0 && k1Template && k2Template) {
    const maxKeywords = Math.min(keywords.length, 5);
    for (let i = 0; i < maxKeywords; i++) {
      const kw = keywords[i];
      keywordPrompts.push({
        id: `K1_${i}`,
        category: 'K_keyword',
        text: fillTemplate(k1Template.template, { ...vars as Record<string, string>, keyword: kw }),
        language,
      });
      keywordPrompts.push({
        id: `K2_${i}`,
        category: 'K_keyword',
        text: fillTemplate(k2Template.template, { ...vars as Record<string, string>, keyword: kw }),
        language,
      });
    }
  }

  return [...basePrompts, ...keywordPrompts];
}

// Legacy export for backwards compat
export const PROMPT_TEMPLATES = SAAS_PROMPTS_EN.map(t => ({
  id: t.id,
  category: 'awareness' as const,
  template: t.template,
}));
