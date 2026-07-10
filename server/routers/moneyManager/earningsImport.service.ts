/**
 * server/routers/moneyManager/earningsImport.service.ts
 *
 * Multi-platform earnings consolidation. Gig platforms (DoorDash, Uber, Lyft,
 * Instacart, …) each export a differently-shaped CSV / 1099, so this module:
 *   1. Parses raw CSV text with a from-scratch, quote-aware parser (there is no
 *      csv dependency in the repo — this is the inverse of downloadCsv's
 *      escapeCsvCell).
 *   2. Maps each platform's headers onto a normalized earnings row via a small
 *      set of header aliases plus a generic fallback.
 *   3. Previews (no DB write), commits (batch + rows), lists and deletes batches.
 *
 * Malformed rows are collected and skipped rather than throwing, so one bad line
 * never fails a whole import.
 */

import { TRPCError } from "@trpc/server";
import * as repo from "./moneyManager.repo";

// Normalized earnings row shape (mirrors taxExport's TaxReportShiftRow, minus
// duration — imports carry no reliable per-row time). Dollar amounts are plain
// numbers; the commit layer converts them to fixed(2) decimal strings.
export interface NormalizedImportRow {
  earnedDate: string; // ISO timestamp
  platform: string;
  grossDollars: number;
  tipsDollars: number;
  bonusDollars: number;
  miles: number | null;
  rawRow: Record<string, string>;
}

export interface ImportPreview {
  rows: NormalizedImportRow[];
  skipped: Array<{ line: number; reason: string; raw: string[] }>;
  totals: {
    rowCount: number;
    grossDollars: number;
    tipsDollars: number;
    bonusDollars: number;
    totalDollars: number;
    miles: number;
  };
}

// ── CSV parser ────────────────────────────────────────────────────────────────
/**
 * Quote-aware CSV → matrix. Handles quoted fields, escaped double-quotes (""),
 * commas inside quotes, and CRLF/LF/CR line endings. A trailing newline does not
 * produce a spurious empty final row.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      if (text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }

  // Flush the final field/row unless the input ended exactly on a line break
  // (row already pushed, nothing buffered) — that would append a phantom [""].
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ── Header alias mapping ──────────────────────────────────────────────────────
type FieldKey = "date" | "gross" | "tips" | "bonus" | "miles";

// Base aliases shared by all platforms (already stored lowercased + alnum-only,
// matched by substring so "totalearnings" resolves to gross via "earnings").
const BASE_ALIASES: Record<FieldKey, string[]> = {
  date: [
    "date",
    "datecompleted",
    "completeddate",
    "paydate",
    "payoutdate",
    "tripdate",
    "earneddate",
    "day",
    "weekof",
    "week",
  ],
  tips: ["tips", "tip", "gratuity", "customertip"],
  bonus: [
    "bonus",
    "bonuses",
    "promotion",
    "promotions",
    "promo",
    "incentive",
    "incentives",
    "quest",
    "boost",
    "peakpay",
  ],
  miles: ["miles", "mileage", "distance", "milesdriven", "totalmiles"],
  gross: [
    "gross",
    "grossearnings",
    "grosspay",
    "earnings",
    "totalearnings",
    "totalpay",
    "basepay",
    "fare",
    "amount",
    "subtotal",
    "batchearnings",
    "rideearnings",
    "tripearnings",
    "pay",
  ],
};

// Per-platform header extensions. Each platform export names the same concepts
// slightly differently; these add the platform-specific spellings on top of the
// shared base. Unknown platforms fall back to the base (generic) aliases.
const PLATFORM_EXTENSIONS: Record<
  string,
  Partial<Record<FieldKey, string[]>>
> = {
  doordash: { bonus: ["challenge", "peakpay"], gross: ["totalpay"] },
  uber: {
    gross: ["fare", "yourearnings", "netfare"],
    bonus: ["surge", "quest"],
    miles: ["onlinemiles", "tripmiles"],
  },
  ubereats: {
    gross: ["fare", "yourearnings"],
    bonus: ["surge", "quest"],
  },
  lyft: {
    gross: ["rideearnings"],
    bonus: ["streak", "bonus"],
  },
  instacart: {
    gross: ["batchearnings"],
    tips: ["customertip"],
  },
};

function aliasesFor(platform: string): Record<FieldKey, string[]> {
  const key = normalizeHeader(platform);
  const ext = PLATFORM_EXTENSIONS[key] ?? {};
  const merged = {} as Record<FieldKey, string[]>;
  (Object.keys(BASE_ALIASES) as FieldKey[]).forEach(f => {
    merged[f] = [...BASE_ALIASES[f], ...(ext[f] ?? [])];
  });
  return merged;
}

// Lowercase and strip everything but a-z0-9 so "Total Earnings" and
// "total_earnings" and "Total-Earnings" all collapse to "totalearnings".
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Split a header into lowercase alphanumeric tokens: "Trip date" → ["trip","date"].
function tokenizeHeader(h: string): string[] {
  return h
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// A header matches an alias set when either the whole collapsed header equals an
// alias (compound single-word headers like "grosspay"/"peakpay") OR one of its
// WORD tokens equals an alias. Whole-word matching — not raw substring — so a
// short alias like "pay"/"day"/"week" can't spuriously grab "Payment method" or
// "Weekly earnings", while long aliases still resolve compound headers.
function headerMatches(header: string, aliases: string[]): boolean {
  const joined = normalizeHeader(header);
  if (joined !== "" && aliases.includes(joined)) return true;
  const tokens = tokenizeHeader(header);
  return tokens.some(t => aliases.includes(t));
}

/**
 * Resolve header cells to a field → column-index map. Specific fields
 * (date/miles/tips/bonus) win before the generic "gross" catch-all, and each
 * column binds to at most one field so a "tips" column is never also read as
 * gross. First matching column wins for a field.
 */
