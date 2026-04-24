import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { eq } from "drizzle-orm";
import {
  connectNeon,
  loadEnv,
  loadBusinessProfile,
  logger,
  schema,
  toFormFillerTokens,
} from "@1commerce/spire";

// Belt-and-suspenders check before any citation bundle goes out. Loads the
// business profile (which runs assertNapConsistency automatically), then
// prints a side-by-side view of the tokens every submitter would render
// with. Exits non-zero if anything is wrong.

const here = dirname(fileURLToPath(import.meta.url));
const defaultProfilePath = join(
  here,
  "..",
  "..",
  "config",
  "business-profile.json"
);

export async function validateNapCommand(): Promise<void> {
  const path = process.env.BUSINESS_PROFILE_PATH ?? defaultProfilePath;
  const profile = loadBusinessProfile(path);
  const tokens = toFormFillerTokens(profile);

  logger.info(
    {
      path,
      legal_name: profile.legal.name,
      display_name: profile.display.name,
      address: `${profile.address.line_1}, ${profile.address.city}, ${profile.address.region} ${profile.address.postal_code}, ${profile.address.country}`,
      phone_display: profile.phone.display,
      phone_e164: profile.phone.e164,
      website: profile.web.primary,
    },
    "Business profile loaded + NAP consistency verified"
  );

  logger.info(
    tokens,
    "Form-filler tokens (what every Playwright form submitter will fill)"
  );

  // Cross-check against any verification flags that say "pending" — those
  // are the manual tier-1 claims Keith still needs to complete.
  const pending = Object.entries(profile.verification).filter(
    ([, status]) => status === "pending"
  );
  if (pending.length > 0) {
    logger.warn(
      { pending: pending.map(([k]) => k) },
      "Verification still pending — complete these manually before tier-2 (BrightLocal) submissions to avoid NAP drift across networks"
    );
  }

  // Sanity-check that none of the directory seed rows reference NAP tokens
  // for slots the profile doesn't populate. Catches typos in seed.json
  // without waiting for a submission to fail in production.
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const rows = await db
      .select({
        slug: schema.directories.slug,
        methodConfig: schema.directories.methodConfig,
      })
      .from(schema.directories)
      .where(eq(schema.directories.active, true));

    const unknownTokens: Array<{ directory: string; token: string }> = [];
    const knownTokenNames = new Set(Object.keys(tokens));
    const tokenRe = /\{([a-z_][a-z0-9_]*)\}/gi;

    for (const r of rows) {
      const cfgJson = JSON.stringify(r.methodConfig);
      let m: RegExpExecArray | null;
      while ((m = tokenRe.exec(cfgJson)) !== null) {
        const key = m[1]!;
        // Skip payload-sourced tokens (product_name, tagline, description, etc)
        // and any key that has a payload equivalent.
        if (
          knownTokenNames.has(key) ||
          [
            "product_name",
            "tagline",
            "description",
            "url",
            "pricing_url",
            "demo_url",
            "logo_url",
            "cover_image_url",
            "categories",
            "tags",
            "contact_email",
            "submit_url",
          ].includes(key)
        ) {
          continue;
        }
        unknownTokens.push({ directory: r.slug, token: key });
      }
    }

    if (unknownTokens.length > 0) {
      logger.warn(
        { unknownTokens: unknownTokens.slice(0, 20) },
        "Directory configs reference tokens that neither the business profile nor SubmissionPayload provides — fix these before submitting"
      );
      process.exit(1);
    }
    logger.info("All active directories reference only known tokens ✓");
  } finally {
    await raw.end({ timeout: 5 });
  }
}
