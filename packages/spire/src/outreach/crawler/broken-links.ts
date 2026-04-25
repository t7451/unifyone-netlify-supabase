import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../schema.js";
import { brokenLinks, outreachProspects } from "../../schema.js";
import { logger } from "../../lib/logger.js";
import { selectAsset } from "../pitch/select-asset.js";

type DB = PostgresJsDatabase<typeof schema>;

// Fetches a prospect's source page (or homepage), extracts outbound <a> tags,
// HEADs each, and stores 4xx hits to spire_broken_links. Then runs select-asset
// per row so the matching column is populated for the campaign queue.

const UA =
  "Mozilla/5.0 (compatible; SpireBot/1.0; +https://1commerce.online/bot)";
const ACCEPT =
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
const FETCH_TIMEOUT_MS = 15_000;
const PER_LINK_DELAY_MS = 2_000;

export interface CrawlInput {
  db: DB;
  prospectId: string;
  /** Override for tests — wraps the global fetch. */
  fetchImpl?: typeof fetch;
}

export interface CrawlResult {
  ok: boolean;
  prospectId: string;
  scanned: number;
  broken: number;
  matched: number;
  reason?: string;
}

interface OutboundLink {
  url: string;
  anchor: string;
  context: string;
}

function absolutize(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function extractLinks(
  html: string,
  baseUrl: string,
  baseDomain: string
): OutboundLink[] {
  const out: OutboundLink[] = [];
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1] ?? "";
    const anchorRaw = (m[2] ?? "").replace(/<[^>]+>/g, "").trim();
    const abs = absolutize(href, baseUrl);
    if (!abs) continue;
    if (!abs.startsWith("http")) continue;
    let host: string;
    try {
      host = new URL(abs).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    // Only outbound — skip same-domain links.
    if (host === baseDomain) continue;
    const start = Math.max(0, m.index - 25);
    const end = Math.min(html.length, m.index + (m[0]?.length ?? 0) + 25);
    const ctx = html.slice(start, end).replace(/\s+/g, " ").trim();
    out.push({
      url: abs,
      anchor: anchorRaw.slice(0, 200),
      context: ctx.slice(0, 200),
    });
  }
  // Dedupe on URL.
  const seen = new Set<string>();
  return out.filter(l => {
    if (seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function crawlProspectForBrokenLinks({
  db,
  prospectId,
  fetchImpl = fetch,
}: CrawlInput): Promise<CrawlResult> {
  const rows = await db
    .select()
    .from(outreachProspects)
    .where(eq(outreachProspects.id, prospectId))
    .limit(1);
  if (rows.length === 0) {
    return {
      ok: false,
      prospectId,
      scanned: 0,
      broken: 0,
      matched: 0,
      reason: "prospect_not_found",
    };
  }
  const prospect = rows[0]!;

  const targetUrl =
    prospect.backlinkUrl && prospect.backlinkUrl.startsWith("http")
      ? prospect.backlinkUrl
      : `https://${prospect.domain}/`;
  const baseDomain = prospect.domain.replace(/^www\./, "");

  let pageRes: Response;
  try {
    pageRes = await fetchWithTimeout(
      targetUrl,
      { method: "GET", headers: { "user-agent": UA, accept: ACCEPT } },
      fetchImpl
    );
  } catch (err) {
    return {
      ok: false,
      prospectId,
      scanned: 0,
      broken: 0,
      matched: 0,
      reason: `fetch_error_${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (!pageRes.ok) {
    return {
      ok: false,
      prospectId,
      scanned: 0,
      broken: 0,
      matched: 0,
      reason: `page_${pageRes.status}`,
    };
  }
  const html = await pageRes.text();
  const links = extractLinks(html, targetUrl, baseDomain);

  let broken = 0;
  let matched = 0;
  for (const link of links) {
    let res: Response;
    try {
      res = await fetchWithTimeout(
        link.url,
        { method: "HEAD", headers: { "user-agent": UA } },
        fetchImpl
      );
    } catch {
      // Network errors → treat as broken (most tools do; conservative on the
      // pitch side, the asset-match score gate will filter low-confidence ones).
      res = new Response(null, { status: 599 });
    }
    if (res.status >= 400 && res.status < 500) {
      // Match an asset to fill matched_asset_url + score on insert.
      const assetMatch = await selectAsset({
        db,
        prospectId,
        campaignType: "broken_link",
        minScore: 0,
      });
      try {
        await db
          .insert(brokenLinks)
          .values({
            prospectId,
            sourcePageUrl: targetUrl,
            brokenUrl: link.url,
            anchorText: link.anchor || null,
            contextSnippet: link.context || null,
            matchedAssetUrl: assetMatch.assetUrl,
            matchedAssetScore: assetMatch.score,
            status: "discovered",
          })
          .onConflictDoNothing({
            target: [
              brokenLinks.prospectId,
              brokenLinks.sourcePageUrl,
              brokenLinks.brokenUrl,
            ],
          });
      } catch (err) {
        logger.warn(
          {
            prospectId,
            url: link.url,
            err: err instanceof Error ? err.message : String(err),
          },
          "broken_links insert failed"
        );
      }
      broken += 1;
      if (assetMatch.ok && assetMatch.score >= 60) matched += 1;
    }
    await new Promise(r => setTimeout(r, PER_LINK_DELAY_MS));
  }

  return {
    ok: true,
    prospectId,
    scanned: links.length,
    broken,
    matched,
  };
}

export async function crawlSiteSample({
  db,
  siteId,
  limit = 20,
  fetchImpl,
}: {
  db: DB;
  siteId: string;
  limit?: number;
  fetchImpl?: typeof fetch;
}): Promise<CrawlResult[]> {
  const targets = await db
    .select({ id: outreachProspects.id, type: outreachProspects.prospectType })
    .from(outreachProspects)
    .where(
      and(
        eq(outreachProspects.siteId, siteId),
        sql`${outreachProspects.prospectType} in ('blog','editorial','resource_page')`,
        sql`${outreachProspects.status} in ('contact_found','qualified','new')`
      )
    )
    .limit(limit);

  const out: CrawlResult[] = [];
  for (const t of targets) {
    const res = await crawlProspectForBrokenLinks({
      db,
      prospectId: t.id,
      fetchImpl,
    });
    out.push(res);
  }
  return out;
}

void schema;
