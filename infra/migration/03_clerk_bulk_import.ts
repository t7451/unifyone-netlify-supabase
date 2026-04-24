// 03_clerk_bulk_import.ts — create Clerk users for every legacy auth.users row.
//
// Reads:  exports/auth_users.csv
// Writes: exports/user_mapping.jsonl (one JSON object per line), Clerk API
//
// Idempotent:
//   - If a user with the same email already exists in Clerk, we reuse it and
//     still record the mapping.
//   - If a user was already created in a previous run (identified by
//     externalId = supabase_uid), we reuse it.
//   - On re-run, exports/user_mapping.jsonl is truncated and rebuilt from
//     scratch so the downstream 04:map step sees a consistent snapshot.
//
// Safety:
//   - Respects DRY_RUN=true — logs intent, writes nothing.
//   - Respects CLERK_RPS — token bucket keeps calls under Clerk's 20 rps cap.
//   - Clerk users are created WITHOUT a password (skipPasswordRequirement) —
//     returning users log in via magic link. The cutover runbook warns users
//     of this in a T-24h email.

import { createClerkClient } from "@clerk/backend";
import { readFileSync, existsSync, createWriteStream } from "node:fs";
import { logger, dryRunBanner } from "./lib/logger.js";
import { paths } from "./lib/paths.js";
import { loadEnv } from "./lib/env.js";
import { createTokenBucket } from "./lib/rate-limit.js";

type AuthUser = {
  id: string;
  email: string;
  created_at: string;
  raw_user_meta_data: string;
};

function parseCsv(text: string): AuthUser[] {
  const rows: AuthUser[] = [];
  const lines = splitCsvLines(text);
  if (lines.length === 0) return rows;
  const header = parseCsvLine(lines[0]!);
  const col = (name: string) => {
    const idx = header.indexOf(name);
    if (idx < 0) throw new Error(`auth_users.csv missing column: ${name}`);
    return idx;
  };
  const idIdx = col("id");
  const emailIdx = col("email");
  const createdIdx = col("created_at");
  const metaIdx = col("raw_user_meta_data");
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || line.length === 0) continue;
    const fields = parseCsvLine(line);
    rows.push({
      id: fields[idIdx] ?? "",
      email: (fields[emailIdx] ?? "").toLowerCase().trim(),
      created_at: fields[createdIdx] ?? "",
      raw_user_meta_data: fields[metaIdx] ?? "{}",
    });
  }
  return rows;
}

function splitCsvLines(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      cur += ch;
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (cur.length > 0) out.push(cur);
      cur = "";
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      continue;
    }
    cur += ch;
  }
  if (cur.length > 0) out.push(cur);
  return out;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  fields.push(cur);
  return fields;
}

async function main() {
  const env = loadEnv(["CLERK_SECRET_KEY", "DRY_RUN", "CLERK_RPS"] as const);
  dryRunBanner(env.DRY_RUN);

  if (!existsSync(paths.authUsersCsv)) {
    logger.error(
      { expected: paths.authUsersCsv },
      "Missing auth_users.csv. Run `pnpm 01:export`."
    );
    process.exit(2);
  }

  const users = parseCsv(readFileSync(paths.authUsersCsv, "utf8"));
  logger.info({ total: users.length }, "Loaded auth users for Clerk import");

  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  const bucket = createTokenBucket(env.CLERK_RPS);

  const stats = {
    scanned: 0,
    created: 0,
    reusedExistingEmail: 0,
    reusedExistingExternalId: 0,
    failed: 0,
  };
  const failures: Array<{ email: string; reason: string }> = [];

  const mappingStream = env.DRY_RUN
    ? null
    : createWriteStream(paths.userMappingJsonl, { flags: "w" });

  for (const u of users) {
    stats.scanned += 1;

    if (!u.email || !u.id) {
      stats.failed += 1;
      failures.push({
        email: u.email,
        reason: "missing email or id (should have been caught by 02:audit)",
      });
      continue;
    }

    try {
      // 1. Check externalId — if we created the user in a previous run of this
      //    script, they'll have externalId = supabase uid.
      await bucket.take();
      const byExternal = await clerk.users.getUserList({
        externalId: [u.id],
        limit: 1,
      });
      if (byExternal.totalCount > 0) {
        const existing = byExternal.data[0]!;
        stats.reusedExistingExternalId += 1;
        mappingStream?.write(
          JSON.stringify({
            supabase_uid: u.id,
            clerk_user_id: existing.id,
            email: u.email,
            source: "existing_by_external_id",
          }) + "\n"
        );
        logger.debug(
          { email: u.email, clerk_user_id: existing.id },
          "Reused existing Clerk user by externalId"
        );
        continue;
      }

      // 2. Check email — covers users who signed up fresh on the preview URL
      //    during Batch 01 before the migration ran.
      await bucket.take();
      const byEmail = await clerk.users.getUserList({
        emailAddress: [u.email],
        limit: 1,
      });
      if (byEmail.totalCount > 0) {
        const existing = byEmail.data[0]!;
        stats.reusedExistingEmail += 1;
        mappingStream?.write(
          JSON.stringify({
            supabase_uid: u.id,
            clerk_user_id: existing.id,
            email: u.email,
            source: "existing_by_email",
          }) + "\n"
        );
        logger.debug(
          { email: u.email, clerk_user_id: existing.id },
          "Reused existing Clerk user by email"
        );
        continue;
      }

      // 3. Create.
      if (env.DRY_RUN) {
        logger.info(
          { email: u.email, supabase_uid: u.id },
          "[DRY RUN] would create Clerk user"
        );
        continue;
      }

      await bucket.take();
      const created = await clerk.users.createUser({
        emailAddress: [u.email],
        skipPasswordRequirement: true,
        externalId: u.id,
        publicMetadata: {
          migratedFrom: "supabase",
          migratedAt: new Date().toISOString(),
          legacyCreatedAt: u.created_at,
        },
      });
      stats.created += 1;
      mappingStream?.write(
        JSON.stringify({
          supabase_uid: u.id,
          clerk_user_id: created.id,
          email: u.email,
          source: "created",
        }) + "\n"
      );
      if (stats.created % 25 === 0) {
        logger.info(stats, "progress");
      }
    } catch (err) {
      stats.failed += 1;
      const reason = err instanceof Error ? err.message : String(err);
      failures.push({ email: u.email, reason });
      logger.error({ email: u.email, reason }, "Clerk import failed for user");
    }
  }

  mappingStream?.end();

  logger.info(stats, "Clerk import complete");

  if (failures.length > 0) {
    logger.error(
      { failureCount: failures.length, sample: failures.slice(0, 10) },
      "Failures (first 10) — resolve before proceeding to 04:map"
    );
    process.exit(1);
  }

  if (env.DRY_RUN) {
    logger.warn(
      "DRY RUN — no mapping file was written. Re-run with DRY_RUN=false to persist."
    );
    return;
  }

  logger.info(
    { path: paths.userMappingJsonl },
    "Mapping written. Next: pnpm 04:map"
  );
}

main().catch(err => {
  logger.fatal(err, "Clerk import crashed");
  process.exit(1);
});
