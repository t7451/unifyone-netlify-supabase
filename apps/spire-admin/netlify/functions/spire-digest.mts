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

function renderDigestHtml(
  perSite: Array<{
    slug: string;
    published: number;
    avgQuality: number | null;
    counts: Record<string, number>;
    topFive: Array<{ title: string | null; slug: string; qualityScore: number | null; url: string }>;
    needsAttention: Array<{ id: string; slug: string; error: string | null }>;
  }>
): string {
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
      return `<h2>${escape(s.slug)}</h2>
        <p><strong>${s.published}</strong> published this week · avg quality ${s.avgQuality ?? "n/a"}</p>
        <p><small>Pipeline: ${escape(counts)}</small></p>
        ${top ? `<h3>Top 5 this week</h3><ul>${top}</ul>` : ""}
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
