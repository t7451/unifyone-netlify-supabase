import type { Config } from "@netlify/functions";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  connectNeon,
  findRisingQueries,
  findStrikingDistanceQueries,
  logger,
  schema,
  summarizeGsc,
} from "@1commerce/spire";

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
    // MailerLite campaigns require a *verified* sender. Without it the
    // create-campaign call 422s, so we treat it as a precondition for sending.
    DIGEST_FROM_EMAIL: process.env.DIGEST_FROM_EMAIL ?? "",
    DIGEST_FROM_NAME: process.env.DIGEST_FROM_NAME ?? "UnifyOne Spire",
    // Group the digest recipient is filed under; created on first send.
    DIGEST_GROUP_NAME: process.env.DIGEST_GROUP_NAME ?? "Spire Digest Recipients",
  };

  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const sites = await db.select().from(schema.sites).where(eq(schema.sites.active, true));

    // Type defined below (PerSite). Inline type used to be duplicated here
    // — Batch 05 expands the shape with gsc + syndication, so we just use
    // the canonical PerSite type and stay DRY.
    const perSite: PerSite[] = [];

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
        gsc: await gatherGsc(db, site.id),
        syndication: await gatherSyndications(db, site.id, weekAgo),
        outreach: await gatherOutreach(db, site.id, weekAgo),
      });
    }

    // HARO queue is global, not per-site — inbound queries don't carry a
    // site_id (they're matched at classify time to the configured HARO_SITE_SLUG).
    const haroSummary = await gatherHaroQueue(db, weekAgo);

    const htmlBody = renderDigestHtml(perSite, haroSummary);

    if (env.MAILERLITE_API_KEY && env.DIGEST_TO_EMAIL && env.DIGEST_FROM_EMAIL) {
      await sendViaMailerLite({
        apiKey: env.MAILERLITE_API_KEY,
        toEmail: env.DIGEST_TO_EMAIL,
        toName: env.DIGEST_TO_NAME,
        fromEmail: env.DIGEST_FROM_EMAIL,
        fromName: env.DIGEST_FROM_NAME,
        groupName: env.DIGEST_GROUP_NAME,
        subject: `Spire weekly digest — ${new Date().toISOString().slice(0, 10)}`,
        html: htmlBody,
      });
      logger.info({ to: env.DIGEST_TO_EMAIL, sites: perSite.length }, "Digest emailed");
    } else {
      logger.info(
        {
          to: env.DIGEST_TO_EMAIL || "(unset)",
          from: env.DIGEST_FROM_EMAIL || "(unset)",
          html: htmlBody.slice(0, 300) + "...",
        },
        "Digest email skipped (MailerLite key, recipient, or verified sender missing); logging content"
      );
    }

    return new Response(JSON.stringify({ ok: true, perSite, haro: haroSummary }), {
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
  gsc: {
    summary: Awaited<ReturnType<typeof summarizeGsc>>;
    strikingDistance: Awaited<ReturnType<typeof findStrikingDistanceQueries>>;
    rising: Awaited<ReturnType<typeof findRisingQueries>>;
  } | null;
  syndication: {
    counts: Record<string, number>;
    publishedThisWeek: Array<{ platform: string; planSlug: string; externalUrl: string | null }>;
    failedThisWeek: Array<{ platform: string; planSlug: string; error: string | null }>;
  };
  outreach: {
    sentByCampaign: Array<{ type: string; sent: number; cap: number }>;
    sentByStep: Record<string, number>;
    replyRate: { sent: number; replied: number; pct: number };
    wins: Array<{ domain: string; campaignType: string }>;
    suppressionAdds: number;
    bounceRate: { sent: number; bounced: number; pct: number };
    pendingApproval: number;
  };
};

type HaroSummary = {
  newHighScore: Array<{ id: string; outlet: string | null; subject: string; score: number | null; deadline: Date | null }>;
  deadlinesIn48h: Array<{ id: string; outlet: string | null; subject: string; deadline: Date | null }>;
  wonThisWeek: Array<{ id: string; outlet: string | null; outcomeUrl: string | null; outcomeDr: number | null }>;
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

async function gatherGsc(
  db: ReturnType<typeof connectNeon>["db"],
  siteId: string
): Promise<PerSite["gsc"]> {
  try {
    const [summary, strikingDistance, rising] = await Promise.all([
      summarizeGsc(db, { siteId }),
      findStrikingDistanceQueries(db, { siteId, weeks: 1, limit: 5 }),
      findRisingQueries(db, { siteId, weeks: 2, limit: 3 }),
    ]);
    if (summary.recentImpressions === 0 && summary.priorImpressions === 0) {
      // No GSC data yet (first week, or service-account hasn't been linked).
      return null;
    }
    return { summary, strikingDistance, rising };
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "GSC gather failed; digest will skip the section"
    );
    return null;
  }
}

async function gatherSyndications(
  db: ReturnType<typeof connectNeon>["db"],
  siteId: string,
  since: Date
): Promise<PerSite["syndication"]> {
  const counts = await db
    .select({
      status: schema.syndications.status,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.syndications)
    .innerJoin(schema.contentPlan, eq(schema.contentPlan.id, schema.syndications.contentPlanId))
    .where(eq(schema.contentPlan.siteId, siteId))
    .groupBy(schema.syndications.status);

  const published = await db
    .select({
      platform: schema.syndicationPlatforms.slug,
      planSlug: schema.contentPlan.slug,
      externalUrl: schema.syndications.externalUrl,
    })
    .from(schema.syndications)
    .innerJoin(schema.contentPlan, eq(schema.contentPlan.id, schema.syndications.contentPlanId))
    .innerJoin(
      schema.syndicationPlatforms,
      eq(schema.syndicationPlatforms.id, schema.syndications.platformId)
    )
    .where(
      and(
        eq(schema.contentPlan.siteId, siteId),
        eq(schema.syndications.status, "published"),
        gte(schema.syndications.publishedAt, since)
      )
    );

  const failed = await db
    .select({
      platform: schema.syndicationPlatforms.slug,
      planSlug: schema.contentPlan.slug,
      error: schema.syndications.error,
    })
    .from(schema.syndications)
    .innerJoin(schema.contentPlan, eq(schema.contentPlan.id, schema.syndications.contentPlanId))
    .innerJoin(
      schema.syndicationPlatforms,
      eq(schema.syndicationPlatforms.id, schema.syndications.platformId)
    )
    .where(
      and(
        eq(schema.contentPlan.siteId, siteId),
        eq(schema.syndications.status, "failed"),
        gte(schema.syndications.updatedAt, since)
      )
    );

  return {
    counts: Object.fromEntries(counts.map((c) => [c.status, c.count])),
    publishedThisWeek: published,
    failedThisWeek: failed,
  };
}

async function gatherOutreach(
  db: ReturnType<typeof connectNeon>["db"],
  siteId: string,
  since: Date
): Promise<PerSite["outreach"]> {
  // Sent counts by campaign (today + last 7 days for sent_count is on the
  // volume table; use messages directly for per-week totals).
  const byCampaign = await db.execute(sql`
    select c.campaign_type as type,
           count(m.id) filter (where m.status='sent' and m.sent_at >= ${since})::int as sent,
           c.daily_send_cap as cap
      from spire_outreach_campaigns c
      left join spire_outreach_sequences s on s.campaign_id = c.id
      left join spire_outreach_messages m on m.sequence_id = s.id
     where c.site_id = ${siteId}
     group by c.id, c.campaign_type, c.daily_send_cap
     order by c.campaign_type
  `);
  const sentByCampaign = (
    (byCampaign as unknown as { rows?: Array<{ type: string; sent: number; cap: number }> })
      .rows ?? []
  ).map(r => ({ type: r.type, sent: r.sent, cap: r.cap }));

  const byStep = await db.execute(sql`
    select m.step::text as step, count(*)::int as n
      from spire_outreach_messages m
      join spire_outreach_sequences s on s.id = m.sequence_id
      join spire_outreach_campaigns c on c.id = s.campaign_id
     where c.site_id = ${siteId}
       and m.status = 'sent'
       and m.sent_at >= ${since}
     group by m.step
  `);
  const sentByStep: Record<string, number> = Object.fromEntries(
    ((byStep as unknown as { rows?: Array<{ step: string; n: number }> }).rows ?? []).map(
      r => [r.step, r.n]
    )
  );

  const totals = await db.execute(sql`
    select
      count(*) filter (where m.status='sent' and m.sent_at >= ${since})::int as sent,
      count(distinct r.id)::int as replied,
      count(*) filter (where m.status='bounced')::int as bounced
      from spire_outreach_campaigns c
      left join spire_outreach_sequences s on s.campaign_id = c.id
      left join spire_outreach_messages m on m.sequence_id = s.id
      left join spire_outreach_replies r on r.message_id = m.id
     where c.site_id = ${siteId}
  `);
  const t = (totals as unknown as {
    rows?: Array<{ sent: number; replied: number; bounced: number }>;
  }).rows?.[0] ?? { sent: 0, replied: 0, bounced: 0 };
  const replyPct = t.sent > 0 ? (t.replied / t.sent) * 100 : 0;
  const bouncePct = t.sent > 0 ? (t.bounced / t.sent) * 100 : 0;

  const winsRows = await db.execute(sql`
    select p.domain as domain, c.campaign_type as type
      from spire_outreach_replies r
      join spire_outreach_sequences s on s.id = r.sequence_id
      join spire_outreach_campaigns c on c.id = s.campaign_id
      join spire_outreach_prospects p on p.id = s.prospect_id
     where c.site_id = ${siteId}
       and r.classification = 'positive'
       and r.received_at >= ${since}
     order by r.received_at desc
     limit 20
  `);
  const wins = (
    (winsRows as unknown as { rows?: Array<{ domain: string; type: string }> }).rows ?? []
  ).map(r => ({ domain: r.domain, campaignType: r.type }));

  const suppRows = await db.execute(sql`
    select count(*)::int as n
      from spire_outreach_suppression
     where created_at >= ${since}
  `);
  const suppressionAdds = (
    (suppRows as unknown as { rows?: Array<{ n: number }> }).rows ?? []
  )[0]?.n ?? 0;

  const pendingRows = await db.execute(sql`
    select count(*)::int as n
      from spire_outreach_messages m
      join spire_outreach_sequences s on s.id = m.sequence_id
      join spire_outreach_campaigns c on c.id = s.campaign_id
     where c.site_id = ${siteId}
       and m.status = 'pending_approval'
  `);
  const pendingApproval = (
    (pendingRows as unknown as { rows?: Array<{ n: number }> }).rows ?? []
  )[0]?.n ?? 0;

  return {
    sentByCampaign,
    sentByStep,
    replyRate: { sent: t.sent, replied: t.replied, pct: Math.round(replyPct * 10) / 10 },
    wins,
    suppressionAdds,
    bounceRate: { sent: t.sent, bounced: t.bounced, pct: Math.round(bouncePct * 10) / 10 },
    pendingApproval,
  };
}

async function gatherHaroQueue(
  db: ReturnType<typeof connectNeon>["db"],
  since: Date
): Promise<HaroSummary> {
  const newHighScore = await db
    .select({
      id: schema.prOpportunities.id,
      outlet: schema.prOpportunities.outlet,
      subject: schema.prOpportunities.querySubject,
      score: schema.prOpportunities.matchScore,
      deadline: schema.prOpportunities.deadline,
    })
    .from(schema.prOpportunities)
    .where(
      and(
        eq(schema.prOpportunities.status, "qualified"),
        gte(schema.prOpportunities.matchScore, 70)
      )
    )
    .orderBy(desc(schema.prOpportunities.matchScore))
    .limit(15);

  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const deadlinesIn48h = await db
    .select({
      id: schema.prOpportunities.id,
      outlet: schema.prOpportunities.outlet,
      subject: schema.prOpportunities.querySubject,
      deadline: schema.prOpportunities.deadline,
    })
    .from(schema.prOpportunities)
    .where(
      and(
        eq(schema.prOpportunities.status, "qualified"),
        sql`${schema.prOpportunities.deadline} is not null`,
        sql`${schema.prOpportunities.deadline} <= ${in48h}`,
        sql`${schema.prOpportunities.deadline} > now()`
      )
    )
    .orderBy(schema.prOpportunities.deadline);

  const wonThisWeek = await db
    .select({
      id: schema.prOpportunities.id,
      outlet: schema.prOpportunities.outlet,
      outcomeUrl: schema.prOpportunities.outcomeUrl,
      outcomeDr: schema.prOpportunities.outcomeDr,
    })
    .from(schema.prOpportunities)
    .where(
      and(
        eq(schema.prOpportunities.status, "won"),
        gte(schema.prOpportunities.decidedAt, since)
      )
    );

  return { newHighScore, deadlinesIn48h, wonThisWeek };
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

function renderDigestHtml(perSite: PerSite[], haro: HaroSummary): string {
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
      // Batch 05 sections per site: GSC + syndication
      const gscBlock = s.gsc
        ? renderGscBlock(s.gsc)
        : "<h3>Search Console</h3><p>No GSC data yet (verify the service-account is linked to the property).</p>";

      const syndBlock = renderSyndicationBlock(s.syndication);
      const outreachBlock = renderOutreachBlock(s.outreach);

      return `<h2>${escape(s.slug)}</h2>
        <p><strong>${s.published}</strong> published this week · avg quality ${s.avgQuality ?? "n/a"}</p>
        <p><small>Content pipeline: ${escape(counts)}</small></p>
        ${top ? `<h3>Top 5 this week</h3><ul>${top}</ul>` : ""}
        ${gscBlock}
        ${syndBlock}
        ${outreachBlock}
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

  // Batch 05: cross-site HARO queue at the bottom (it's not site-scoped).
  const haroBlock = renderHaroBlock(haro);

  return `<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 640px;">
    <h1>Spire weekly digest</h1>
    <p>${new Date().toISOString().slice(0, 10)}</p>
    ${sections}
    <hr />
    ${haroBlock}
  </div>`;
}

function renderGscBlock(gsc: NonNullable<PerSite["gsc"]>): string {
  const s = gsc.summary;
  const summary = `<p>${s.recentClicks} clicks / ${s.recentImpressions} impressions / avg position ${s.recentAvgPosition} (last 7d) — week before: ${s.priorClicks}/${s.priorImpressions}/${s.priorAvgPosition}.</p>`;
  const striking = gsc.strikingDistance.length === 0
    ? ""
    : `<p>Striking distance (position 5–20, ≥50 imp/wk):</p><ul>${gsc.strikingDistance
        .slice(0, 5)
        .map(
          (r) =>
            `<li>"${escape(r.query)}" — pos ${r.position}, ${r.impressions} imp, ${r.clicks} click → <code>${escape(r.page)}</code></li>`
        )
        .join("")}</ul>`;
  const rising = gsc.rising.length === 0
    ? ""
    : `<p>Rising queries (≥50% growth):</p><ul>${gsc.rising
        .slice(0, 3)
        .map(
          (r) =>
            `<li>"${escape(r.query)}" — ${r.priorImpressions}→${r.recentImpressions} imp (${(r.pctChange * 100).toFixed(0)}%)</li>`
        )
        .join("")}</ul>`;
  return `<h3>Search Console</h3>${summary}${striking}${rising}`;
}

function renderSyndicationBlock(synd: PerSite["syndication"]): string {
  const counts = Object.entries(synd.counts).map(([k, v]) => `${k}: ${v}`).join(" · ") || "(none)";
  const published = synd.publishedThisWeek
    .map(
      (p) =>
        `<li><code>${escape(p.platform)}</code> — ${escape(p.planSlug)}${p.externalUrl ? ` → <a href="${escape(p.externalUrl)}">${escape(p.externalUrl)}</a>` : ""}</li>`
    )
    .join("");
  const failed = synd.failedThisWeek
    .map(
      (f) =>
        `<li><code>${escape(f.platform)}</code> — ${escape(f.planSlug)}: ${escape(f.error ?? "(no error)")}</li>`
    )
    .join("");
  return `<h3>Syndication</h3>
    <p><small>Pipeline: ${escape(counts)}</small></p>
    ${published ? `<p>Published this week:</p><ul>${published}</ul>` : "<p>No new syndications published this week.</p>"}
    ${failed ? `<p>Failed:</p><ul>${failed}</ul>` : ""}`;
}

function renderOutreachBlock(outreach: PerSite["outreach"]): string {
  const byCampaign = outreach.sentByCampaign
    .map(
      c =>
        `<li><code>${escape(c.type)}</code>: ${c.sent} sent (cap ${c.cap}/day)</li>`
    )
    .join("");
  const byStep = Object.entries(outreach.sentByStep)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([step, n]) => `step ${step}: ${n}`)
    .join(" · ");
  const wins = outreach.wins
    .map(
      w =>
        `<li><strong>${escape(w.domain)}</strong> via ${escape(w.campaignType)}</li>`
    )
    .join("");
  const bounceWarn =
    outreach.bounceRate.pct > 5
      ? `<p><strong style="color:#a00">Bounce rate ${outreach.bounceRate.pct}% — investigate, threshold is 5%.</strong></p>`
      : "";
  const pendingWarn =
    outreach.pendingApproval > 0
      ? `<p><strong>${outreach.pendingApproval} message(s) awaiting your approval.</strong> Run <code>pnpm spire outreach review --campaign &lt;id&gt;</code>.</p>`
      : "";
  return `<h3>Outreach (last 7 days)</h3>
    ${byCampaign ? `<ul>${byCampaign}</ul>` : "<p>No outreach activity yet.</p>"}
    ${byStep ? `<p><small>By step — ${escape(byStep)}</small></p>` : ""}
    <p>Reply rate: ${outreach.replyRate.replied}/${outreach.replyRate.sent} (${outreach.replyRate.pct}%)</p>
    <p>Bounce rate: ${outreach.bounceRate.bounced}/${outreach.bounceRate.sent} (${outreach.bounceRate.pct}%)</p>
    ${bounceWarn}
    ${wins ? `<p>Wins this week:</p><ul>${wins}</ul>` : ""}
    ${outreach.suppressionAdds > 0 ? `<p><small>${outreach.suppressionAdds} new suppression add(s).</small></p>` : ""}
    ${pendingWarn}`;
}

function renderHaroBlock(haro: HaroSummary): string {
  const newQueue = haro.newHighScore
    .map(
      (h) =>
        `<li>[${h.score ?? "?"}] <strong>${escape(h.outlet ?? "?")}</strong>: ${escape(h.subject)}${h.deadline ? ` <em>(due ${h.deadline.toISOString().slice(0, 16)})</em>` : ""}</li>`
    )
    .join("");
  const urgent = haro.deadlinesIn48h
    .map(
      (h) =>
        `<li><strong>${escape(h.outlet ?? "?")}</strong>: ${escape(h.subject)}${h.deadline ? ` <em>(due ${h.deadline.toISOString().slice(0, 16)})</em>` : ""}</li>`
    )
    .join("");
  const wins = haro.wonThisWeek
    .map(
      (w) =>
        `<li><strong>${escape(w.outlet ?? "?")}</strong>${w.outcomeUrl ? ` → <a href="${escape(w.outcomeUrl)}">${escape(w.outcomeUrl)}</a>` : ""}${w.outcomeDr ? ` (DR ${w.outcomeDr})` : ""}</li>`
    )
    .join("");
  return `<h2>HARO / PR queue</h2>
    ${urgent ? `<p><strong>Deadlines within 48h (${haro.deadlinesIn48h.length}):</strong></p><ul>${urgent}</ul>` : ""}
    ${newQueue ? `<p>High-score opportunities awaiting review:</p><ul>${newQueue}</ul>` : "<p>No high-score opportunities in queue.</p>"}
    ${wins ? `<p>Won this week:</p><ul>${wins}</ul>` : ""}`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MAILERLITE_API = "https://connect.mailerlite.com/api";

async function mlFetch(
  apiKey: string,
  path: string,
  init: { method: string; body?: unknown }
): Promise<unknown> {
  const res = await fetch(`${MAILERLITE_API}${path}`, {
    method: init.method,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `MailerLite ${init.method} ${path} failed: ${res.status} ${text.slice(0, 300)}`
    );
  }
  // 204 (e.g. assign-to-group) has no body.
  if (res.status === 204) return null;
  return res.json();
}

async function sendViaMailerLite(params: {
  apiKey: string;
  toEmail: string;
  toName: string;
  fromEmail: string;
  fromName: string;
  groupName: string;
  subject: string;
  html: string;
}): Promise<void> {
  // MailerLite has no transactional/single-send endpoint. To deliver an
  // operational email we (1) ensure a recipient group exists, (2) upsert the
  // recipient into it, then (3) create a regular campaign scoped to that group
  // and (4) schedule it for instant delivery. The previous implementation
  // POSTed to /automations/triggers — a route that does not exist on the API,
  // so every send 404'd.

  // 1. Find or create the recipient group (by exact name).
  const groupsResp = (await mlFetch(
    params.apiKey,
    `/groups?filter[name]=${encodeURIComponent(params.groupName)}`,
    { method: "GET" }
  )) as { data?: Array<{ id: string; name: string }> };
  let groupId = groupsResp.data?.find((g) => g.name === params.groupName)?.id;
  if (!groupId) {
    const created = (await mlFetch(params.apiKey, "/groups", {
      method: "POST",
      body: { name: params.groupName },
    })) as { data?: { id: string } };
    groupId = created.data?.id;
    if (!groupId) throw new Error("MailerLite: failed to create recipient group");
  }

  // 2. Upsert the recipient and file them into the group. POST /subscribers is
  // an upsert keyed on email; passing `groups` assigns membership in one call.
  await mlFetch(params.apiKey, "/subscribers", {
    method: "POST",
    body: {
      email: params.toEmail,
      fields: { name: params.toName },
      groups: [groupId],
      status: "active",
    },
  });

  // 3. Create the regular campaign with the rendered HTML.
  const campaign = (await mlFetch(params.apiKey, "/campaigns", {
    method: "POST",
    body: {
      name: params.subject,
      type: "regular",
      groups: [groupId],
      emails: [
        {
          subject: params.subject,
          from_name: params.fromName,
          from: params.fromEmail,
          content: params.html,
        },
      ],
    },
  })) as { data?: { id: string } };
  const campaignId = campaign.data?.id;
  if (!campaignId) throw new Error("MailerLite: campaign created but no id returned");

  // 4. Send it now.
  await mlFetch(params.apiKey, `/campaigns/${campaignId}/schedule`, {
    method: "POST",
    body: { delivery: "instant" },
  });
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}
