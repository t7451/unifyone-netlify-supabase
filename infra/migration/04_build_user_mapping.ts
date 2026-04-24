// 04_build_user_mapping.ts — persist the Supabase → Clerk mapping to Neon.
//
// Reads:
//   - exports/user_mapping.jsonl  (produced by 03_clerk_bulk_import.ts)
//   - Neon `users` table          (webhook-mirrored rows, possibly including
//                                   users who signed up fresh on the preview URL)
//
// Writes:
//   - Neon `_migration_user_map`  (idempotent upsert)
//
// Validates (fails loudly):
//   - No duplicate supabase_uid in JSONL
//   - No duplicate clerk_user_id in JSONL
//   - No duplicate email (case-insensitive) in JSONL
//   - Every row's clerk_user_id has a corresponding row in Neon `users`
//     (clerk webhook should have mirrored it; if missing, either the webhook
//     isn't firing against this environment or the mapping is stale)

import { readFileSync, existsSync } from "node:fs";
import { z } from "zod";
import { logger, dryRunBanner } from "./lib/logger.js";
import { paths } from "./lib/paths.js";
import { loadEnv } from "./lib/env.js";
import { connectNeon } from "./lib/db.js";

const MappingLineSchema = z.object({
  supabase_uid: z.string().uuid(),
  clerk_user_id: z.string().min(1),
  email: z.string().email(),
  source: z.enum(["created", "existing_by_email", "existing_by_external_id"]),
});

type MappingLine = z.infer<typeof MappingLineSchema>;

function loadMappingJsonl(path: string): MappingLine[] {
  if (!existsSync(path)) {
    throw new Error(
      `user_mapping.jsonl missing at ${path}. Run 03_clerk_bulk_import.ts with DRY_RUN=false first.`
    );
  }
  const lines = readFileSync(path, "utf8")
    .split("\n")
    .filter(l => l.trim().length > 0);
  return lines.map((line, idx) => {
    try {
      return MappingLineSchema.parse(JSON.parse(line));
    } catch (err) {
      throw new Error(
        `user_mapping.jsonl line ${idx + 1} is invalid: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  });
}

function assertUnique(mapping: MappingLine[]): void {
  const errors: string[] = [];
  const seenUid = new Map<string, number>();
  const seenClerk = new Map<string, number>();
  const seenEmail = new Map<string, number>();
  mapping.forEach((row, i) => {
    const uidPrev = seenUid.get(row.supabase_uid);
    if (uidPrev !== undefined)
      errors.push(
        `supabase_uid ${row.supabase_uid} appears on lines ${uidPrev + 1} and ${i + 1}`
      );
    else seenUid.set(row.supabase_uid, i);

    const clerkPrev = seenClerk.get(row.clerk_user_id);
    if (clerkPrev !== undefined)
      errors.push(
        `clerk_user_id ${row.clerk_user_id} appears on lines ${clerkPrev + 1} and ${i + 1}`
      );
    else seenClerk.set(row.clerk_user_id, i);

    const emailLower = row.email.toLowerCase();
    const emailPrev = seenEmail.get(emailLower);
    if (emailPrev !== undefined)
      errors.push(
        `email ${emailLower} appears on lines ${emailPrev + 1} and ${i + 1}`
      );
    else seenEmail.set(emailLower, i);
  });
  if (errors.length > 0) {
    throw new Error(`Mapping integrity violations:\n  ${errors.join("\n  ")}`);
  }
}

async function main() {
  const env = loadEnv(["NEON_DATABASE_URL", "DRY_RUN"] as const);
  dryRunBanner(env.DRY_RUN);

  const mapping = loadMappingJsonl(paths.userMappingJsonl);
  logger.info({ total: mapping.length }, "Loaded mapping rows");

  assertUnique(mapping);
  logger.info("Uniqueness checks passed ✓");

  const sql = connectNeon(env.NEON_DATABASE_URL);
  try {
    // Confirm _migration_user_map exists — points operator at the SQL step if not.
    const tableExists = await sql<Array<{ exists: boolean }>>`select exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = '_migration_user_map'
      ) as exists`;
    if (!tableExists[0]?.exists) {
      throw new Error(
        '_migration_user_map does not exist. Run: psql "$NEON_DATABASE_URL" -f infra/neon/0002_migration_helpers.sql'
      );
    }

    // Cross-check against Neon users. clerk webhook should have mirrored each
    // user we mapped. Log missing so the operator can investigate the webhook
    // or re-trigger it before proceeding.
    const clerkIds = mapping.map(m => m.clerk_user_id);
    const present = await sql<
      Array<{ id: string }>
    >`select id from users where id = any(${clerkIds}::text[])`;
    const presentSet = new Set(present.map(r => r.id));
    const missing = mapping.filter(m => !presentSet.has(m.clerk_user_id));
    if (missing.length > 0) {
      logger.warn(
        {
          missingCount: missing.length,
          sample: missing.slice(0, 10).map(m => m.email),
        },
        "Mapped Clerk users not yet in Neon `users` table. Verify Clerk webhook → /api/clerk-webhook is reachable and signed correctly."
      );
      // Non-fatal in dry run; fatal in live run — we rely on user FK in credit_ledger.
      if (!env.DRY_RUN) {
        throw new Error(
          "Mapping references Clerk users that the webhook has not mirrored to Neon yet. Fix the webhook, wait for backfill, and re-run 04:map."
        );
      }
    }

    if (env.DRY_RUN) {
      logger.info(
        { wouldInsert: mapping.length },
        "[DRY RUN] would upsert mapping rows"
      );
      return;
    }

    // Chunked upsert so we don't build an absurdly large parameter list.
    const CHUNK = 500;
    let upserted = 0;
    for (let i = 0; i < mapping.length; i += CHUNK) {
      const batch = mapping.slice(i, i + CHUNK);
      await sql`
        insert into _migration_user_map ${sql(batch, "supabase_uid", "clerk_user_id", "email")}
        on conflict (supabase_uid) do update set
          clerk_user_id = excluded.clerk_user_id,
          email = excluded.email,
          mapped_at = now()
      `;
      upserted += batch.length;
    }
    logger.info({ upserted }, "Mapping persisted to Neon _migration_user_map");
  } finally {
    await sql.end({ timeout: 5 });
  }

  logger.info("Next: pnpm 05:import");
}

main().catch(err => {
  logger.fatal(err, "Mapping build crashed");
  process.exit(1);
});
