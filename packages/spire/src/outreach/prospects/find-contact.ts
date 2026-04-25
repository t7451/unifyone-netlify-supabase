import { and, eq, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../schema.js";
import { outreachProspects } from "../../schema.js";

type DB = PostgresJsDatabase<typeof schema>;

// Hunter.io domain-search response (minimum fields we use). Their API returns
// many more fields per email — we only persist the minimum needed to send.
interface HunterEmail {
  value: string;
  type?: string;
  confidence?: number;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  department?: string | null;
}

interface HunterDomainSearchResponse {
  data?: {
    domain?: string;
    organization?: string;
    emails?: HunterEmail[];
  };
}

export interface FindContactInput {
  db: DB;
  siteId: string;
  apiKey: string;
  limit?: number;
  // Override the API base — used by tests.
  baseUrl?: string;
}

export interface FindContactResult {
  scanned: number;
  found: number;
  unreachable: number;
  byDomain: Array<{ domain: string; email: string | null; reason?: string }>;
}

// Role priority — first match wins. Lowercase substring matches against the
// position string (Hunter doesn't return a clean role enum).
const ROLE_PRIORITY: Array<{ keyword: string; weight: number }> = [
  { keyword: "managing editor", weight: 100 },
  { keyword: "editor", weight: 95 },
  { keyword: "content", weight: 85 },
  { keyword: "writer", weight: 80 },
  { keyword: "contributor", weight: 75 },
  { keyword: "marketing", weight: 60 },
  { keyword: "founder", weight: 50 },
  { keyword: "ceo", weight: 50 },
  { keyword: "owner", weight: 45 },
];

function scoreEmail(e: HunterEmail, prospectDr: number | null): number {
  let score = e.confidence ?? 0;
  const pos = (e.position ?? "").toLowerCase();
  for (const r of ROLE_PRIORITY) {
    if (pos.includes(r.keyword)) {
      score += r.weight;
      break;
    }
  }
  // Founder/owner ranks high only on smaller sites (DR < 50). On larger sites
  // they almost never read cold mail and editors are the right contact.
  if (
    (pos.includes("founder") || pos.includes("ceo")) &&
    (prospectDr ?? 0) >= 50
  ) {
    score -= 40;
  }
  // Generic mailboxes — last resort.
  if (
    e.type === "generic" ||
    /^(info|hello|contact|admin|support)@/i.test(e.value)
  ) {
    score -= 30;
  }
  return score;
}

export async function findContacts({
  db,
  siteId,
  apiKey,
  limit = 25,
  baseUrl = "https://api.hunter.io",
}: FindContactInput): Promise<FindContactResult> {
  // Qualified prospects without an email yet.
  const candidates = await db
    .select()
    .from(outreachProspects)
    .where(
      and(
        eq(outreachProspects.siteId, siteId),
        eq(outreachProspects.status, "qualified"),
        or(
          isNull(outreachProspects.prospectContactEmail),
          eq(outreachProspects.prospectContactEmail, "")
        )
      )
    )
    .limit(limit);

  let found = 0;
  let unreachable = 0;
  const byDomain: FindContactResult["byDomain"] = [];

  for (const p of candidates) {
    const url = `${baseUrl}/v2/domain-search?domain=${encodeURIComponent(
      p.domain
    )}&api_key=${encodeURIComponent(apiKey)}&limit=10`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      byDomain.push({
        domain: p.domain,
        email: null,
        reason: `fetch_error: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }
    if (!res.ok) {
      byDomain.push({
        domain: p.domain,
        email: null,
        reason: `http_${res.status}`,
      });
      continue;
    }
    const body = (await res.json()) as HunterDomainSearchResponse;
    const emails = body.data?.emails ?? [];
    if (emails.length === 0) {
      await db
        .update(outreachProspects)
        .set({ status: "unreachable", updatedAt: new Date() })
        .where(eq(outreachProspects.id, p.id));
      unreachable += 1;
      byDomain.push({ domain: p.domain, email: null, reason: "no_results" });
      continue;
    }

    const ranked = emails
      .map(e => ({ e, score: scoreEmail(e, p.estimatedDr) }))
      .sort((a, b) => b.score - a.score);
    const top = ranked[0]!.e;
    const fullName = [top.first_name, top.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    await db
      .update(outreachProspects)
      .set({
        prospectContactEmail: top.value,
        prospectContactName: fullName || null,
        status: "contact_found",
        updatedAt: new Date(),
      })
      .where(eq(outreachProspects.id, p.id));
    found += 1;
    byDomain.push({ domain: p.domain, email: top.value });

    // Hunter rate limit varies by plan; conservative pacing avoids 429s.
    await new Promise(r => setTimeout(r, 250));
  }

  return { scanned: candidates.length, found, unreachable, byDomain };
}

void sql;
void schema;
