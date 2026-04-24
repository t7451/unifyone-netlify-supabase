import type { Config } from "@netlify/functions";
import { logger } from "@1commerce/spire";
import { runTick } from "../../src/tick.js";
import { loadSiteConfig } from "../../src/load-site-config.js";

// Runs every 15 minutes. Netlify's scheduler reads config.schedule at deploy
// time; the cron expression is standard 5-field. */15 fires at :00, :15, :30,
// :45 UTC every hour.
export const config: Config = {
  schedule: "*/15 * * * *",
};

// Which sites the scheduled tick should run against. Currently hardcoded to
// the UnifyOne seed config; when more sites register, switch to reading the
// sites directory at import time (or query active rows from Neon).
const SCHEDULED_SLUGS = ["unifyone"];

export default async (_req: Request) => {
  const env = readTickEnv();

  const started = Date.now();
  let totalSummary = {
    planned: 0,
    generated: 0,
    published: 0,
    failed: 0,
    sites: [] as Array<{ slug: string; planned: number; generated: number; published: number; failed: number }>,
  };

  for (const slug of SCHEDULED_SLUGS) {
    let cfg: ReturnType<typeof loadSiteConfig>;
    try {
      cfg = loadSiteConfig(slug);
    } catch (err) {
      logger.error(
        { slug, err: err instanceof Error ? err.message : String(err) },
        "Missing site config; skipping in scheduled tick"
      );
      continue;
    }

    try {
      const summary = await runTick({
        trigger: "scheduled",
        siteSlug: slug,
        autopublish: cfg.autopublish,
        autopublishThreshold: cfg.autopublish_quality_threshold,
        env,
      });
      totalSummary.planned += summary.planned;
      totalSummary.generated += summary.generated;
      totalSummary.published += summary.published;
      totalSummary.failed += summary.failed;
      totalSummary.sites.push(...summary.sites);
    } catch (err) {
      logger.error(
        { slug, err: err instanceof Error ? err.message : String(err) },
        "Tick crashed for site"
      );
    }
  }

  const elapsedMs = Date.now() - started;
  logger.info({ elapsedMs, ...totalSummary }, "Scheduled tick complete");

  return new Response(JSON.stringify({ ok: true, elapsedMs, summary: totalSummary }), {
    headers: { "content-type": "application/json" },
  });
};

function readTickEnv() {
  const need = (key: string, fallback?: string) => {
    const v = process.env[key] ?? fallback;
    if (!v) throw new Error(`Missing env: ${key}`);
    return v;
  };
  return {
    NEON_DATABASE_URL: need("NEON_DATABASE_URL"),
    ANTHROPIC_API_KEY: need("ANTHROPIC_API_KEY"),
    GITHUB_TOKEN: need("GITHUB_TOKEN"),
    GITHUB_OWNER: need("GITHUB_OWNER"),
    GITHUB_REPO: need("GITHUB_REPO"),
    GITHUB_BRANCH: process.env.GITHUB_BRANCH ?? "main",
    SPIRE_MODEL: process.env.SPIRE_MODEL ?? "claude-opus-4-7",
    SPIRE_TICK_BRIEFS_PER_RUN: Number(process.env.SPIRE_TICK_BRIEFS_PER_RUN ?? 5),
    SPIRE_TICK_ARTICLES_PER_RUN: Number(process.env.SPIRE_TICK_ARTICLES_PER_RUN ?? 2),
  };
}
