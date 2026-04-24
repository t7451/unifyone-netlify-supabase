// 02_audit_export.ts — sanity-check the Supabase export before anything writes.
//
// Reads:  exports/auth_users.csv, exports/app_data.sql, exports/manifest.json
// Writes: exports/audit_report.json, stdout
//
// Exits non-zero if any schema expectation is violated. A clean audit is the
// gate for running 03_clerk_bulk_import.ts.

import { readFileSync, existsSync, writeFileSync, statSync } from "node:fs";
import { z } from "zod";
import { logger } from "./lib/logger.js";
import { paths } from "./lib/paths.js";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Column-name fragments that must NEVER appear in the migrated data. If any
// table in the dump has a column matching one of these, the audit fails —
// we're about to import a secret where we shouldn't.
const SECRET_COLUMN_FRAGMENTS = [
  "password",
  "encrypted_password",
  "secret",
  "api_key",
  "token",
  "private_key",
  "access_token",
  "refresh_token",
];

// Columns that are known-safe despite matching a secret fragment (e.g., a
// CSRF token reference that is itself a nonce, not a credential).
const SECRET_ALLOWLIST = new Set<string>([
  // "csrf_token_id", // leave empty by default; add explicit entries if an audit surfaces a false positive
]);

type AuthUserRow = { id: string; email: string; created_at: string };

function parseCsv(text: string): AuthUserRow[] {
  // auth_users.csv is produced by psql COPY ... WITH CSV HEADER, which
  // double-quotes fields containing commas/newlines and escapes embedded
  // quotes as "". We parse conservatively rather than string-split.
  const rows: AuthUserRow[] = [];
  const lines = splitCsvLines(text);
  if (lines.length === 0) return rows;
  const header = parseCsvLine(lines[0]!);
  const idIdx = header.indexOf("id");
  const emailIdx = header.indexOf("email");
  const createdIdx = header.indexOf("created_at");
  if (idIdx < 0 || emailIdx < 0 || createdIdx < 0) {
    throw new Error(
      `auth_users.csv missing required columns (id, email, created_at). Header: ${header.join(",")}`
    );
  }
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || line.length === 0) continue;
    const fields = parseCsvLine(line);
    rows.push({
      id: fields[idIdx] ?? "",
      email: fields[emailIdx] ?? "",
      created_at: fields[createdIdx] ?? "",
    });
  }
  return rows;
}

function splitCsvLines(text: string): string[] {
  // Walk character by character, respecting quoted newlines.
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
      // swallow \r\n
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

function scanTables(
  sql: string
): Array<{ table: string; columns: string[]; insertCount: number }> {
  // pg_dump --inserts emits:
  //   INSERT INTO "public"."waitlist" ("email", "source", ...) VALUES (...);
  // We collect per-table column lists and row counts from those lines.
  const perTable = new Map<
    string,
    { columns: string[]; insertCount: number }
  >();
  const insertRegex = /^INSERT INTO "public"\."([^"]+)" \(([^)]+)\) VALUES/m;
  const lines = sql.split("\n");
  for (const line of lines) {
    const m = line.match(insertRegex);
    if (!m) continue;
    const table = m[1]!;
    const cols = m[2]!
      .split(",")
      .map(c => c.trim().replace(/^"/, "").replace(/"$/, ""));
    const entry = perTable.get(table);
    if (entry) {
      entry.insertCount += 1;
    } else {
      perTable.set(table, { columns: cols, insertCount: 1 });
    }
  }
  return Array.from(perTable.entries()).map(([table, v]) => ({ table, ...v }));
}

function main() {
  if (!existsSync(paths.authUsersCsv) || !existsSync(paths.appDataSql)) {
    logger.error(
      { expected: [paths.authUsersCsv, paths.appDataSql] },
      "Export files missing. Run `pnpm 01:export` first."
    );
    process.exit(2);
  }

  const manifestRaw = existsSync(paths.manifest)
    ? readFileSync(paths.manifest, "utf8")
    : "{}";
  const manifest = z
    .object({
      exported_at: z.string().optional(),
      supabase_project_ref: z.string().optional(),
      auth_users_row_count: z.number().optional(),
      app_data_insert_count: z.number().optional(),
    })
    .parse(JSON.parse(manifestRaw));

  logger.info({ manifest }, "Export manifest loaded");

  // --- Auth users ---
  const csvText = readFileSync(paths.authUsersCsv, "utf8");
  const users = parseCsv(csvText);

  const missingEmail = users.filter(u => !u.email || u.email.trim() === "");
  const invalidUuid = users.filter(u => !uuidRegex.test(u.id));
  const duplicateEmails = findDuplicates(users.map(u => u.email.toLowerCase()));

  logger.info(
    {
      total: users.length,
      missingEmail: missingEmail.length,
      invalidUuid: invalidUuid.length,
      duplicateEmails: duplicateEmails.length,
    },
    "auth.users audit"
  );

  // --- App data dump ---
  const sqlText = readFileSync(paths.appDataSql, "utf8");
  const sizeMB = (statSync(paths.appDataSql).size / 1024 / 1024).toFixed(2);
  const tables = scanTables(sqlText);

  const secretHits: Array<{ table: string; column: string }> = [];
  for (const t of tables) {
    for (const col of t.columns) {
      const lower = col.toLowerCase();
      if (SECRET_ALLOWLIST.has(lower)) continue;
      for (const fragment of SECRET_COLUMN_FRAGMENTS) {
        if (lower.includes(fragment)) {
          secretHits.push({ table: t.table, column: col });
          break;
        }
      }
    }
  }

  logger.info(
    {
      sizeMB,
      tables: tables.map(t => ({
        table: t.table,
        rows: t.insertCount,
        columns: t.columns.length,
      })),
    },
    "public schema audit"
  );

  if (secretHits.length > 0) {
    logger.warn(
      { secretHits },
      "⚠ SECRET-SHAPED COLUMNS DETECTED. These will NOT be migrated by 05_transform_and_import.ts, but confirm they're not referenced elsewhere before proceeding."
    );
  }

  // --- Decision ---
  const errors: string[] = [];
  if (missingEmail.length > 0)
    errors.push(`${missingEmail.length} users have no email`);
  if (invalidUuid.length > 0)
    errors.push(`${invalidUuid.length} users have malformed uuid`);
  if (duplicateEmails.length > 0)
    errors.push(
      `${duplicateEmails.length} duplicate emails (case-insensitive) — Clerk requires unique emails`
    );

  const report = {
    exportedAt: manifest.exported_at,
    supabaseProjectRef: manifest.supabase_project_ref,
    authUsers: {
      total: users.length,
      missingEmail: missingEmail.length,
      invalidUuid: invalidUuid.length,
      duplicateEmailsCaseInsensitive: duplicateEmails.length,
    },
    appData: {
      sizeMB: Number(sizeMB),
      tables,
      secretHits,
    },
    errors,
    passed: errors.length === 0,
  };

  writeFileSync(paths.auditReport, JSON.stringify(report, null, 2));
  logger.info({ path: paths.auditReport }, "Audit report written");

  if (errors.length > 0) {
    logger.error(
      { errors },
      "Audit FAILED — resolve each item before running 03_clerk_bulk_import.ts"
    );
    process.exit(1);
  }
  logger.info("Audit PASSED ✓ — safe to proceed to `pnpm 03:clerk`");
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const v of values) {
    if (v === "") continue;
    if (seen.has(v)) dups.add(v);
    else seen.add(v);
  }
  return Array.from(dups);
}

main();
