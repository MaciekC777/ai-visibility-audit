import * as cheerio from 'cheerio';

export interface SchemaAddress {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
}

export interface ParsedSchema {
  types: string[];
  organization?: {
    name?: string;
    description?: string;
    address?: SchemaAddress;
    telephone?: string;
  };
  localBusiness?: {
    name?: string;
    address?: SchemaAddress;
    telephone?: string;
    openingHours?: string[];
  };
  softwareApplication?: {
    name?: string;
    applicationCategory?: string;
  };
  services?: string[];
}

const LOCAL_TYPES = new Set([
  'localbusiness', 'restaurant', 'store', 'foodestablishment',
  'healthandbeauty', 'automotivebusiness', 'realestateagent',
  'legalservice', 'medicalorganization', 'hotel', 'cafe',
  'beautysalon', 'dentist', 'doctor', 'bakery', 'barber',
]);

export function parseSchemas(html: string): ParsedSchema {
  const $ = cheerio.load(html);
  const result: ParsedSchema = { types: [] };

  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const raw = $(el).html();
      if (!raw) return;
      const data = JSON.parse(raw);
      const schemas = Array.isArray(data) ? data : [data];

      for (const schema of schemas) {
        const rawType = schema['@type'];
        if (!rawType) continue;
        const types: string[] = Array.isArray(rawType) ? rawType : [rawType];
        result.types.push(...types);

        for (const t of types) {
          const tl = t.toLowerCase();

          if (tl === 'organization' || tl === 'corporation') {
            result.organization = {
              name: schema.name,
              description: schema.description,
              address: schema.address ?? undefined,
              telephone: schema.telephone,
            };
          }

          if (LOCAL_TYPES.has(tl)) {
            result.localBusiness = {
              name: schema.name,
              address: schema.address ?? undefined,
              telephone: schema.telephone,
              openingHours: schema.openingHours,
            };
          }

          if (tl === 'softwareapplication' || tl === 'webapplication') {
            result.softwareApplication = {
              name: schema.name,
              applicationCategory: schema.applicationCategory,
            };
          }

          if (tl === 'service' || tl === 'product') {
            if (!result.services) result.services = [];
            if (schema.name) result.services.push(schema.name);
          }
        }
      }
    } catch {
      // Invalid JSON-LD — skip silently
    }
  });

  return result;
}
