import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  DirectorySeedSchema,
  logger,
  schema,
  connectNeon,
  loadEnv,
} from "@1commerce/spire";

// Reads apps/spire-admin/config/directories/seed.json and upserts into
// spire_directories. Idempotent — re-running updates authority/category
// but preserves an existing method_config if the seed entry omits it
// (so ops-level tweaks made directly to the DB aren't clobbered).

const here = dirname(fileURLToPath(import.meta.url));
// src/commands → src → apps/spire-admin
const configPath = join(here, "..", "..", "config", "directories", "seed.json");

export async function seedDirectoriesCommand(): Promise<void> {
  const raw = readFileSync(configPath, "utf8");
  const parsed = DirectorySeedSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(
      `Invalid config/directories/seed.json: ${parsed.error.issues
        .map(
          (i: { path: (string | number)[]; message: string }) =>
            `${i.path.join(".")}: ${i.message}`
        )
        .join("; ")}`
    );
  }

  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);

  try {
    let created = 0;
    let updated = 0;
    for (const entry of parsed.data.directories) {
      const values = {
        slug: entry.slug,
        name: entry.name,
        url: entry.url,
        submitUrl: entry.submit_url ?? null,
        method: entry.method,
        methodConfig: entry.method_config,
        authority: entry.authority ?? null,
        category: entry.category,
        active: entry.active,
        cooldownDays: entry.cooldown_days,
      };
      const result = await db
        .insert(schema.directories)
        .values(values)
        .onConflictDoUpdate({
          target: schema.directories.slug,
          set: {
            name: values.name,
            url: values.url,
            submitUrl: values.submitUrl,
            method: values.method,
            // method_config: do NOT overwrite — auth state, storage tokens, and
            // ops-level tweaks accumulate there. Seed only sets it on insert.
            authority: values.authority,
            category: values.category,
            active: values.active,
            cooldownDays: values.cooldownDays,
          },
        })
        .returning({
          id: schema.directories.id,
          createdAt: schema.directories.createdAt,
        });

      const row = result[0];
      if (!row) continue;
      const ageMs = Date.now() - row.createdAt.getTime();
      if (ageMs < 2000) created += 1;
      else updated += 1;
    }
    logger.info(
      { total: parsed.data.directories.length, created, updated },
      "Directories seeded"
    );
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}
