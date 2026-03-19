import { describe, it, expect } from 'vitest';
import { resolveBusinessDescriptor, pluralize } from './businessDescriptorResolver';

const emptyScraped = { schemaTypes: [] as string[] };

describe('resolveBusinessDescriptor', () => {
  // ── Schema.org priority ───────────────────────────────────────────────────

  it('Restaurant schema → restauracja', () => {
    expect(resolveBusinessDescriptor({ schemaTypes: ['Restaurant'] }, [], 'local_business')).toBe('restauracja');
  });

  it('FoodEstablishment schema → restauracja', () => {
    expect(resolveBusinessDescriptor({ schemaTypes: ['FoodEstablishment'] }, [], 'local_business')).toBe('restauracja');
  });

  it('AutoRepair schema → warsztat samochodowy', () => {
    expect(resolveBusinessDescriptor({ schemaTypes: ['AutoRepair'] }, [], 'local_business')).toBe('warsztat samochodowy');
  });

  it('Dentist schema → gabinet stomatologiczny', () => {
    expect(resolveBusinessDescriptor({ schemaTypes: ['Dentist'] }, [], 'local_business')).toBe('gabinet stomatologiczny');
  });

  it('LegalService schema → kancelaria', () => {
    expect(resolveBusinessDescriptor({ schemaTypes: ['LegalService'] }, [], 'local_business')).toBe('kancelaria');
  });

  it('Store schema → sklep', () => {
    expect(resolveBusinessDescriptor({ schemaTypes: ['Store'] }, [], 'local_business')).toBe('sklep');
  });

  it('RealEstateAgent schema → biuro nieruchomości', () => {
    expect(resolveBusinessDescriptor({ schemaTypes: ['RealEstateAgent'] }, [], 'local_business')).toBe('biuro nieruchomości');
  });

  it('FinancialService schema → firma finansowa', () => {
    expect(resolveBusinessDescriptor({ schemaTypes: ['FinancialService'] }, [], 'local_business')).toBe('firma finansowa');
  });

  it('EducationalOrganization schema → szkoła', () => {
    expect(resolveBusinessDescriptor({ schemaTypes: ['EducationalOrganization'] }, [], 'local_business')).toBe('szkoła');
  });

  it('Hotel schema → hotel', () => {
    expect(resolveBusinessDescriptor({ schemaTypes: ['Hotel'] }, [], 'local_business')).toBe('hotel');
  });

  // ── SaaS schema + keyword enrichment ─────────────────────────────────────

  it('SoftwareApplication schema + CRM keyword → narzędzie CRM', () => {
    expect(resolveBusinessDescriptor({ schemaTypes: ['SoftwareApplication'] }, ['CRM'], 'saas')).toBe('narzędzie CRM');
  });

  it('WebApplication schema + project management keyword → narzędzie do zarządzania projektami', () => {
    expect(
      resolveBusinessDescriptor({ schemaTypes: ['WebApplication'] }, ['project management'], 'saas'),
    ).toBe('narzędzie do zarządzania projektami');
  });

  it('SoftwareApplication schema, no keyword → narzędzie', () => {
    expect(resolveBusinessDescriptor({ schemaTypes: ['SoftwareApplication'] }, [], 'saas')).toBe('narzędzie');
  });

  // ── Keyword-only (no schema) ──────────────────────────────────────────────

  it('no schema, CRM keyword, saas → narzędzie CRM', () => {
    expect(resolveBusinessDescriptor(emptyScraped, ['CRM system'], 'saas')).toBe('narzędzie CRM');
  });

  it('no schema, marketing keyword, saas → narzędzie marketingowe', () => {
    expect(resolveBusinessDescriptor(emptyScraped, ['marketing automation'], 'saas')).toBe('narzędzie do marketing automation');
  });

  it('no schema, SEO keyword, saas → narzędzie SEO', () => {
    expect(resolveBusinessDescriptor(emptyScraped, ['seo'], 'saas')).toBe('narzędzie SEO');
  });

  // ── Fallbacks ─────────────────────────────────────────────────────────────

  it('no schema, no keywords, local_business → firma', () => {
    expect(resolveBusinessDescriptor(emptyScraped, [], 'local_business')).toBe('firma');
  });

  it('no schema, no keywords, saas → narzędzie', () => {
    expect(resolveBusinessDescriptor(emptyScraped, [], 'saas')).toBe('narzędzie');
  });

  it('unknown schema type falls through to fallback', () => {
    expect(resolveBusinessDescriptor({ schemaTypes: ['UnknownType'] }, [], 'local_business')).toBe('firma');
  });
});

describe('pluralize', () => {
  it('restauracja → restauracji', () => {
    expect(pluralize('restauracja')).toBe('restauracji');
  });

  it('warsztat samochodowy → warsztatów samochodowych', () => {
    expect(pluralize('warsztat samochodowy')).toBe('warsztatów samochodowych');
  });

  it('kancelaria → kancelarii', () => {
    expect(pluralize('kancelaria')).toBe('kancelarii');
  });

  it('gabinet → gabinetów', () => {
    expect(pluralize('gabinet')).toBe('gabinetów');
  });

  it('narzędzie → narzędzi', () => {
    expect(pluralize('narzędzie')).toBe('narzędzi');
  });

  it('narzędzie CRM → narzędzi CRM', () => {
    expect(pluralize('narzędzie CRM')).toBe('narzędzi CRM');
  });

  it('platforma e-commerce → platform e-commerce', () => {
    expect(pluralize('platforma e-commerce')).toBe('platform e-commerce');
  });

  it('firma → firm', () => {
    expect(pluralize('firma')).toBe('firm');
  });

  it('hotel → hoteli', () => {
    expect(pluralize('hotel')).toBe('hoteli');
  });
});
