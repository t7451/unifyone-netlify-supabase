import type { Config } from "@netlify/functions";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { connectNeon, logger, schema } from "@1commerce/spire";

// Weekly digest: Monday 08:00 America/Los_Angeles. Netlify's scheduler runs
// in UTC, so 08:00 PT in standard time = 16:00 UTC, and in DST (March–Nov)
// = 15:00 UTC. We use 15:00 UTC year-round: an hour "early" during PST months
// is tolerable for a status email; an hour late during DST months isn't
// (people are already at their desks). Trade-off documented here so future
// operators don't wonder.
export const config: Config = {
  schedule: "0 15 * * 1",
};

export default async (_req: Request) => {
  const env = {
    NEON_DATABASE_URL: required("NEON_DATABASE_URL"),
    MAILERLITE_API_KEY: process.env.MAILERLITE_API_KEY ?? "",
    DIGEST_TO_EMAIL: process.env.DIGEST_TO_EMAIL ?? "",
    DIGEST_TO_NAME: process.env.DIGEST_TO_NAME ?? "Keith",
  };

  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const sites = await db.select().from(schema.sites).where(eq(schema.sites.active, true));

    const perSite = [] as Array<{
      slug: string;
      published: number;
      avgQuality: number | null;
      counts: Record<string, number>;
      topFive: Array<{ title: string | null; slug: string; qualityScore: number | null; url: string }>;
      needsAttention: Array<{ id: string; slug: string; error: string | null }>;
      // Batch 04 additions:
      submissions: {
        counts: Record<string, number>;
        landedThisWeek: Array<{ directory: string; liveUrl: string | null }>;
        failedThisWeek: Array<{ directory: string; error: string | null }>;
      };
      rankMovement: {
        topGains: Array<{ term: string; target: string; from: number | null; to: number | null; delta: number }>;
        topLosses: Array<{ term: string; target: string; from: number | null; to: number | null; delta: number }>;
        newTop10: Array<{ term: string; target: string; rank: number }>;
      };
    }>;

    for (const site of sites) {
      const publishedLastWeek = await db
        .select({
          id: schema.contentPlan.id,
          slug: schema.contentPlan.slug,
          title: schema.contentPlan.title,
          qualityScore: schema.contentPlan.qualityScore,
          publishedAt: schema.contentPlan.publishedAt,
        })
        .from(schema.contentPlan)
        .where(
          and(
            eq(schema.contentPlan.siteId, site.id),
            eq(schema.contentPlan.status, "published"),
            gte(schema.contentPlan.publishedAt, weekAgo)
          )
        )
        .orderBy(desc(schema.contentPlan.qualityScore));

      const statusCounts = await db
        .select({ status: schema.contentPlan.status, count: sql<number>`count(*)::int` })
        .from(schema.contentPlan)
        .where(eq(schema.contentPlan.siteId, site.id))
        .groupBy(schema.contentPlan.status);

      const failed = await db
        .select({ id: schema.contentPlan.id, slug: schema.contentPlan.slug, error: schema.contentPlan.error })
        .from(schema.contentPlan)
        .where(and(eq(schema.contentPlan.siteId, site.id), eq(schema.contentPlan.status, "failed")))
        .orderBy(desc(schema.contentPlan.updatedAt))
        .limit(10);

      const avgQuality =
        publishedLastWeek.length === 0
          ? null
          : Math.round(
              publishedLastWeek.reduce((acc, r) => acc + (r.qualityScore ?? 0), 0) /
                publishedLastWeek.length
            );

      perSite.push({
        slug: site.slug,
        published: publishedLastWeek.length,
        avgQuality,
        counts: Object.fromEntries(statusCounts.map((s) => [s.status, s.count])),
        topFive: publishedLastWeek.slice(0, 5).map((r) => ({
          title: r.title,
          slug: r.slug,
          qualityScore: r.qualityScore,
          url: `https://${site.domain}/blog/${r.slug}`,
        })),
        needsAttention: failed.map((f) => ({ id: f.id, slug: f.slug, error: f.error })),
        submissions: await gatherSubmissions(db, site.id, weekAgo),
        rankMovement: await gatherRankMovement(db, site.id),
      });
    }

    const htmlBody = renderDigestHtml(perSite);

    if (env.MAILERLITE_API_KEY && env.DIGEST_TO_EMAIL) {
      await sendViaMailerLite({
        apiKey: env.MAILERLITE_API_KEY,
        toEmail: env.DIGEST_TO_EMAIL,
        toName: env.DIGEST_TO_NAME,
        subject: `Spire weekly digest — ${new Date().toISOString().slice(0, 10)}`,
        html: htmlBody,
      });
      logger.info({ to: env.DIGEST_TO_EMAIL, sites: perSite.length }, "Digest emailed");
    } else {
      logger.info(
        { to: env.DIGEST_TO_EMAIL || "(unset)", html: htmlBody.slice(0, 300) + "..." },
        "Digest email skipped (MailerLite key or recipient missing); logging content"
      );
    }

    return new Response(JSON.stringify({ ok: true, perSite }), {
      headers: { "content-type": "application/json" },
    });
  } finally {
    await raw.end({ timeout: 5 });
  }
};

