import { and, eq, gte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../schema.js";
import {
  contentPlan,
  keywords,
  outreachProspects,
  sites,
} from "../../schema.js";
import type { CampaignType } from "../prospects/qualify.js";

type DB = PostgresJsDatabase<typeof schema>;

export interface SelectAssetInput {
  db: DB;
  prospectId: string;
  campaignType: CampaignType;
  minScore?: number;
}

export interface SelectAssetResult {
  ok: boolean;
  assetUrl: string | null;
  assetTitle: string | null;
  score: number;
  reason?: string;
  rationale: string;
}

const MIN_QUALITY = 90;

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter(t => t.length >= 3)
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}

export async function selectAsset({
  db,
  prospectId,
  campaignType,
  minScore = 50,
}: SelectAssetInput): Promise<SelectAssetResult> {
  const prows = await db
    .select()
    .from(outreachProspects)
    .where(eq(outreachProspects.id, prospectId))
    .limit(1);
  if (prows.length === 0) {
    return {
      ok: false,
      assetUrl: null,
      assetTitle: null,
      score: 0,
      reason: "prospect_not_found",
      rationale: "",
    };
  }
  const prospect = prows[0]!;

  const siteRow = await db
    .select()
    .from(sites)
    .where(eq(sites.id, prospect.siteId))
    .limit(1);
  const siteDomain = siteRow[0]?.domain ?? "";

  const articles = await db
    .select({
      id: contentPlan.id,
      slug: contentPlan.slug,
      title: contentPlan.title,
      qualityScore: contentPlan.qualityScore,
      keywordTerm: keywords.term,
      keywordCluster: keywords.cluster,
    })
    .from(contentPlan)
    .leftJoin(keywords, eq(contentPlan.keywordId, keywords.id))
    .where(
      and(
        eq(contentPlan.siteId, prospect.siteId),
        eq(contentPlan.status, "published"),
        gte(contentPlan.qualityScore, MIN_QUALITY)
      )
    );

  const anchorTokens = tokens(prospect.anchorText ?? "");
  const competitorTokens = tokens(prospect.competitorUrl ?? "");
  const sourceTokens = tokens(prospect.backlinkUrl ?? "");

  let best: {
    score: number;
    article: (typeof articles)[number] | null;
    rationale: string;
  } = {
    score: 0,
    article: null,
    rationale: "",
  };

  for (const a of articles) {
    let score = 10; // base for top-quality
    const reasons: string[] = ["+10 base (quality_score >= 90)"];
    const term = (a.keywordTerm ?? "").toLowerCase();
    const cluster = (a.keywordCluster ?? "").toLowerCase();
    const titleTokens = tokens(a.title ?? "");
    const termTokens = tokens(term);
    const clusterTokens = tokens(cluster);

    if (anchorTokens.size > 0 && overlap(anchorTokens, termTokens) > 0) {
      score += 30;
      reasons.push("+30 keyword in anchor");
    }
    if (sourceTokens.size > 0 && overlap(sourceTokens, clusterTokens) > 0) {
      score += 25;
      reasons.push("+25 cluster matches source page slug");
    }
    if (
      competitorTokens.size > 0 &&
      overlap(competitorTokens, clusterTokens) > 0
    ) {
      score += 20;
      reasons.push("+20 cluster matches competitor URL path");
    }
    if (anchorTokens.size > 0 && overlap(anchorTokens, titleTokens) > 0) {
      score += 15;
      reasons.push("+15 anchor overlaps title");
    }
    if (campaignType === "broken_link" && (a.title ?? "").length > 0) {
      score += 5;
      reasons.push("+5 broken-link prefers titled assets");
    }

    if (score > best.score) {
      best = {
        score,
        article: a,
        rationale: reasons.join("; "),
      };
    }
  }

  if (!best.article || best.score < minScore) {
    return {
      ok: false,
      assetUrl: null,
      assetTitle: null,
      score: best.score,
      reason: "no_matching_asset",
      rationale: best.rationale,
    };
  }

  const url = `https://${siteDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/blog/${best.article.slug}`;
  return {
    ok: true,
    assetUrl: url,
    assetTitle: best.article.title ?? best.article.slug,
    score: best.score,
    rationale: best.rationale,
  };
}

void sql;
void schema;
