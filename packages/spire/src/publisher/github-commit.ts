import { Octokit } from "@octokit/rest";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { buildFrontmatter, withFrontmatter } from "./frontmatter.js";
import type { Brief } from "../generator/build-brief.js";

type DB = PostgresJsDatabase<typeof schema>;

const COMMITTER = {
  name: "spire-bot",
  email: "spire@1commerce.online",
} as const;

const MAX_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 1000;

export type PublishResult = {
  commitSha: string;
  path: string;
  url: string;
};

export async function publishArticle(input: {
  db: DB;
  octokit: Octokit;
  owner: string;
  repo: string;
  branch: string;
  contentPlanId: string;
}): Promise<PublishResult> {
  const { db, octokit, owner, repo, branch, contentPlanId } = input;

  const [plan] = await db
    .select()
    .from(schema.contentPlan)
    .where(eq(schema.contentPlan.id, contentPlanId))
    .limit(1);
  if (!plan) throw new Error(`Content plan not found: ${contentPlanId}`);
  if (!plan.contentMd)
    throw new Error(
      `Content plan ${contentPlanId} has no content_md; run writeArticle first`
    );
  if (!plan.brief)
    throw new Error(`Content plan ${contentPlanId} has no brief`);

  const [site] = await db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.id, plan.siteId))
    .limit(1);
  if (!site) throw new Error(`Site not found: ${plan.siteId}`);

  const brief = plan.brief as Brief;

  const frontmatter = buildFrontmatter({
    title: brief.title,
    description: brief.metaDescription,
    publishedAt: new Date(),
    tags: deriveTags(plan.targetKeyword, site.targetAudiences),
    spirePlanId: plan.id,
    qualityScore: plan.qualityScore ?? 0,
  });

  const fileContent = withFrontmatter(frontmatter, plan.contentMd);
  const path = `${site.contentPath.replace(/\/$/, "")}/${plan.slug}.md`;
  const message = `content(spire): publish ${plan.slug}`;

  logger.info(
    { contentPlanId, owner, repo, branch, path },
    "Publishing to GitHub"
  );

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      // Check if file already exists — getContent returns 404 if absent.
      // We need the existing sha to update (GitHub's createOrUpdateFileContents
      // treats sha-less calls as "create", which 422s on conflict).
      let existingSha: string | undefined;
      try {
        const existing = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref: branch,
        });
        if (!Array.isArray(existing.data) && "sha" in existing.data) {
          existingSha = existing.data.sha;
        }
      } catch (err) {
        if (!isNotFound(err)) throw err;
      }

      const commit = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        branch,
        message,
        content: Buffer.from(fileContent, "utf8").toString("base64"),
        committer: COMMITTER,
        author: COMMITTER,
        ...(existingSha ? { sha: existingSha } : {}),
      });

      const commitSha = commit.data.commit.sha ?? "";
      const htmlUrl = commit.data.content?.html_url ?? "";

      await db
        .update(schema.contentPlan)
        .set({
          status: "published",
          commitSha,
          publishedAt: new Date(),
          error: null,
        })
        .where(eq(schema.contentPlan.id, plan.id));

      // Mark source keyword as published if present.
      if (plan.keywordId) {
        await db
          .update(schema.keywords)
          .set({ status: "published" })
          .where(eq(schema.keywords.id, plan.keywordId));
      }

      logger.info({ contentPlanId, commitSha, path }, "Published");
      return { commitSha, path, url: htmlUrl };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const status = extractStatus(err);
      const retryable =
        status === undefined ||
        status >= 500 ||
        status === 429 ||
        status === 409;
      logger.warn(
        { attempt, status, retryable, err: lastError.message },
        "GitHub publish attempt failed"
      );
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await sleep(INITIAL_BACKOFF_MS * 2 ** (attempt - 1));
    }
  }

  // All attempts exhausted — mark failed and rethrow.
  const message2 = lastError ? lastError.message : "unknown GitHub error";
  await db
    .update(schema.contentPlan)
    .set({ status: "failed", error: `publish: ${message2.slice(0, 1900)}` })
    .where(eq(schema.contentPlan.id, plan.id));
  throw lastError ?? new Error("GitHub publish failed with no captured error");
}

function deriveTags(targetKeyword: string, audiences: string[]): string[] {
  // Heuristic: the cluster / audience tags a human would add. Keep to 2–4.
  const tags = new Set<string>();
  const kw = targetKeyword.toLowerCase();
  for (const audience of audiences) {
    if (
      kw.includes(audience.toLowerCase().replace("-", " ")) ||
      kw.includes(audience.toLowerCase())
    ) {
      tags.add(audience);
    }
  }
  // Always include at least one topical tag — pick the first significant word.
  const firstToken = kw.split(/\s+/).find(t => t.length > 3) ?? "content";
  tags.add(firstToken);
  return Array.from(tags).slice(0, 4);
}

function isNotFound(err: unknown): boolean {
  return extractStatus(err) === 404;
}

function extractStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
