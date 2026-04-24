import { z } from "zod";

// Directory method-config shapes. Consumers of spire_directories.method_config
// must parse against the matching schema — the jsonb column is untyped on the
// Postgres side and shape drift happens.

// --- Form method (Playwright) ---
const FormStep = z.discriminatedUnion("type", [
  z.object({ type: z.literal("navigate"), url: z.string() }),
  z.object({
    type: z.literal("wait_for_selector"),
    selector: z.string(),
    timeoutMs: z.number().int().optional(),
  }),
  z.object({
    type: z.literal("fill"),
    selector: z.string(),
    value: z.string(),
  }),
  z.object({ type: z.literal("click"), selector: z.string() }),
  z.object({
    type: z.literal("select"),
    selector: z.string(),
    value: z.string(),
  }),
  z.object({
    type: z.literal("upload"),
    selector: z.string(),
    filePath: z.string(),
  }),
  z.object({ type: z.literal("screenshot"), path: z.string().optional() }),
  z.object({
    type: z.literal("wait_ms"),
    ms: z.number().int().min(0).max(30_000),
  }),
]);
export type FormStep = z.infer<typeof FormStep>;

export const FormMethodConfigSchema = z.object({
  steps: z.array(FormStep).min(1),
  success_selector: z.string().optional(),
  requires_auth: z.boolean().default(false),
  auth_hint: z.string().optional(),
  /** Encrypted Playwright storageState JSON, set by `spire auth <slug>`. */
  storage_state_encrypted: z.string().optional(),
});
export type FormMethodConfig = z.infer<typeof FormMethodConfigSchema>;

// --- API method (HTTP) ---
export const ApiMethodConfigSchema = z.object({
  /** Directory identifier the submitter switch statement dispatches on. */
  endpoint: z.enum([
    "google_business_profile",
    "bing_places",
    "devto",
    "hashnode",
    "generic_rest",
  ]),
  /** Optional raw URL used by the generic_rest endpoint. */
  url: z.string().url().optional(),
  /** Field mapping from the payload (product_name, tagline, ...) to the
   *  directory's request body keys. */
  mapping: z.record(z.string(), z.string()).optional(),
  /** Arbitrary directory-specific options. */
  options: z.record(z.string(), z.unknown()).optional(),
});
export type ApiMethodConfig = z.infer<typeof ApiMethodConfigSchema>;

// --- Email method (Resend) ---
export const EmailMethodConfigSchema = z.object({
  to_address: z.string().email(),
  subject_template: z.string().min(1),
  /** Handlebars-lite — `{name}`, `{url}`, `{pitch}` — substituted against the payload. */
  body_template: z.string().min(50),
  reply_to: z.string().email().optional(),
});
export type EmailMethodConfig = z.infer<typeof EmailMethodConfigSchema>;

// --- Manual method (generates a draft for a human to post) ---
export const ManualMethodConfigSchema = z.object({
  venue: z.string().min(1), // "r/SideProject", "Hacker News", "Lobste.rs"
  /** Title template */
  title_template: z.string().min(1),
  /** Body template */
  body_template: z.string().min(1),
  guidance: z.string().min(1), // one-sentence reminder about that venue's norms
});
export type ManualMethodConfig = z.infer<typeof ManualMethodConfigSchema>;

// --- Submission payload (what every submitter receives) ---
// The payload is built by renderers/{site-slug}.ts — one renderer per site
// because the site's hero/tagline/copy differ. All renderers output this
// same shape.
export const SubmissionPayloadSchema = z.object({
  product_name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(40),
  url: z.string().url(),
  pricing_url: z.string().url().optional(),
  demo_url: z.string().url().optional(),
  logo_url: z.string().url().optional(),
  cover_image_url: z.string().url().optional(),
  categories: z.array(z.string()).min(1),
  /** Free-form tags — different directories use different ones. */
  tags: z.array(z.string()).default([]),
  /** Contact point for email submissions / approval follow-up. */
  contact_email: z.string().email(),
});
export type SubmissionPayload = z.infer<typeof SubmissionPayloadSchema>;

// --- Directory config loader schema (seed.json shape) ---
export const DirectorySeedEntrySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  submit_url: z.string().url().optional(),
  method: z.enum(["api", "form", "email", "manual"]),
  method_config: z.record(z.string(), z.unknown()), // parsed per-method at use time
  authority: z.number().int().min(0).max(100).optional(),
  category: z.array(z.string()).min(1),
  cooldown_days: z.number().int().min(0).max(3650).default(90),
  active: z.boolean().default(true),
});
export type DirectorySeedEntry = z.infer<typeof DirectorySeedEntrySchema>;

export const DirectorySeedSchema = z.object({
  directories: z.array(DirectorySeedEntrySchema).min(1),
});
export type DirectorySeed = z.infer<typeof DirectorySeedSchema>;
