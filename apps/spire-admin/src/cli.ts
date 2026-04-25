#!/usr/bin/env tsx
// CLI entry point for Spire operators. Commands mirror the Batch 03 spec:
//   spire register <site>      — upsert a spire_sites row from config/sites/<site>.json
//   spire seed <site>          — run keyword expansion from that config's seed list
//   spire plan <site> [--n N]  — build N briefs from top-priority queued keywords
//   spire write <plan-id>      — generate the article for a specific plan
//   spire publish <plan-id>    — commit the published content to GitHub
//   spire status <site>        — pipeline counts + recent plans
//   spire tick <site>          — run one iteration of the scheduled logic

import { Command } from "commander";
import { config as loadDotenv } from "dotenv";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { Octokit } from "@octokit/rest";
import {
  buildBrief,
  createAnthropic,
  connectNeon,
  expandKeywords,
  loadEnv,
  logger,
  publishArticle,
  writeArticle,
  schema,
} from "@1commerce/spire";
import { loadSiteConfig } from "./load-site-config.js";
import { runTick } from "./tick.js";

loadDotenv();

const program = new Command();
program.name("spire").description("Spire content engine CLI").version("0.1.0");

program
  .command("register")
  .description("Upsert a spire_sites row from config/sites/<slug>.json")
  .argument("<slug>")
  .action(async (slug: string) => {
    const cfg = loadSiteConfig(slug);
    const env = loadEnv(["NEON_DATABASE_URL"] as const);
    const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
    try {
      const existing = await db
        .select()
        .from(schema.sites)
        .where(eq(schema.sites.slug, cfg.slug))
        .limit(1);

      if (existing[0]) {
        await db
          .update(schema.sites)
          .set({
            domain: cfg.domain,
            repo: cfg.repo,
            contentPath: cfg.content_path,
            brandBriefKey: cfg.brand_brief_key,
            niche: cfg.niche,
            targetAudiences: cfg.target_audiences,
          })
          .where(eq(schema.sites.id, existing[0].id));
        logger.info({ id: existing[0].id, slug: cfg.slug }, "Site updated");
      } else {
        const inserted = await db
          .insert(schema.sites)
          .values({
            slug: cfg.slug,
            domain: cfg.domain,
            repo: cfg.repo,
            contentPath: cfg.content_path,
            brandBriefKey: cfg.brand_brief_key,
            niche: cfg.niche,
            targetAudiences: cfg.target_audiences,
            tier: "foundation",
            active: true,
          })
          .returning({ id: schema.sites.id });
        logger.info({ id: inserted[0]?.id, slug: cfg.slug }, "Site registered");
      }
    } finally {
      await raw.end({ timeout: 5 });
    }
  });

program
  .command("seed")
  .description("Expand seed keywords into spire_keywords via Claude")
  .argument("<slug>")
  .action(async (slug: string) => {
    const cfg = loadSiteConfig(slug);
    const env = loadEnv([
      "NEON_DATABASE_URL",
      "ANTHROPIC_API_KEY",
      "SPIRE_MODEL",
    ] as const);
    const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
    try {
      const [site] = await db
        .select()
        .from(schema.sites)
        .where(eq(schema.sites.slug, cfg.slug))
        .limit(1);
      if (!site)
        throw new Error(
          `Site ${slug} not registered. Run: spire register ${slug}`
        );

      const anthropic = createAnthropic(env.ANTHROPIC_API_KEY);
      const result = await expandKeywords({
        db,
        anthropic,
        model: env.SPIRE_MODEL,
        siteId: site.id,
        seedKeywords: cfg.seed_keywords,
      });
      logger.info(result, "Seed complete");
    } finally {
      await raw.end({ timeout: 5 });
    }
  });

