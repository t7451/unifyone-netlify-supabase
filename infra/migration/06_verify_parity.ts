// 06_verify_parity.ts — confirm Neon matches the legacy data after migration.
//
// Reads:
//   - Neon (users, waitlist, credit_ledger, _migration_user_map, _migration_*_staging)
//   - exports/auth_users.csv
//   - exports/orphaned_credits.jsonl (if present)
//
// Writes:
//   - stdout pass/fail report
//   - exits non-zero on any failed check
//
// Read-only: no INSERT/UPDATE/DELETE against Neon.

import { readFileSync, existsSync } from "node:fs";
import { logger } from "./lib/logger.js";
import { paths } from "./lib/paths.js";
import { loadEnv } from "./lib/env.js";
import { connectNeon } from "./lib/db.js";

type Check = { name: string; ok: boolean; detail: string };

async function main() {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);

  if (!existsSync(paths.authUsersCsv)) {
    logger.error(
      { expected: paths.authUsersCsv },
      "Missing auth_users.csv — can't verify without the export manifest."
    );
    process.exit(2);
  }

  const legacyUserCount =
    readFileSync(paths.authUsersCsv, "utf8")
      .split("\n")
      .filter(l => l.trim().length > 0).length - 1;

  const sql = connectNeon(env.NEON_DATABASE_URL);
  const checks: Check[] = [];
  try {
    const [mapCountRow] = await sql<
      Array<{ count: number }>
    >`select count(*)::int as count from _migration_user_map`;
    const mapCount = mapCountRow?.count ?? 0;
    checks.push({
      name: "mapping row count ≥ legacy auth.users count",
      ok: mapCount >= legacyUserCount,
      detail: `mapping=${mapCount} legacy=${legacyUserCount}`,
    });

    const [mapOrphans] = await sql<Array<{ count: number }>>`
      select count(*)::int as count
      from _migration_user_map m
      where not exists (select 1 from users u where u.id = m.clerk_user_id)
    `;
    checks.push({
      name: "every mapped Clerk id has a matching users row",
      ok: (mapOrphans?.count ?? 0) === 0,
      detail: `missing=${mapOrphans?.count ?? 0}`,
    });

    const [waitlistStagingRow] = await sql<
      Array<{ count: number }>
    >`select count(*)::int as count from _migration_waitlist_staging`;
    const [waitlistLiveRow] = await sql<
      Array<{ count: number }>
    >`select count(*)::int as count from waitlist`;
    const stagingCount = waitlistStagingRow?.count ?? 0;
    const liveCount = waitlistLiveRow?.count ?? 0;
    checks.push({
      name: "waitlist count ≥ legacy waitlist staging",
      ok: liveCount >= stagingCount,
      detail: `live=${liveCount} staging=${stagingCount}`,
    });

    // credit_ledger parity: per-user sum(delta) must match between staging (mapped)
    // and live credit_ledger. Tolerance is 0 — if this fails, something double-
    // inserted or dropped.
    const balanceParity = await sql<
      Array<{ clerk_user_id: string; legacy_sum: number; live_sum: number }>
    >`
      with mapped as (
        select m.clerk_user_id, coalesce(sum(s.delta), 0) as legacy_sum
        from _migration_user_map m
        left join _migration_credit_ledger_staging s on s.supabase_uid = m.supabase_uid
        group by m.clerk_user_id
      ),
      live as (
        select user_id as clerk_user_id, coalesce(sum(delta), 0) as live_sum
        from credit_ledger
        group by user_id
      )
      select
        coalesce(mapped.clerk_user_id, live.clerk_user_id) as clerk_user_id,
        coalesce(mapped.legacy_sum, 0)::int as legacy_sum,
        coalesce(live.live_sum, 0)::int as live_sum
      from mapped
      full outer join live on mapped.clerk_user_id = live.clerk_user_id
      where coalesce(mapped.legacy_sum, 0) <> coalesce(live.live_sum, 0)
    `;
    checks.push({
      name: "credit_ledger sum per user matches legacy (tolerance 0)",
      ok: balanceParity.length === 0,
      detail:
        balanceParity.length === 0
          ? "all users reconciled"
          : `mismatches=${balanceParity.length} sample=${JSON.stringify(balanceParity.slice(0, 5))}`,
    });

    const [orphanRow] = await sql<Array<{ count: number }>>`
      select count(*)::int as count
      from credit_ledger cl
      where not exists (select 1 from users u where u.id = cl.user_id)
    `;
    checks.push({
      name: "no orphaned credit_ledger rows (user_id must exist in users)",
      ok: (orphanRow?.count ?? 0) === 0,
      detail: `orphans=${orphanRow?.count ?? 0}`,
    });

    // Sample 10 random mapped users and round-trip: mapping → users → (if credits) credit_ledger.
    const sample = await sql<
      Array<{
        supabase_uid: string;
        clerk_user_id: string;
        email: string;
        user_row: boolean;
      }>
    >`
      select
        m.supabase_uid::text,
        m.clerk_user_id,
        m.email,
        exists (select 1 from users u where u.id = m.clerk_user_id) as user_row
      from _migration_user_map m
      order by random()
      limit 10
    `;
    const badSample = sample.filter(r => !r.user_row);
    checks.push({
      name: "10-user random sample round-trips mapping → users",
      ok: badSample.length === 0,
      detail:
        badSample.length === 0
          ? "all 10 resolved"
          : `broken=${badSample.length}`,
    });

    // Orphaned credits file, if present.
    if (existsSync(paths.orphanedCredits)) {
      const lines = readFileSync(paths.orphanedCredits, "utf8")
        .split("\n")
        .filter(l => l.trim().length > 0);
      checks.push({
        name: "orphaned_credits.jsonl reviewed",
        ok: lines.length === 0,
        detail:
          lines.length === 0
            ? "empty"
            : `${lines.length} orphaned rows — review and resolve before T+30d decommission`,
      });
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  const pad = (s: string, n: number) =>
    s.length >= n ? s : s + " ".repeat(n - s.length);
  logger.info("");
  logger.info("==================== PARITY REPORT ====================");
  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    logger.info(`${mark}  ${pad(c.name, 60)}  ${c.detail}`);
  }
  const failed = checks.filter(c => !c.ok);
  logger.info("=======================================================");
  logger.info(
    `${checks.length - failed.length} passed / ${failed.length} failed / ${checks.length} total`
  );

  if (failed.length > 0) {
    logger.error("Verification FAILED — stop the cutover and investigate.");
    process.exit(1);
  }
  logger.info(
    "Verification PASSED ✓ — safe to flip DNS per docs/runbooks/unifyone-cutover.md"
  );
}

main().catch(err => {
  logger.fatal(err, "Verify crashed");
  process.exit(1);
});