type PerSite = {
  slug: string;
  published: number;
  avgQuality: number | null;
  counts: Record<string, number>;
  topFive: Array<{ title: string | null; slug: string; qualityScore: number | null; url: string }>;
  needsAttention: Array<{ id: string; slug: string; error: string | null }>;
  submissions: {
    counts: Record<string, number>;
    landedThisWeek: Array<{ directory: string; liveUrl: string | null }>;
    failedThisWeek: Array<{ directory: string; error: string | null }>;
  };
  rankMovement: {
    topGains: Array<{ term: string; target: string; from: number | null; to: number | null; delta: number }>;
    topLosses: Array<{ term: string; target: string; from: number | null; to: number | null; delta: number }>;
    newTop10: Array<{ term: string; target: string; rank: number }>;
  };
};

async function gatherSubmissions(
  db: ReturnType<typeof connectNeon>["db"],
  siteId: string,
  since: Date
): Promise<PerSite["submissions"]> {
  const counts = await db
    .select({ status: schema.submissions.status, count: sql<number>`count(*)::int` })
    .from(schema.submissions)
    .where(eq(schema.submissions.siteId, siteId))
    .groupBy(schema.submissions.status);

  const landed = await db
    .select({
      directory: schema.directories.slug,
      liveUrl: schema.submissions.liveUrl,
    })
    .from(schema.submissions)
    .innerJoin(schema.directories, eq(schema.directories.id, schema.submissions.directoryId))
    .where(
      and(
        eq(schema.submissions.siteId, siteId),
        eq(schema.submissions.status, "sent"),
        gte(schema.submissions.sentAt, since)
      )
    );

  const failed = await db
    .select({
      directory: schema.directories.slug,
      error: schema.submissions.error,
    })
    .from(schema.submissions)
    .innerJoin(schema.directories, eq(schema.directories.id, schema.submissions.directoryId))
    .where(
      and(
        eq(schema.submissions.siteId, siteId),
        eq(schema.submissions.status, "failed"),
        gte(schema.submissions.updatedAt, since)
      )
    );

  return {
    counts: Object.fromEntries(counts.map((c) => [c.status, c.count])),
    landedThisWeek: landed,
    failedThisWeek: failed,
  };
}

async function gatherRankMovement(
  db: ReturnType<typeof connectNeon>["db"],
  siteId: string
): Promise<PerSite["rankMovement"]> {
  // For each active tracked keyword on this site, grab the latest 2 rank
  // checks and diff. Deltas of ≥ 5 (either direction) surface; new top-10
  // entries (latest.rank ≤ 10 && prior.rank > 10) surface.
  const tracked = await db
    .select({
      id: schema.trackedKeywords.id,
      term: schema.keywords.term,
      target: schema.trackedKeywords.targetUrl,
    })
    .from(schema.trackedKeywords)
    .innerJoin(schema.keywords, eq(schema.keywords.id, schema.trackedKeywords.keywordId))
    .where(
      and(eq(schema.trackedKeywords.active, true), eq(schema.trackedKeywords.siteId, siteId))
    );

  const gains: PerSite["rankMovement"]["topGains"] = [];
  const losses: PerSite["rankMovement"]["topLosses"] = [];
  const newTop10: PerSite["rankMovement"]["newTop10"] = [];

  for (const t of tracked) {
    const checks = await db
      .select({ rank: schema.rankChecks.rank, checkedAt: schema.rankChecks.checkedAt })
      .from(schema.rankChecks)
      .where(eq(schema.rankChecks.trackedKeywordId, t.id))
      .orderBy(desc(schema.rankChecks.checkedAt))
      .limit(2);

    if (checks.length === 0) continue;
    const latest = checks[0]!;
    const prior = checks[1];

    // New top-10: latest in top-10 and prior is outside (or absent).
    if (latest.rank !== null && latest.rank <= 10) {
      if (!prior || prior.rank === null || prior.rank > 10) {
        newTop10.push({ term: t.term, target: t.target, rank: latest.rank });
      }
    }

    if (!prior) continue;
    // Negative delta = improvement (going from rank 47 to rank 12 is -35).
    // Surface as gain. Positive delta = regression, surface as loss.
    const from = prior.rank ?? 101;
    const to = latest.rank ?? 101;
    const delta = to - from;
    if (Math.abs(delta) >= 5) {
      const entry = { term: t.term, target: t.target, from: prior.rank, to: latest.rank, delta };
      if (delta < 0) gains.push(entry);
      else losses.push(entry);
    }
  }

  gains.sort((a, b) => a.delta - b.delta);
  losses.sort((a, b) => b.delta - a.delta);

  return {
    topGains: gains.slice(0, 10),
    topLosses: losses.slice(0, 10),
    newTop10,
  };
}

