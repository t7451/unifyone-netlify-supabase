// 05_transform_and_import.ts — load legacy app data into Neon.
//
// Reads:
//   - exports/app_data.sql            (pg_dump INSERT dump)
//   - Neon `_migration_user_map`      (populated by 04_build_user_mapping.ts)
//
// Writes (live run):
//   - `_migration_waitlist_staging`          (truncate + reload)
//   - `_migration_credit_ledger_staging`     (truncate + reload)
//   - `waitlist`                             (insert ... on conflict do nothing)
//   - `credit_ledger`                        (insert with mapping join)
//   - `exports/orphaned_credits.jsonl`       (any credit rows whose supabase_uid has no Clerk mapping)
//
// What is NOT migrated:
//   - `api_keys`  — legacy keys are rotated on cutover; users re-issue via /dashboard/api-keys
//   - Any table containing password/secret/token columns (the audit already
//     flagged these; we never map them through)
//
// Additive only. No `delete` or `truncate` against live tables (just staging).

import { readFileSync, existsSync, createWriteStream } from "node:fs";
import { logger, dryRunBanner } from "./lib/logger.js";
import { paths } from "./lib/paths.js";
import { loadEnv } from "./lib/env.js";
import { connectNeon } from "./lib/db.js";

// Row shapes fed into postgres.js bulk insert. Every field is a primitive
// postgres.js can serialize directly. utm is JSON.stringify'd upstream and
// the staging column is `text`; we cast to jsonb when moving staging → live.
type WaitlistRow = {
  email: string;
  source: string | null;
  utm: string | null;
  created_at: string | null;
};
type CreditRow = {
  legacy_id: string | null;
  supabase_uid: string;
  delta: number;
  reason: string;
  ref_id: string | null;
  created_at: string | null;
};

// pg_dump --inserts emits:
//   INSERT INTO "public"."waitlist" ("email", "source", "utm", "created_at")
//   VALUES ('a@b.com', 'organic', '{}', '2026-01-01 00:00:00+00');
//
// We parse each INSERT line into (columns, values), then map by table name.
type ParsedInsert = { table: string; columns: string[]; values: string[] };

function* iterInserts(sql: string): Generator<ParsedInsert> {
  const lines = sql.split("\n");
  let buffer = "";
  for (const line of lines) {
    if (line.startsWith("INSERT INTO")) {
      if (buffer) yield parseInsert(buffer);
      buffer = line;
    } else if (buffer) {
      buffer += "\n" + line;
      if (line.trimEnd().endsWith(");")) {
        yield parseInsert(buffer);
        buffer = "";
      }
    }
  }
  if (buffer) yield parseInsert(buffer);
}

function parseInsert(stmt: string): ParsedInsert {
  // INSERT INTO "public"."<table>" ("col1", "col2", ...) VALUES (v1, v2, ...);
  const headMatch = stmt.match(
    /^INSERT INTO "public"\."([^"]+)" \(([^)]+)\) VALUES\s*\(/s
  );
  if (!headMatch)
    throw new Error(`Unparseable INSERT: ${stmt.slice(0, 120)}...`);
  const table = headMatch[1]!;
  const columns = headMatch[2]!
    .split(",")
    .map(c => c.trim().replace(/^"/, "").replace(/"$/, ""));

  const afterParen = stmt.slice(headMatch[0].length);
  // afterParen ends with ");"
  const valuesRaw = afterParen.replace(/\);\s*$/, "");
  const values = splitPgValues(valuesRaw);

  return { table, columns, values };
}

// Split a pg_dump VALUES list, respecting single-quote strings (with '' escape),
// dollar-quoted strings ($$...$$), and nested parens inside array/record literals.
function splitPgValues(input: string): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  let inQuote = false;
  let depth = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (inQuote) {
      cur += ch;
      if (ch === "'") {
        if (input[i + 1] === "'") {
          cur += input[i + 1];
          i += 2;
          continue;
        }
        inQuote = false;
      }
      i += 1;
      continue;
    }
    if (ch === "'") {
      inQuote = true;
      cur += ch;
      i += 1;
      continue;
    }
    if (ch === "(") {
      depth += 1;
      cur += ch;
      i += 1;
      continue;
    }
    if (ch === ")") {
      depth -= 1;
      cur += ch;
      i += 1;
      continue;
    }
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
      i += 1;
      continue;
    }
    cur += ch;
    i += 1;
  }
  if (cur.trim().length > 0) out.push(cur.trim());
  return out;
}

function pgLiteralToJs(literal: string): unknown {
  const trimmed = literal.trim();
  if (trimmed === "NULL" || trimmed === "null") return null;
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    // string literal — unescape '' → '
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  if (/^-?\d+\.\d+$/.test(trimmed)) return Number(trimmed);
  // Type-casted values like: '{"a":1}'::jsonb — strip the cast and recurse.
  const castMatch = trimmed.match(/^(.*)::[A-Za-z_][A-Za-z0-9_[\]]*$/s);
  if (castMatch) return pgLiteralToJs(castMatch[1]!);
  return trimmed; // fall through — caller decides
}