program
  .command("plan")
  .description("Build briefs for the N highest-priority queued keywords")
  .argument("<slug>")
  .option("-n, --n <count>", "how many briefs to build", "5")
  .action(async (slug: string, opts: { n: string }) => {
    const n = Math.max(1, Math.min(20, Number(opts.n)));
    const env = loadEnv([
      "NEON_DATABASE_URL",
      "ANTHROPIC_API_KEY",
      "SPIRE_MODEL",
    ] as const);
    const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
    try {
      const [site] = await db
        .select()
        .from(schema.sites)
        .where(eq(schema.sites.slug, slug))
        .limit(1);
      if (!site) throw new Error(`Site ${slug} not registered`);

      const rows = await db
        .select()
        .from(schema.keywords)
        .where(
          and(
            eq(schema.keywords.siteId, site.id),
            eq(schema.keywords.status, "new")
          )
        )
        .orderBy(desc(schema.keywords.priority), asc(schema.keywords.createdAt))
        .limit(n);

      if (rows.length === 0) {
        logger.warn(
          "No 'new' keywords available to plan. Run `spire seed` first."
        );
        return;
      }

      const anthropic = createAnthropic(env.ANTHROPIC_API_KEY);
      let ok = 0;
      let failed = 0;
      for (const kw of rows) {
        try {
          const result = await buildBrief({
            db,
            anthropic,
            model: env.SPIRE_MODEL,
            keywordId: kw.id,
          });
          logger.info(
            { contentPlanId: result.contentPlanId, slug: result.slug },
            "Brief built"
          );
          ok += 1;
        } catch (err) {
          failed += 1;
          logger.error(
            {
              keywordId: kw.id,
              term: kw.term,
              err: err instanceof Error ? err.message : String(err),
            },
            "Brief failed"
          );
        }
      }
      logger.info({ ok, failed, total: rows.length }, "Plan complete");
    } finally {
      await raw.end({ timeout: 5 });
    }
  });

program
  .command("write")
  .description("Generate the article for a specific plan id")
  .argument("<planId>")
  .action(async (planId: string) => {
    const env = loadEnv([
      "NEON_DATABASE_URL",
      "ANTHROPIC_API_KEY",
      "SPIRE_MODEL",
    ] as const);
    const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
    try {
      const anthropic = createAnthropic(env.ANTHROPIC_API_KEY);
      const result = await writeArticle({
        db,
        anthropic,
        model: env.SPIRE_MODEL,
        contentPlanId: planId,
        // CLI never autopublishes — that's the scheduled tick's job.
      });
      logger.info(
        {
          status: result.status,
          qualityScore: result.qualityScore,
          wordCount: result.wordCount,
        },
        "Write complete"
      );
    } finally {
      await raw.end({ timeout: 5 });
    }
  });

program
  .command("publish")
  .description(
    "Publish a reviewed plan to GitHub (bypasses autopublish threshold)"
  )
  .argument("<planId>")
  .action(async (planId: string) => {
    const env = loadEnv([
      "NEON_DATABASE_URL",
      "GITHUB_TOKEN",
      "GITHUB_OWNER",
      "GITHUB_REPO",
      "GITHUB_BRANCH",
    ] as const);
    const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
    try {
      const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
      const result = await publishArticle({
        db,
        octokit,
        owner: env.GITHUB_OWNER,
        repo: env.GITHUB_REPO,
        branch: env.GITHUB_BRANCH,
        contentPlanId: planId,
      });
      logger.info(result, "Publish complete");
    } finally {
      await raw.end({ timeout: 5 });
    }
  });

