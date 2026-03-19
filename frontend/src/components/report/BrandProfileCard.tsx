'use client';

import { BrandKnowledgeMap, AnyBrandProfile } from '@/types';

interface Props {
  brandProfile: AnyBrandProfile | null | undefined;
}

function isBrandKnowledgeMap(p: AnyBrandProfile): p is BrandKnowledgeMap {
  return 'brand_name' in p;
}

function Chip({ label }: { label: string }) {
  return (
    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200">
      {label}
    </span>
  );
}

function Row({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm text-gray-700">
      <span className="w-5 shrink-0 text-gray-400 text-base leading-none mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function BrandProfileCard({ brandProfile }: Props) {
  if (!brandProfile) return null;

  // Handle both BrandKnowledgeMap (new pipeline) and legacy BrandProfile
  let name = '';
  let description = '';
  let category = '';
  let subcategories: string[] = [];
  let businessType = '';
  let location: { city?: string | null; region?: string | null; country?: string | null } | null = null;
  let address: string | null = null;
  let phone: string | null = null;
  let email: string | null = null;
  let offerings: string[] = [];
  let pricingModel = '';
  let foundedYear: string | null = null;

  if (isBrandKnowledgeMap(brandProfile)) {
    const p = brandProfile;
    name = p.brand_name;
    description = p.one_liner;
    category = p.category;
    subcategories = p.subcategories ?? [];
    businessType = p.business_type;
    location = p.location ?? null;
    address = p.contact_info?.address ?? null;
    phone = p.contact_info?.phone ?? null;
    email = p.contact_info?.email ?? null;
    offerings = [
      ...(p.core_offerings ?? []),
      ...(p.key_features ?? []),
    ].slice(0, 8);
    pricingModel = p.pricing?.model ?? '';
    foundedYear = p.founding_year ?? null;
  } else {
    // Legacy BrandProfile
    const p = brandProfile as any;
    name = p.brand?.name ?? '';
    description = p.brand?.description ?? '';
    category = p.brand?.category ?? '';
    subcategories = p.brand?.subcategories ?? [];
    businessType = p.mode ?? '';
    location = p.location ?? null;
    address = p.location?.address ?? null;
    phone = p.contact?.phone ?? null;
    email = p.contact?.email ?? null;
    offerings = [
      ...(p.features?.core ?? []),
      ...(p.services?.primary ?? []),
    ].slice(0, 8);
    pricingModel = p.pricing?.model ?? '';
    foundedYear = p.brand?.founded_year ?? null;
  }

  const locationParts = [
    location?.city,
    location?.region,
    location?.country,
  ].filter(Boolean);
  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : null;

  const businessTypeLabel: Record<string, string> = {
    saas: 'SaaS',
    local_business: 'Local Business',
    local: 'Local Business',
    restaurant: 'Restaurant',
    ecommerce: 'E-commerce',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{name || '—'}</h2>
          {description && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-2xl">{description}</p>
          )}
        </div>
        {businessType && (
          <span className="shrink-0 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
            {businessTypeLabel[businessType] ?? businessType}
          </span>
        )}
      </div>

      {/* Details grid */}
      <div className="space-y-3">
        {(category || subcategories.length > 0) && (
          <Row icon="🏷">
            <span className="font-medium text-gray-800">{category}</span>
            {subcategories.length > 0 && (
              <span className="text-gray-400 ml-1">· {subcategories.join(', ')}</span>
            )}
          </Row>
        )}

        {locationStr && (
          <Row icon="📍">
            {locationStr}
            {address && <span className="block text-gray-500 text-xs mt-0.5">{address}</span>}
          </Row>
        )}

        {(phone || email) && (
          <Row icon="📞">
            <span className="space-x-4">
              {phone && <span>{phone}</span>}
              {email && <span className="text-blue-600">{email}</span>}
            </span>
          </Row>
        )}

        {pricingModel && (
          <Row icon="💳">
            {pricingModel}
            {foundedYear && <span className="text-gray-400 ml-3">· Founded {foundedYear}</span>}
          </Row>
        )}
        {!pricingModel && foundedYear && (
          <Row icon="📅">Founded {foundedYear}</Row>
        )}
      </div>

      {/* Offerings / features */}
      {offerings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Offerings & features
          </p>
          <div className="flex flex-wrap gap-1.5">
            {offerings.map((o, i) => (
              <Chip key={i} label={o} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