function renderDigestHtml(perSite: PerSite[]): string {
  const sections = perSite
    .map((s) => {
      const top = s.topFive
        .map((t) => `<li><a href="${t.url}">${escape(t.title ?? t.slug)}</a> (quality ${t.qualityScore ?? "?"})</li>`)
        .join("");
      const attention = s.needsAttention
        .map((a) => `<li><code>${escape(a.slug)}</code> — ${escape(a.error ?? "(no error recorded)")}</li>`)
        .join("");
      const counts = Object.entries(s.counts)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ");
      const submissionCounts = Object.entries(s.submissions.counts)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ");
      const landed = s.submissions.landedThisWeek
        .map(
          (ls) =>
            `<li><code>${escape(ls.directory)}</code>${ls.liveUrl ? ` → <a href="${escape(ls.liveUrl)}">${escape(ls.liveUrl)}</a>` : ""}</li>`
        )
        .join("");
      const submissionsFailed = s.submissions.failedThisWeek
        .map(
          (f) =>
            `<li><code>${escape(f.directory)}</code> — ${escape(f.error ?? "(no error recorded)")}</li>`
        )
        .join("");
      const gainsList = s.rankMovement.topGains
        .map(
          (g) =>
            `<li>${escape(g.term)}: ${g.from ?? "—"} → ${g.to ?? "—"} (<strong>${g.delta >= 0 ? "+" : ""}${g.delta}</strong>)</li>`
        )
        .join("");
      const lossesList = s.rankMovement.topLosses
        .map(
          (g) =>
            `<li>${escape(g.term)}: ${g.from ?? "—"} → ${g.to ?? "—"} (<strong>${g.delta}</strong>)</li>`
        )
        .join("");
      const newTop10List = s.rankMovement.newTop10
        .map((t) => `<li>${escape(t.term)} → rank ${t.rank} on <code>${escape(t.target)}</code></li>`)
        .join("");
      return `<h2>${escape(s.slug)}</h2>
        <p><strong>${s.published}</strong> published this week · avg quality ${s.avgQuality ?? "n/a"}</p>
        <p><small>Content pipeline: ${escape(counts)}</small></p>
        ${top ? `<h3>Top 5 this week</h3><ul>${top}</ul>` : ""}
        <h3>Submissions this week</h3>
        <p><small>Queue: ${escape(submissionCounts || "(none)")}</small></p>
        ${landed ? `<p>Landed:</p><ul>${landed}</ul>` : "<p>None landed this week.</p>"}
        ${submissionsFailed ? `<p>Failed:</p><ul>${submissionsFailed}</ul>` : ""}
        <h3>Rank movement</h3>
        ${newTop10List ? `<p>New top-10 entries:</p><ul>${newTop10List}</ul>` : ""}
        ${gainsList ? `<p>Biggest gains:</p><ul>${gainsList}</ul>` : ""}
        ${lossesList ? `<p>Biggest losses:</p><ul>${lossesList}</ul>` : ""}
        ${!newTop10List && !gainsList && !lossesList ? "<p>No significant rank movement (week over week).</p>" : ""}
        ${attention ? `<h3>Needs attention (${s.needsAttention.length})</h3><ul>${attention}</ul>` : ""}`;
    })
    .join("<hr />");

  return `<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 640px;">
    <h1>Spire weekly digest</h1>
    <p>${new Date().toISOString().slice(0, 10)}</p>
    ${sections}
  </div>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendViaMailerLite(params: {
  apiKey: string;
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
}): Promise<void> {
  // MailerLite's transactional-like send goes through the campaigns API;
  // for a one-recipient operational email we use the single-send endpoint.
  const res = await fetch("https://connect.mailerlite.com/api/automations/triggers", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      email: params.toEmail,
      name: params.toName,
      subject: params.subject,
      html: params.html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MailerLite send failed: ${res.status} ${text.slice(0, 300)}`);
  }
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}
