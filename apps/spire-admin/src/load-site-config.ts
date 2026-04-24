import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
// src/ → apps/spire-admin/ → config/sites/
const configDir = join(here, "..", "config", "sites");

const SiteConfigSchema = z.object({
  slug: z.string().min(1),
  domain: z.string().min(1),
  repo: z.string().min(1),
  content_path: z.string().min(1),
  brand_brief_key: z.string().min(1),
  niche: z.string().min(1),
  target_audiences: z.array(z.string().min(1)).min(1),
  seed_keywords: z.array(z.string().min(1)).min(5),
  autopublish: z.boolean(),
  autopublish_quality_threshold: z.number().int().min(0).max(100),
});

export type SiteConfig = z.infer<typeof SiteConfigSchema>;

export function loadSiteConfig(siteSlug: string): SiteConfig {
  const path = join(configDir, `${siteSlug}.json`);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(
      `Site config not found at ${path}. Expected config/sites/${siteSlug}.json relative to apps/spire-admin/.`
    );
  }
  const parsed = SiteConfigSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(
      `Invalid config/sites/${siteSlug}.json: ${parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}`
    );
  }
  return parsed.data;
}
