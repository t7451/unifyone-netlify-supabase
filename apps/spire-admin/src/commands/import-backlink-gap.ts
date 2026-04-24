import { readFileSync, existsSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { connectNeon, loadEnv, logger, schema } from "@1commerce/spire";

// Reads a Semrush backlink-gap CSV, classifies each row into a prospect
// type + reachability score, and upserts into spire_outreach_prospects.
//
// Supports two common Semrush export shapes:
//   1. "Backlink Analytics → Referring Domains" — columns include
//      Domain, AS (Authority Score), Backlinks, URL, Anchor, First Seen.
//   2. "Backlink Gap" — columns per competitor (target site), with
//      backlinks-per-target counts.
//
// The importer normalizes both to a flat list of (domain, backlink_url,
// anchor, estimated_dr, competitor_url) rows. Heuristic classifier
// assigns prospect_type + reachability_score.

export type ImportBacklinkGapInput = {
  siteSlug: string;
  competitor: string;
  csvPath: string;
  /** Default true — skip rows where (domain, backlink_url) already exist. */
  dedupe?: boolean;
};

export type ImportBacklinkGapResult = {
  siteSlug: string;
  competitor: string;
  total: number;
  inserted: number;
  skipped: number;
  byType: Record<string, number>;
  byReachabilityTier: { high: number; medium: number; low: number };
};

export async function importBacklinkGapCommand(
  input: ImportBacklinkGapInput
): Promise<ImportBacklinkGapResult> {
  const { siteSlug, competitor, csvPath } = input;
  const dedupe = input.dedupe ?? true;

  if (!existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }

  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);

  try {
    const [site] = await db
      .select()
      .from(schema.sites)
      .where(eq(schema.sites.slug, siteSlug))
      .limit(1);
    if (!site) throw new Error(`Site ${siteSlug} not registered`);

    const csvText = readFileSync(csvPath, "utf8");
    const rows = parseCsv(csvText);
    if (rows.length === 0) throw new Error(`CSV at ${csvPath} is empty`);

    const header = rows[0]!.map(h => h.trim().toLowerCase());
    const idx = {
      domain: findColumn(header, [
        "domain",
        "source domain",
        "referring domain",
      ]),
      url: findColumn(header, [
        "url",
        "source url",
        "source page url",
        "backlink",
      ]),
      anchor: findColumn(header, ["anchor", "anchor text"]),
      ds: findColumn(header, [
        "as",
        "authority score",
        "dr",
        "domain rating",
        "page as",
      ]),
      target: findColumn(header, [
        "target url",
        "target page",
        "page to",
        "url to",
      ]),
    };
    if (idx.domain === -1 || idx.url === -1) {
      throw new Error(
        `CSV header missing required columns. Found: ${header.join(", ")}. Expected a Semrush backlink export with Domain and URL columns.`
      );
    }

    const result: ImportBacklinkGapResult = {
      siteSlug,
      competitor,
      total: 0,
      inserted: 0,
      skipped: 0,
      byType: {},
      byReachabilityTier: { high: 0, medium: 0, low: 0 },
    };

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const domain = normalizeDomain(row[idx.domain] ?? "");
      const backlinkUrl = (row[idx.url] ?? "").trim();
      if (!domain || !backlinkUrl) continue;
      result.total += 1;

      const anchorText =
        idx.anchor >= 0 ? (row[idx.anchor] ?? "").trim() : null;
      const targetUrl = idx.target >= 0 ? (row[idx.target] ?? "").trim() : null;
      const drRaw = idx.ds >= 0 ? row[idx.ds] : undefined;
      const estimatedDr = drRaw
        ? Math.max(0, Math.min(100, Math.round(Number(drRaw) || 0)))
        : null;

      const prospectType = classifyProspectType(backlinkUrl);
      const reachabilityScore = computeReachability(prospectType, estimatedDr);

      result.byType[prospectType] = (result.byType[prospectType] ?? 0) + 1;
      if (reachabilityScore >= 75) result.byReachabilityTier.high += 1;
      else if (reachabilityScore >= 50) result.byReachabilityTier.medium += 1;
      else result.byReachabilityTier.low += 1;

      try {
        if (dedupe) {
          await db
            .insert(schema.outreachProspects)
            .values({
              siteId: site.id,
              source: "competitor_gap",
              sourceRef: competitor,
              domain,
              backlinkUrl,
              anchorText,
              competitorUrl: targetUrl,
              prospectType,
              estimatedDr,
              reachabilityScore,
              status: "new",
            })
            .onConflictDoUpdate({
              target: [
                schema.outreachProspects.siteId,
                schema.outreachProspects.domain,
                schema.outreachProspects.backlinkUrl,
              ],
              // Refresh scoring + anchor/type; do NOT overwrite status —
              // a prospect we've already contacted shouldn't revert to 'new'.
              set: {
                anchorText,
                competitorUrl: targetUrl,
                prospectType,
                estimatedDr,
                reachabilityScore,
              },
            });
          result.inserted += 1;
        } else {
          await db.insert(schema.outreachProspects).values({
            siteId: site.id,
            source: "competitor_gap",
            sourceRef: competitor,
            domain,
            backlinkUrl,
            anchorText,
            competitorUrl: targetUrl,
            prospectType,
            estimatedDr,
            reachabilityScore,
            status: "new",
          });
          result.inserted += 1;
        }
      } catch (err) {
        result.skipped += 1;
        logger.warn(
          {
            domain,
            backlinkUrl,
            err: err instanceof Error ? err.message : String(err),
          },
          "Prospect row skipped"
        );
      }
    }

    logger.info(result, "Backlink gap import complete");
    return result;
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function outreachReportCommand(input: {
  siteSlug?: string;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const siteId = input.siteSlug
      ? (
          await db
            .select()
            .from(schema.sites)
            .where(eq(schema.sites.slug, input.siteSlug))
            .limit(1)
        )[0]?.id
      : undefined;
    if (input.siteSlug && !siteId)
      throw new Error(`Site ${input.siteSlug} not registered`);

    const countsQuery = db
      .select({
        prospectType: schema.outreachProspects.prospectType,
        status: schema.outreachProspects.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.outreachProspects)
      .groupBy(
        schema.outreachProspects.prospectType,
        schema.outreachProspects.status
      );
    const counts = siteId
      ? await countsQuery.where(eq(schema.outreachProspects.siteId, siteId))
      : await countsQuery;

    logger.info({ counts }, "Prospect breakdown by type × status");
  } finally {
    await raw.end({ timeout: 5 });
  }
}

// --- Heuristic classifier ---

const DIRECTORY_HINTS = [
  /\/directory\b/i,
  /\/listings?\b/i,
  /\/submit\b/i,
  /\/add-site\b/i,
  /\/add-link\b/i,
];
const ROUNDUP_HINTS = [/\/best-/i, /\/top-/i, /\/alternatives?\b/i, /\/vs-/i];
const RESOURCE_HINTS = [
  /\/resources?\b/i,
  /\/tools\b/i,
  /\/links\b/i,
  /\/awesome\b/i,
];
const EDITORIAL_DATED = /\/(19|20)\d{2}\//;
const BLOG_HINTS = [/\/blog\//i, /\/articles?\//i, /\/posts?\//i];

function classifyProspectType(url: string): string {
  const u = url.toLowerCase();
  if (DIRECTORY_HINTS.some(re => re.test(u))) return "directory";
  if (RESOURCE_HINTS.some(re => re.test(u))) return "resource_page";
  if (ROUNDUP_HINTS.some(re => re.test(u))) return "roundup";
  if (EDITORIAL_DATED.test(u)) return "editorial";
  if (BLOG_HINTS.some(re => re.test(u))) return "blog";
  return "unknown";
}

function computeReachability(type: string, dr: number | null): number {
  const d = dr ?? 50;
  switch (type) {
    case "directory":
      return d < 50 ? 90 : d < 70 ? 75 : 60;
    case "resource_page":
      return d >= 30 && d <= 70 ? 85 : 65;
    case "roundup":
      return d >= 40 && d <= 70 ? 75 : 55;
    case "editorial":
      return 40;
    case "blog":
      return 50;
    default:
      return 45;
  }
}

// --- CSV parser ---
// Lenient quote-aware parser. Semrush exports use commas + double-quoted
// fields; occasionally a cell has embedded commas in anchor text.

function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        continue;
      }
      field += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      cur.push(field);
      field = "";
      continue;
    }
    if (ch === "\r") continue;
    if (ch === "\n") {
      cur.push(field);
      field = "";
      if (cur.length > 1 || cur[0]!.length > 0) out.push(cur);
      cur = [];
      continue;
    }
    field += ch;
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    out.push(cur);
  }
  return out;
}

function findColumn(header: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = header.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

function normalizeDomain(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0) return "";
  try {
    const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return u.host.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^www\./, "").replace(/\/$/, "");
  }
}