program
  .command("status")
  .description("Print pipeline counts and recent plans for a site")
  .argument("<slug>")
  .action(async (slug: string) => {
    const env = loadEnv(["NEON_DATABASE_URL"] as const);
    const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
    try {
      const [site] = await db
        .select()
        .from(schema.sites)
        .where(eq(schema.sites.slug, slug))
        .limit(1);
      if (!site) {
        logger.warn(`Site ${slug} not registered`);
        return;
      }

      const kwCounts = await db
        .select({
          status: schema.keywords.status,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.keywords)
        .where(eq(schema.keywords.siteId, site.id))
        .groupBy(schema.keywords.status);

      const planCounts = await db
        .select({
          status: schema.contentPlan.status,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.contentPlan)
        .where(eq(schema.contentPlan.siteId, site.id))
        .groupBy(schema.contentPlan.status);

      const recent = await db
        .select({
          id: schema.contentPlan.id,
          slug: schema.contentPlan.slug,
          title: schema.contentPlan.title,
          status: schema.contentPlan.status,
          qualityScore: schema.contentPlan.qualityScore,
          createdAt: schema.contentPlan.createdAt,
        })
        .from(schema.contentPlan)
        .where(eq(schema.contentPlan.siteId, site.id))
        .orderBy(desc(schema.contentPlan.createdAt))
        .limit(10);

      logger.info(
        { site: site.slug, domain: site.domain, id: site.id },
        "Site"
      );
      logger.info({ keywords: kwCounts, plans: planCounts }, "Pipeline counts");
      logger.info({ recent }, "Recent plans");
    } finally {
      await raw.end({ timeout: 5 });
    }
  });

program
  .command("tick")
  .description("Run one iteration of the scheduled logic manually")
  .argument("<slug>")
  .action(async (slug: string) => {
    const env = loadEnv([
      "NEON_DATABASE_URL",
      "ANTHROPIC_API_KEY",
      "GITHUB_TOKEN",
      "GITHUB_OWNER",
      "GITHUB_REPO",
      "GITHUB_BRANCH",
      "SPIRE_MODEL",
      "SPIRE_TICK_BRIEFS_PER_RUN",
      "SPIRE_TICK_ARTICLES_PER_RUN",
    ] as const);
    const summary = await runTick({
      trigger: "manual",
      siteSlug: slug,
      autopublish: loadSiteConfig(slug).autopublish,
      autopublishThreshold: loadSiteConfig(slug).autopublish_quality_threshold,
      env,
    });
    logger.info(summary, "Tick complete");
  });

// --- Batch 04: distribution commands ---

const directories = program
  .command("directories")
  .description("Directory registry management");

directories
  .command("seed")
  .description("Load config/directories/seed.json into spire_directories")
  .action(async () => {
    const { seedDirectoriesCommand } = await import(
      "./commands/seed-directories.js"
    );
    await seedDirectoriesCommand();
  });

directories
  .command("list")
  .description("List registered directories")
  .option("--active", "only show active directories")
  .action(async (opts: { active?: boolean }) => {
    const env = loadEnv(["NEON_DATABASE_URL"] as const);
    const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
    try {
      const rows = opts.active
        ? await db
            .select()
            .from(schema.directories)
            .where(eq(schema.directories.active, true))
        : await db.select().from(schema.directories);
      logger.info(
        rows.map(r => ({
          slug: r.slug,
          method: r.method,
          authority: r.authority,
          active: r.active,
          cooldown_days: r.cooldownDays,
        })),
        "Directories"
      );
    } finally {
      await raw.end({ timeout: 5 });
    }
  });

program
  .command("auth")
  .description(
    "Open a browser to capture auth state for a form-submission directory"
  )
  .argument("<directorySlug>")
  .action(async (directorySlug: string) => {
    const { authDirectoryCommand } = await import(
      "./commands/auth-directory.js"
    );
    await authDirectoryCommand(directorySlug);
  });

const submit = program.command("submit").description("Directory submissions");

submit
  .command("queue")
  .description(
    "Queue submissions for a site (defaults to all active directories)"
  )
  .argument("<siteSlug>")
  .option("--directory <slug>", "restrict to one directory")
  .action(async (siteSlug: string, opts: { directory?: string }) => {
    const { queueSubmissionsCommand } = await import(
      "./commands/queue-submissions.js"
    );
    const result = await queueSubmissionsCommand({
      siteSlug,
      directorySlug: opts.directory,
    });
    logger.info(result, "Queue result");
  });

submit
  .command("status")
  .description("Pipeline counts + recent submissions")
  .option("--tier <n>", "restrict to directories in the given tier (1-5)")
  .action(async (opts: { tier?: string }) => {
    const { submissionStatusCommand } = await import(
      "./commands/queue-submissions.js"
    );
    const tier = opts.tier ? Number(opts.tier) : undefined;
    if (
      tier !== undefined &&
      (!Number.isInteger(tier) || tier < 1 || tier > 5)
    ) {
      throw new Error(`--tier must be an integer 1-5, got ${opts.tier}`);
    }
    await submissionStatusCommand({ tier });
  });

submit
  .command("retry")
  .description("Re-queue a failed submission by id")
  .argument("<submissionId>")
  .action(async (submissionId: string) => {
    const { retrySubmissionCommand } = await import(
      "./commands/queue-submissions.js"
    );
    await retrySubmissionCommand(submissionId);
  });

submit
  .command("complete")
  .description("Mark a manual (tier-1) submission as sent; record the live URL")
  .argument("<submissionId>")
  .option(
    "--live-url <url>",
    "URL the directory published (omit if the directory has no per-entry URL)"
  )
  .action(async (submissionId: string, opts: { liveUrl?: string }) => {
    const { completeSubmissionCommand } = await import(
      "./commands/complete-submission.js"
    );
    await completeSubmissionCommand({
      submissionId,
      liveUrl: opts.liveUrl ?? null,
    });
  });

const mesh = program.command("mesh").description("Cross-site topic mesh");

mesh
  .command("seed")
  .description("Load config/mesh/topic-clusters.json into spire_mesh_*")
  .action(async () => {
    const { seedMeshCommand } = await import("./commands/seed-mesh.js");
    await seedMeshCommand();
  });

mesh
  .command("report")
  .description("Which topics have coverage, which are orphans")
  .action(async () => {
    const { meshReportCommand } = await import("./commands/seed-mesh.js");
    await meshReportCommand();
  });

const rank = program.command("rank").description("Rank tracking (DataForSEO)");

rank
  .command("track")
  .description("Add a keyword to the rank-tracking queue")
  .argument("<keywordId>")
  .requiredOption(
    "--url <path>",
    "target URL (path like /gig-workers, or full https://)"
  )
  .option(
    "--location <code>",
    "DataForSEO location code (default 2840 for US)",
    "2840"
  )
  .option("--language <code>", "language code (default en)", "en")
  .action(
    async (
      keywordId: string,
      opts: { url: string; location: string; language: string }
    ) => {
      const { trackKeywordCommand } = await import("./commands/rank-report.js");
      await trackKeywordCommand({
        keywordId,
        targetUrl: opts.url,
        locationCode: Number(opts.location),
        languageCode: opts.language,
      });
    }
  );

rank
  .command("report")
  .description("Latest + prior rank per tracked keyword with delta")
  .option("--site <slug>", "restrict to a single site")
  .option("--since <days>", "look back N days for history (default 30)", "30")
  .action(async (opts: { site?: string; since: string }) => {
    const { rankReportCommand } = await import("./commands/rank-report.js");
    await rankReportCommand({
      siteSlug: opts.site,
      sinceDays: Number(opts.since),
    });
  });

rank
  .command("run-now")
  .description(
    "Print instructions for triggering an immediate rank-check cycle on the worker"
  )
  .action(async () => {
    const { rankRunNowStubCommand } = await import("./commands/rank-report.js");
    await rankRunNowStubCommand();
  });

// --- Batch 04 addendum: outreach + NAP validation ---

const outreach = program
  .command("outreach")
  .description("Outreach prospects (competitor gap, HARO, broken-link)");

outreach
  .command("import-gap")
  .description(
    "Import a Semrush backlink-gap CSV into spire_outreach_prospects"
  )
  .requiredOption("--site <slug>", "site slug (e.g. unifyone)")
  .requiredOption(
    "--competitor <domain>",
    "competitor domain the gap was pulled against"
  )
  .requiredOption("--csv <path>", "path to the Semrush CSV export")
  .option(
    "--no-dedupe",
    "insert every row even if (domain, backlink_url) already exists"
  )
  .action(
    async (opts: {
      site: string;
      competitor: string;
      csv: string;
      dedupe: boolean;
    }) => {
      const { importBacklinkGapCommand } = await import(
        "./commands/import-backlink-gap.js"
      );
      const result = await importBacklinkGapCommand({
        siteSlug: opts.site,
        competitor: opts.competitor,
        csvPath: opts.csv,
        dedupe: opts.dedupe,
      });
      logger.info(result, "Import result");
    }
  );

outreach
  .command("report")
  .description("Prospect breakdown by type × status")
  .option("--site <slug>", "restrict to a single site")
  .action(async (opts: { site?: string }) => {
    const { outreachReportCommand } = await import(
      "./commands/import-backlink-gap.js"
    );
    await outreachReportCommand({ siteSlug: opts.site });
  });

program
  .command("validate-nap")
  .description(
    "Load business-profile.json, verify NAP consistency, and check every active directory references known tokens"
  )
  .action(async () => {
    const { validateNapCommand } = await import("./commands/validate-nap.js");
    await validateNapCommand();
  });

// --- Batch 05: GSC + syndication + HARO ---

const gsc = program
  .command("gsc")
  .description("Search Console ingestion + analytics");

gsc
  .command("ingest")
  .description("Pull recent GSC data into spire_gsc_daily")
  .requiredOption("--site <slug>", "site slug (e.g. unifyone)")
  .option("--days <n>", "how many days to pull (default 3, max 90)", "3")
  .action(async (opts: { site: string; days: string }) => {
    const { gscIngestCommand } = await import("./commands/gsc-report.js");
    await gscIngestCommand({ siteSlug: opts.site, days: Number(opts.days) });
  });

gsc
  .command("report")
  .description("Run a GSC analytics report")
  .argument(
    "<kind>",
    "striking-distance | cannibals | rising | declining | summary"
  )
  .requiredOption("--site <slug>")
  .option("--weeks <n>", "lookback window in weeks", "2")
  .action(async (kind: string, opts: { site: string; weeks: string }) => {
    const { gscReportCommand } = await import("./commands/gsc-report.js");
    const validKinds = [
      "striking-distance",
      "cannibals",
      "rising",
      "declining",
      "summary",
    ] as const;
    if (!(validKinds as readonly string[]).includes(kind)) {
      throw new Error(
        `Unknown report kind: ${kind}. Valid: ${validKinds.join(", ")}`
      );
    }
    await gscReportCommand({
      kind: kind as (typeof validKinds)[number],
      siteSlug: opts.site,
      weeks: Number(opts.weeks),
    });
  });

const syndicate = program
  .command("syndicate")
  .description("Republish to external platforms with canonical-tag discipline");

syndicate
  .command("platforms")
  .description("Manage syndication platforms")
  .command("seed")
  .description(
    "Load config/syndication/platforms.json into spire_syndication_platforms"
  )
  .action(async () => {
    const { syndicatePlatformsSeedCommand } = await import(
      "./commands/syndicate.js"
    );
    await syndicatePlatformsSeedCommand();
  });

syndicate
  .command("candidates")
  .description("Select eligible content_plan rows and queue spire_syndications")
  .option("--site <slug>", "restrict to one site")
  .action(async (opts: { site?: string }) => {
    const { syndicateCandidatesCommand } = await import(
      "./commands/syndicate.js"
    );
    await syndicateCandidatesCommand({ siteSlug: opts.site });
  });

syndicate
  .command("queue")
  .description("Force-queue a single content plan to a single platform")
  .argument("<contentPlanId>")
  .requiredOption(
    "--platform <slug>",
    "platform slug (devto, hashnode, medium, linkedin, substack)"
  )
  .action(async (contentPlanId: string, opts: { platform: string }) => {
    const { syndicateQueueCommand } = await import("./commands/syndicate.js");
    await syndicateQueueCommand({ contentPlanId, platformSlug: opts.platform });
  });

syndicate
  .command("run")
  .description("Force-run a single queued syndication (API-method only)")
  .argument("<syndicationId>")
  .action(async (syndicationId: string) => {
    const { syndicateRunCommand } = await import("./commands/syndicate.js");
    await syndicateRunCommand({ syndicationId });
  });

syndicate
  .command("status")
  .description("Recent syndication activity")
  .option("--site <slug>", "restrict to one site")
  .action(async (opts: { site?: string }) => {
    const { syndicateStatusCommand } = await import("./commands/syndicate.js");
    await syndicateStatusCommand({ siteSlug: opts.site });
  });

const haro = program.command("haro").description("HARO / PR opportunity queue");

haro
  .command("queue")
  .description("Show new high-score opportunities awaiting review")
  .option("--site <slug>")
  .option("--min-score <n>", "minimum match_score (default 70)", "70")
  .action(async (opts: { site?: string; "min-score": string }) => {
    const { haroQueueCommand } = await import("./commands/haro-queue.js");
    await haroQueueCommand({
      siteSlug: opts.site,
      minScore: Number(opts["min-score"]),
    });
  });

haro
  .command("view")
  .description("Print the full query + drafted response variations")
  .argument("<opportunityId>")
  .action(async (opportunityId: string) => {
    const { haroViewCommand } = await import("./commands/haro-queue.js");
    await haroViewCommand(opportunityId);
  });

haro
  .command("mark")
  .description(
    "Update an opportunity's status (record send / win / lose / ignore)"
  )
  .argument("<opportunityId>")
  .requiredOption(
    "--status <status>",
    "qualified | ignored | drafted | sent | won | lost | expired"
  )
  .option("--outcome-url <url>", "live URL of the won placement")
  .option("--outcome-dr <n>", "outlet DR for the won placement")
  .option("--used-draft <n>", "0-indexed draft variation that was sent")
  .action(
    async (
      opportunityId: string,
      opts: {
        status: string;
        outcomeUrl?: string;
        outcomeDr?: string;
        usedDraft?: string;
      }
    ) => {
      const { haroMarkCommand } = await import("./commands/haro-queue.js");
      const valid = [
        "qualified",
        "ignored",
        "drafted",
        "sent",
        "won",
        "lost",
        "expired",
      ] as const;
      if (!(valid as readonly string[]).includes(opts.status)) {
        throw new Error(
          `Unknown status: ${opts.status}. Valid: ${valid.join(", ")}`
        );
      }
      await haroMarkCommand({
        opportunityId,
        status: opts.status as (typeof valid)[number],
        outcomeUrl: opts.outcomeUrl,
        outcomeDr: opts.outcomeDr ? Number(opts.outcomeDr) : undefined,
        usedDraftIndex: opts.usedDraft ? Number(opts.usedDraft) : undefined,
      });
    }
  );

program.parseAsync(process.argv).catch(err => {
  logger.fatal(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