function toJson(literal: string): unknown {
  const v = pgLiteralToJs(literal);
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function toString(literal: string): string | null {
  const v = pgLiteralToJs(literal);
  return v === null ? null : String(v);
}

function toNumber(literal: string): number {
  const v = pgLiteralToJs(literal);
  if (typeof v !== "number") throw new Error(`Expected number, got ${literal}`);
  return v;
}

// pg_dump emits integers as plain digits; we keep the original string so it
// round-trips into Neon without a JS-side bigint overflow. We only read this
// value back in orphaned_credits.jsonl for operator review, never arithmetic.
function toBigIntString(literal: string): string | null {
  const v = pgLiteralToJs(literal);
  if (v === null) return null;
  return String(v);
}

type ParsedDump = {
  waitlistRows: WaitlistRow[];
  creditRows: CreditRow[];
  ignoredTables: Map<string, number>;
  secretTables: string[];
};

const SECRET_COLUMN_FRAGMENTS = [
  "password",
  "secret",
  "api_key",
  "token",
  "private_key",
];

function parseDump(sql: string): ParsedDump {
  const waitlistRows: WaitlistRow[] = [];
  const creditRows: CreditRow[] = [];
  const ignoredTables = new Map<string, number>();
  const secretTables = new Set<string>();

  for (const ins of iterInserts(sql)) {
    const colToIdx = new Map(ins.columns.map((c, i) => [c, i]));

    // Flag (but don't import) any table carrying secret-shaped columns.
    for (const col of ins.columns) {
      const lower = col.toLowerCase();
      if (SECRET_COLUMN_FRAGMENTS.some(f => lower.includes(f))) {
        secretTables.add(ins.table);
      }
    }

    if (ins.table === "waitlist") {
      const emailLit = ins.values[colToIdx.get("email") ?? -1];
      if (!emailLit) continue;
      const email = toString(emailLit);
      if (!email) continue;
      const source = ins.values[colToIdx.get("source") ?? -1];
      const utm = ins.values[colToIdx.get("utm") ?? -1];
      const createdAt = ins.values[colToIdx.get("created_at") ?? -1];
      const utmJson = utm ? toJson(utm) : null;
      waitlistRows.push({
        email: email.toLowerCase().trim(),
        source: source ? toString(source) : null,
        utm: utmJson === null ? null : JSON.stringify(utmJson),
        created_at: createdAt ? toString(createdAt) : null,
      });
      continue;
    }

    if (ins.table === "credit_ledger") {
      // Legacy table may name the FK as user_id (uuid referencing auth.users).
      // If schema differs, the operator should amend this mapping.
      const uidLit =
        ins.values[
          colToIdx.get("user_id") ?? colToIdx.get("supabase_uid") ?? -1
        ];
      const deltaLit = ins.values[colToIdx.get("delta") ?? -1];
      const reasonLit = ins.values[colToIdx.get("reason") ?? -1];
      if (!uidLit || !deltaLit || !reasonLit) continue;
      const uid = toString(uidLit);
      if (!uid) continue;
      const legacyIdLit = ins.values[colToIdx.get("id") ?? -1];
      const refIdLit = ins.values[colToIdx.get("ref_id") ?? -1];
      const createdLit = ins.values[colToIdx.get("created_at") ?? -1];
      creditRows.push({
        legacy_id: legacyIdLit ? toBigIntString(legacyIdLit) : null,
        supabase_uid: uid,
        delta: toNumber(deltaLit),
        reason: toString(reasonLit) ?? "",
        ref_id: refIdLit ? toString(refIdLit) : null,
        created_at: createdLit ? toString(createdLit) : null,
      });
      continue;
    }

    // Any other table → count and ignore. 06:verify will report parity gaps.
    ignoredTables.set(ins.table, (ignoredTables.get(ins.table) ?? 0) + 1);
  }

  return {
    waitlistRows,
    creditRows,
    ignoredTables,
    secretTables: Array.from(secretTables),
  };
}

async function main() {
  const env = loadEnv(["NEON_DATABASE_URL", "DRY_RUN"] as const);
  dryRunBanner(env.DRY_RUN);

  if (!existsSync(paths.appDataSql)) {
    logger.error(
      { expected: paths.appDataSql },
      "Missing app_data.sql. Run `pnpm 01:export`."
    );
    process.exit(2);
  }

  const dump = parseDump(readFileSync(paths.appDataSql, "utf8"));
  logger.info(
    {
      waitlist: dump.waitlistRows.length,
      credit_ledger: dump.creditRows.length,
      ignoredTables: Object.fromEntries(dump.ignoredTables),
      secretTables: dump.secretTables,
    },
    "Parsed legacy dump"
  );

  if (dump.secretTables.length > 0) {
    logger.warn(
      { secretTables: dump.secretTables },
      "Tables containing secret-shaped columns detected. These rows are NOT migrated (rotate credentials post-cutover)."
    );
  }

  const sql = connectNeon(env.NEON_DATABASE_URL);
  try {
    if (env.DRY_RUN) {
      logger.info("[DRY RUN] would truncate staging tables");
      logger.info(
        { waitlistRows: dump.waitlistRows.length },
        "[DRY RUN] would load waitlist staging"
      );
      logger.info(
        { creditRows: dump.creditRows.length },
        "[DRY RUN] would load credit_ledger staging"
      );

      // Dry-run orphan preview: load mapping and count matches in memory.
      const mapping = await sql<
        Array<{ supabase_uid: string; clerk_user_id: string }>
      >`
        select supabase_uid::text, clerk_user_id from _migration_user_map
      `;
      const mapByUid = new Map(
        mapping.map(m => [m.supabase_uid, m.clerk_user_id])
      );
      const orphans = dump.creditRows.filter(
        r => !mapByUid.has(r.supabase_uid)
      );
      logger.info(
        {
          mapped: dump.creditRows.length - orphans.length,
          orphans: orphans.length,
        },
        "[DRY RUN] credit_ledger remap projection"
      );
      return;
    }

    // --- waitlist ---
    await sql`truncate table _migration_waitlist_staging`;
    if (dump.waitlistRows.length > 0) {
      const CHUNK = 1000;
      for (let i = 0; i < dump.waitlistRows.length; i += CHUNK) {
        const batch = dump.waitlistRows.slice(i, i + CHUNK);
        await sql`
          insert into _migration_waitlist_staging
            ${sql(batch, "email", "source", "utm", "created_at")}
        `;
      }
    }
    const wlIns = await sql<Array<{ count: number }>>`
      with inserted as (
        insert into waitlist (email, source, utm, created_at)
        select
          email,
          source,
          nullif(utm, '')::jsonb,
          coalesce(created_at, now())
        from _migration_waitlist_staging
        where email is not null
        on conflict (email) do nothing
        returning 1
      )
      select count(*)::int as count from inserted
    `;
    logger.info(
      { inserted: wlIns[0]?.count ?? 0, seen: dump.waitlistRows.length },
      "waitlist import"
    );

    // --- credit_ledger ---
    await sql`truncate table _migration_credit_ledger_staging`;
    if (dump.creditRows.length > 0) {
      const CHUNK = 1000;
      for (let i = 0; i < dump.creditRows.length; i += CHUNK) {
        const batch = dump.creditRows.slice(i, i + CHUNK);
        await sql`
          insert into _migration_credit_ledger_staging
            ${sql(batch, "legacy_id", "supabase_uid", "delta", "reason", "ref_id", "created_at")}
        `;
      }
    }

    // Write orphans (rows in staging with no mapping) to a JSONL file for manual review.
    const orphans = await sql<
      Array<{
        legacy_id: string | null;
        supabase_uid: string;
        delta: number;
        reason: string;
        ref_id: string | null;
        created_at: string | null;
      }>
    >`
      select
        legacy_id::text,
        supabase_uid::text,
        delta,
        reason,
        ref_id,
        created_at::text
      from _migration_credit_ledger_staging s
      where not exists (
        select 1 from _migration_user_map m where m.supabase_uid = s.supabase_uid
      )
    `;
    if (orphans.length > 0) {
      const stream = createWriteStream(paths.orphanedCredits, { flags: "w" });
      for (const row of orphans) stream.write(JSON.stringify(row) + "\n");
      stream.end();
      logger.warn(
        { count: orphans.length, path: paths.orphanedCredits },
        "Orphaned credit_ledger rows written. Review before deciding whether to manually remap or drop."
      );
    }

    const clIns = await sql<Array<{ count: number }>>`
      with inserted as (
        insert into credit_ledger (user_id, delta, reason, ref_id, created_at)
        select
          m.clerk_user_id,
          s.delta,
          s.reason,
          s.ref_id,
          coalesce(s.created_at, now())
        from _migration_credit_ledger_staging s
        join _migration_user_map m on m.supabase_uid = s.supabase_uid
        returning 1
      )
      select count(*)::int as count from inserted
    `;
    logger.info(
      {
        inserted: clIns[0]?.count ?? 0,
        seen: dump.creditRows.length,
        orphaned: orphans.length,
      },
      "credit_ledger import"
    );

    // --- api_keys NOT migrated ---
    const apiKeyCount = dump.ignoredTables.get("api_keys") ?? 0;
    logger.info(
      { apiKeyCount },
      apiKeyCount > 0
        ? "api_keys NOT migrated — users will generate new keys from /dashboard/api-keys after login."
        : "no legacy api_keys rows"
    );
  } finally {
    await sql.end({ timeout: 5 });
  }

  logger.info("Next: pnpm 06:verify");
}

main().catch(err => {
  logger.fatal(err, "Import crashed");
  process.exit(1);
});
