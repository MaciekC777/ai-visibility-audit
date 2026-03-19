import { describe, it, expect } from 'vitest';
import { generatePrompts, buildLocationClause, buildServiceClause } from './promptGenerator';
import { ScrapedData } from '../scraper/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeScraped(overrides: Partial<ScrapedData> = {}): ScrapedData {
  return {
    companyName: 'Ceska',
    domain: 'ceska.pl',
    language: 'pl',
    detectedBusinessType: 'local_business',
    businessTypeSignals: [],
    location: { city: 'Kraków', region: null, country: 'PL', fullAddress: null },
    services: ['obsługa prawna', 'porady podatkowe'],
    pricingPageFound: false,
    schemaTypes: [],
    metaDescription: null,
    scrapedAt: new Date().toISOString(),
    pagesScraped: ['https://ceska.pl'],
    ...overrides,
  };
}

// ─── buildLocationClause ─────────────────────────────────────────────────────

describe('buildLocationClause', () => {
  it('returns " w {city}" for local_business with city', () => {
    expect(buildLocationClause({ city: 'Kraków', region: null, country: null, fullAddress: null }, 'local_business')).toBe(' w Kraków');
  });

  it('returns "" for saas regardless of city', () => {
    expect(buildLocationClause({ city: 'Kraków', region: null, country: null, fullAddress: null }, 'saas')).toBe('');
  });

  it('returns "" for local_business without city', () => {
    expect(buildLocationClause(null, 'local_business')).toBe('');
    expect(buildLocationClause({ city: null, region: null, country: null, fullAddress: null }, 'local_business')).toBe('');
  });
});

// ─── buildServiceClause ───────────────────────────────────────────────────────

describe('buildServiceClause', () => {
  it('uses "od" for local_business', () => {
    expect(buildServiceClause('naprawy telefonów', 'local_business')).toBe(' od naprawy telefonów');
  });

  it('uses "do" for saas', () => {
    expect(buildServiceClause('zarządzania projektami', 'saas')).toBe(' do zarządzania projektami');
  });

  it('returns "" for empty service', () => {
    expect(buildServiceClause('', 'local_business')).toBe('');
  });
});

// ─── generatePrompts — integration ───────────────────────────────────────────

describe('generatePrompts — local_business', () => {
  const scraped = makeScraped({ schemaTypes: ['Restaurant'] });
  const { prompts } = generatePrompts(scraped, [], 'local_business');

  it('generates 8 prompts', () => {
    expect(prompts).toHaveLength(8);
  });

  it('direct prompts contain businessDescriptor + companyName', () => {
    const direct = prompts.filter(p => p.type === 'direct');
    for (const p of direct) {
      expect(p.promptText).toContain('restauracja');
      expect(p.promptText).toContain('Ceska');
    }
  });

  it('indirect prompts do NOT contain companyName', () => {
    const indirect = prompts.filter(p => p.type === 'indirect');
    for (const p of indirect) {
      expect(p.promptText).not.toContain('Ceska');
    }
  });

  it('direct prompts contain locationClause for local_business with city', () => {
    const direct = prompts.filter(p => p.type === 'direct');
    for (const p of direct) {
      expect(p.promptText).toContain('Kraków');
    }
  });

  it('businessDescriptor is recorded in variables', () => {
    const p = prompts.find(p => p.id === 'discovery_direct')!;
    expect(p.variables.businessDescriptor).toBe('restauracja');
  });

  it('competition_indirect uses plural descriptor', () => {
    const p = prompts.find(p => p.id === 'competition_indirect')!;
    expect(p.promptText).toContain('restauracji');
    expect(p.promptText).not.toContain('Ceska');
  });
});

describe('generatePrompts — saas', () => {
  const scraped = makeScraped({
    detectedBusinessType: 'saas',
    schemaTypes: ['SoftwareApplication'],
    location: { city: 'Warszawa', region: null, country: 'PL', fullAddress: null },
  });
  const { prompts } = generatePrompts(scraped, ['CRM'], 'saas');

  it('generates 8 prompts', () => {
    expect(prompts).toHaveLength(8);
  });

  it('direct prompts contain narzędzie CRM + companyName', () => {
    const direct = prompts.filter(p => p.type === 'direct');
    for (const p of direct) {
      expect(p.promptText).toContain('narzędzie CRM');
      expect(p.promptText).toContain('Ceska');
    }
  });

  it('locationClause is empty for saas', () => {
    for (const p of prompts) {
      expect(p.promptText).not.toContain('Warszawa');
    }
  });

  it('indirect prompts do NOT contain companyName', () => {
    const indirect = prompts.filter(p => p.type === 'indirect');
    for (const p of indirect) {
      expect(p.promptText).not.toContain('Ceska');
    }
  });

  it('competition_indirect uses plural: narzędzi CRM', () => {
    const p = prompts.find(p => p.id === 'competition_indirect')!;
    expect(p.promptText).toContain('narzędzi CRM');
  });
});

describe('generatePrompts — no schema, no keywords fallback', () => {
  const scraped = makeScraped({ schemaTypes: [], services: [], location: null });
  const { prompts, missingDataFlags } = generatePrompts(scraped, [], 'local_business');

  it('still generates 8 prompts', () => {
    expect(prompts).toHaveLength(8);
  });

  it('uses fallback descriptor "firma"', () => {
    const p = prompts.find(p => p.id === 'discovery_direct')!;
    expect(p.variables.businessDescriptor).toBe('firma');
  });

  it('flags location_missing and no_services_found', () => {
    expect(missingDataFlags).toContain('location_missing');
    expect(missingDataFlags).toContain('no_services_found');
  });
});
