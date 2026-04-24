import type { BusinessProfile } from "../../lib/business-profile.js";

// Directory-specific payload shape helpers. Every submitter that needs NAP
// fields imports one of these; nobody constructs address/phone strings
// inline. One typo → one place to fix.

// --- Playwright / form-filler token map ---
// Merged with SubmissionPayload tokens inside form.ts's substituteTemplate.
// Keep token names stable — the seed.json steps reference them directly.
export function toFormFillerTokens(p: BusinessProfile): Record<string, string> {
  return {
    legal_name: p.legal.name,
    display_name: p.display.name,
    short_name: p.display.short_name,
    address_line_1: p.address.line_1,
    address_line_2: p.address.line_2 ?? "",
    city: p.address.city,
    region: p.address.region,
    postal_code: p.address.postal_code,
    country: p.address.country,
    phone_display: p.phone.display,
    phone_e164: p.phone.e164,
    website: p.web.primary,
    public_email: p.email.public,
    support_email: p.email.support,
    description_short: p.description.short,
    description_medium: p.description.medium,
    description_long: p.description.long,
    primary_category: p.categories.primary,
    founded: p.founded,
  };
}

// --- Google Business Profile API payload shape ---
// Not implemented yet (method=google_business_profile returns `unsupported`
// pending OAuth + verified business), but the shape is defined so the
// submitter switch has somewhere to point.
export function toGooglePlacesPayload(p: BusinessProfile) {
  return {
    title: p.display.name,
    storefrontAddress: {
      addressLines: [
        p.address.line_1,
        ...(p.address.line_2 ? [p.address.line_2] : []),
      ],
      locality: p.address.city,
      administrativeArea: p.address.region,
      postalCode: p.address.postal_code,
      regionCode: p.address.country,
    },
    phoneNumbers: { primaryPhone: p.phone.e164 },
    websiteUri: p.web.primary,
    profile: {
      description: p.description.long.slice(0, 750), // GBP cap
    },
    categories: {
      primaryCategory: { displayName: p.categories.primary },
      additionalCategories: p.categories.secondary.map(displayName => ({
        displayName,
      })),
    },
  };
}

// --- BrightLocal citation order payload ---
// Matches the `/citations/order` body shape expected by BrightLocal's v4
// API. Keeps field names in snake_case per the API contract.
export function toBrightLocalPayload(p: BusinessProfile) {
  return {
    business_name: p.legal.name,
    display_name: p.display.name,
    address_line_1: p.address.line_1,
    address_line_2: p.address.line_2,
    city: p.address.city,
    region: p.address.region,
    postal_code: p.address.postal_code,
    country: p.address.country,
    phone: p.phone.display,
    phone_e164: p.phone.e164,
    website: p.web.primary,
    email: p.email.public,
    description: p.description.medium,
    categories: [p.categories.primary, ...p.categories.secondary],
    year_established: Number(p.founded),
    hours: {
      type: p.hours.type,
      open_24_7: Boolean(p.hours.open_24_7),
    },
  };
}

// --- Schema.org LocalBusiness / Organization JSON-LD ---
// Injected into apps/unifyone/src/layouts/Base.astro <head>. Callers
// serialize via the same safe-serializer Base.astro already uses for the
// other JSON-LD blocks.
export function toLocalBusinessJsonLd(
  p: BusinessProfile
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: p.legal.name,
    alternateName: p.display.short_name,
    legalName: p.legal.name,
    url: p.web.primary,
    logo: `${p.web.primary.replace(/\/$/, "")}/favicon.svg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: p.address.line_1,
      addressLocality: p.address.city,
      addressRegion: p.address.region,
      postalCode: p.address.postal_code,
      addressCountry: p.address.country,
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: p.phone.e164,
      contactType: "customer service",
      email: p.email.public,
      areaServed: p.address.country,
      availableLanguage: ["English"],
    },
    foundingDate: p.founded,
    description: p.description.medium,
    sameAs: Object.values(p.social).filter(
      (v): v is string => typeof v === "string" && v.length > 0
    ),
  };
}