function buildHeaderMap(
  headers: string[],
  aliases: Record<FieldKey, string[]>
): Partial<Record<FieldKey, number>> {
  const map: Partial<Record<FieldKey, number>> = {};
  const claimed = new Set<number>();
  const order: FieldKey[] = ["date", "miles", "tips", "bonus", "gross"];
  for (const field of order) {
    for (let idx = 0; idx < headers.length; idx++) {
      if (claimed.has(idx)) continue;
      if (headerMatches(headers[idx], aliases[field])) {
        map[field] = idx;
        claimed.add(idx);
        break;
      }
    }
  }
  return map;
}

// ── Value parsing ─────────────────────────────────────────────────────────────
// "$1,234.50" / "(12.00)" / "12" → number; blank / non-numeric → null.
function parseMoney(raw: string | undefined): number | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (t === "") return null;
  const negative = /^\(.*\)$/.test(t);
  const cleaned = t.replace(/[$,()\s]/g, "");
  if (cleaned === "" || !/^[-+]?\d*\.?\d+$/.test(cleaned)) return null;
  const num = parseFloat(cleaned);
  if (!Number.isFinite(num)) return null;
  return negative ? -num : num;
}

// Parse a date deterministically in UTC. Handles ISO (yyyy-mm-dd[...]) and
// US mm/dd/yyyy (2- or 4-digit year); falls back to Date parsing for the rest.
function parseDate(raw: string | undefined): Date | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (t === "") return null;

  const us = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (us) {
    const mo = Number(us[1]);
    const d = Number(us[2]);
    let y = Number(us[3]);
    if (us[3].length === 2) y += 2000;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const dt = new Date(`${t}T00:00:00Z`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const dt = new Date(t);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Normalize one data row. Returns the row on success or an error reason to
 * collect as skipped. A row needs a parseable date and at least one numeric
 * earnings figure (gross/tips/bonus) to count.
 */
function normalizeRow(
  headers: string[],
  headerMap: Partial<Record<FieldKey, number>>,
  cells: string[],
  platform: string
): { row?: NormalizedImportRow; error?: string } {
  const rawRow: Record<string, string> = {};
  headers.forEach((h, idx) => {
    rawRow[h] = cells[idx] ?? "";
  });

  // A wholly-empty line (e.g. a blank trailing row) is silently ignorable.
  if (cells.every(c => c.trim() === "")) {
    return { error: "empty row" };
  }

  const cellAt = (f: FieldKey) => {
    const idx = headerMap[f];
    return idx == null ? undefined : cells[idx];
  };

  const date = parseDate(cellAt("date"));
  if (!date) return { error: "missing or unparseable date" };

  const gross = parseMoney(cellAt("gross"));
  const tips = parseMoney(cellAt("tips"));
  const bonus = parseMoney(cellAt("bonus"));
  const miles = parseMoney(cellAt("miles"));

  if (gross == null && tips == null && bonus == null) {
    return { error: "no numeric earnings columns" };
  }

  return {
    row: {
      earnedDate: date.toISOString(),
      platform,
      grossDollars: round2(gross ?? 0),
      tipsDollars: round2(tips ?? 0),
      bonusDollars: round2(bonus ?? 0),
      miles: miles == null ? null : round2(miles),
      rawRow,
    },
  };
}

export const earningsImportService = {
  parseCsv,

  /**
   * Parse + normalize + validate CSV text for a platform. Pure — no DB write.
   * Returns the normalized rows, the collected skipped rows (with reasons), and
   * roll-up totals for the preview UI.
   */
  previewImport(text: string, platform: string): ImportPreview {
    const empty: ImportPreview = {
      rows: [],
      skipped: [],
      totals: {
        rowCount: 0,
        grossDollars: 0,
        tipsDollars: 0,
        bonusDollars: 0,
        totalDollars: 0,
        miles: 0,
      },
    };

    const matrix = parseCsv(text ?? "");
    if (matrix.length < 2) return empty; // header only (or nothing) → no rows

    const headers = matrix[0];
    const aliases = aliasesFor(platform);
    const headerMap = buildHeaderMap(headers, aliases);

    const rows: NormalizedImportRow[] = [];
    const skipped: ImportPreview["skipped"] = [];

    for (let r = 1; r < matrix.length; r++) {
      const cells = matrix[r];
      const { row, error } = normalizeRow(headers, headerMap, cells, platform);
      if (row) rows.push(row);
      else if (error && error !== "empty row") {
        // +1 to report the 1-based source line (header is line 1).
        skipped.push({ line: r + 1, reason: error, raw: cells });
      }
    }

    const totals = rows.reduce(
      (acc, row) => {
        acc.grossDollars += row.grossDollars;
        acc.tipsDollars += row.tipsDollars;
        acc.bonusDollars += row.bonusDollars;
        acc.miles += row.miles ?? 0;
        return acc;
      },
      { grossDollars: 0, tipsDollars: 0, bonusDollars: 0, miles: 0 }
    );

    return {
      rows,
      skipped,
      totals: {
        rowCount: rows.length,
        grossDollars: round2(totals.grossDollars),
        tipsDollars: round2(totals.tipsDollars),
        bonusDollars: round2(totals.bonusDollars),
        totalDollars: round2(
          totals.grossDollars + totals.tipsDollars + totals.bonusDollars
        ),
        miles: round2(totals.miles),
      },
    };
  },

  /**
   * Persist a validated import: one earnings_import_batches row, then the
   * imported_earnings rows referencing it. Rows are already normalized/validated
   * by previewImport on the client round-trip and re-validated by the router's
   * Zod schema.
   */
  async commitImport(
    userId: number,
    input: {
      platform: string;
      fileName?: string;
      rows: NormalizedImportRow[];
    }
  ): Promise<{ batchId: number; inserted: number }> {
    const db = await repo.getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Import is temporarily unavailable — please try again.",
      });
    }

    const [batch] = await repo.insertImportBatch(db, {
      userId,
      platform: input.platform,
      fileName: input.fileName ?? null,
      rowCount: input.rows.length,
      status: "committed",
    });
    const batchId = batch.id;

    if (input.rows.length === 0) return { batchId, inserted: 0 };

    const insertRows = input.rows.map(r => ({
      userId,
      platform: r.platform || input.platform,
      earnedDate: new Date(r.earnedDate),
      grossEarnings: r.grossDollars.toFixed(2),
      tips: r.tipsDollars.toFixed(2),
      bonuses: r.bonusDollars.toFixed(2),
      totalMiles: r.miles == null ? null : r.miles.toFixed(2),
      source: "csv" as const,
      importBatchId: batchId,
      rawRow: r.rawRow,
    }));

    // Chunk the insert: each row binds ~10 parameters and Postgres caps a single
    // statement at 65535 bind parameters, so a multi-thousand-row yearly export
    // would overflow one INSERT. 1000 rows/chunk keeps us well under the limit.
    const CHUNK = 1000;
    let inserted = 0;
    for (let i = 0; i < insertRows.length; i += CHUNK) {
      const rows = await repo.insertImportedEarnings(
        db,
        insertRows.slice(i, i + CHUNK)
      );
      inserted += rows.length;
    }
    return { batchId, inserted };
  },

  /** List an operator's past import batches, newest first. */
  async listBatches(userId: number) {
    const db = await repo.getDb();
    if (!db) return [];
    return repo.getImportBatches(db, userId);
  },

  /**
   * Delete an import batch and all of its rows (the "undo" for an import). Both
   * deletes are userId-scoped so an operator can only remove their own batch.
   */
  async deleteBatch(
    userId: number,
    batchId: number
  ): Promise<{ deleted: boolean }> {
    const db = await repo.getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Import is temporarily unavailable — please try again.",
      });
    }
    // Remove child rows first, then the batch header.
    await repo.deleteImportedEarningsForBatch(db, batchId, userId);
    await repo.deleteImportBatch(db, batchId, userId);
    return { deleted: true };
  },
};
