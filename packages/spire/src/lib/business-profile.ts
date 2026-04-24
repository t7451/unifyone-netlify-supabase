import { readFileSync } from "node:fs";
import { z } from "zod";

// The single source of truth for every Name / Address / Phone (NAP) token
// that leaves the system. The file lives at
// apps/spire-admin/config/business-profile.json; BUSINESS_PROFILE_PATH env
// var points at it. One typo here propagates to every citation, so every
// field is zod-validated and assertNapConsistency() is called on load.

export const BusinessProfileSchema = z
  .object({
    version: z.number().int().min(1),
    updated_at: z.string(),
    legal: z.object({
      name: z.string().min(1),
      formation_state: z.string().length(2),
      ein_masked: z.string().nullable(),
    }),
    display: z.object({
      name: z.string().min(1),
      short_name: z.string().min(1),
      brand_parent: z.string().min(1),
    }),
    address: z.object({
      line_1: z.string().min(1),
      line_2: z.string().nullable(),
      city: z.string().min(1),
      region: z.string().length(2),
      postal_code: z.string().min(3),
      country: z.string().length(2),
      geo: z.object({
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
      }),
    }),
    phone: z.object({
      display: z.string().min(7),
      e164: z.string().regex(/^\+[1-9]\d{6,14}$/, {
        message:
          "phone.e164 must be valid E.164 format (+<country><subscriber>)",
      }),
    }),
    email: z.object({
      public: z.string().email(),
      support: z.string().email(),
      press: z.string().email(),
    }),
    web: z.object({
      primary: z.string().url(),
      alt_domains: z.array(z.string().url()).default([]),
    }),
    categories: z.object({
      primary: z.string().min(1),
      secondary: z.array(z.string()).default([]),
    }),
    description: z.object({
      short: z.string().min(30).max(200),
      medium: z.string().min(100).max(500),
      long: z.string().min(200).max(1500),
    }),
    founded: z
      .string()
      .regex(/^\d{4}$/, { message: "founded must be a 4-digit year" }),
    hours: z
      .object({
        type: z.string(),
        open_24_7: z.boolean().optional(),
        note: z.string().optional(),
      })
      .passthrough(),
    social: z
      .object({
        twitter: z.string().url().nullable().optional(),
        linkedin: z.string().url().nullable().optional(),
        facebook: z.string().url().nullable().optional(),
        instagram: z.string().url().nullable().optional(),
        github: z.string().url().nullable().optional(),
      })
      .passthrough(),
    verification: z.record(z.string(), z.string()),
  })
  .passthrough();

export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;

// Cache keyed on path so multiple processes (tests, different submitters in
// one worker) reading the same profile share a validated copy.
const cache = new Map<string, BusinessProfile>();

export function loadBusinessProfile(path: string): BusinessProfile {
  const cached = cache.get(path);
  if (cached) return cached;
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const parsed = BusinessProfileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid business profile at ${path}: ${parsed.error.issues
        .map(i => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`
    );
  }
  assertNapConsistency(parsed.data);
  cache.set(path, parsed.data);
  return parsed.data;
}

/**
 * Belt-and-suspenders consistency checks. Run on every load; failures stop
 * the worker before anything propagates bad data to 30 citations.
 */
export function assertNapConsistency(p: BusinessProfile): void {
  // 1. Phone display digits must match the E.164 digits.
  const displayDigits = p.phone.display.replace(/\D/g, "");
  const e164Digits = p.phone.e164.replace(/\D/g, "");
  if (!e164Digits.endsWith(displayDigits)) {
    throw new Error(
      `NAP inconsistency: phone.display "${p.phone.display}" digits (${displayDigits}) ` +
        `do not match phone.e164 "${p.phone.e164}" digits (${e164Digits})`
    );
  }

  // 2. Primary URL's host must not duplicate alt_domains (avoids submitting
  //    both as if they were separate brands).
  try {
    const primaryHost = new URL(p.web.primary).host.replace(/^www\./, "");
    for (const alt of p.web.alt_domains ?? []) {
      const altHost = new URL(alt).host.replace(/^www\./, "");
      if (altHost === primaryHost) {
        throw new Error(
          `NAP inconsistency: web.primary and alt_domains both list "${primaryHost}"`
        );
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NAP inconsistency:"))
      throw err;
    throw new Error(
      `NAP inconsistency: web.primary or alt_domains contain an unparseable URL: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 3. Address region and country must match the standard postal code
  //    length for US (5 or 9 digits). Other countries loosen this check.
  if (p.address.country === "US") {
    const zip = p.address.postal_code.replace(/\D/g, "");
    if (zip.length !== 5 && zip.length !== 9) {
      throw new Error(
        `NAP inconsistency: US postal_code "${p.address.postal_code}" is not 5 or 9 digits`
      );
    }
  }
}

/** Test helper — reset the cache so a test can mutate the file and reload. */
export function _resetBusinessProfileCache(): void {
  cache.clear();
}
