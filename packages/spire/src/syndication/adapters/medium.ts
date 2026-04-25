import type { ContentPlan, Site } from "../../schema.js";
import {
  canonicalUrlFor,
  stripFrontmatter,
  type SyndicationResult,
} from "../types.js";

// Medium API v1 adapter. The integration-tokens API is officially
// "deprecated but functional" — works for now; if Medium ever fully
// removes it, this adapter falls back to manual cross-post and we
// disable the platform in spire_syndication_platforms.

const MEDIUM_API = "https://api.medium.com/v1";

// Medium's renderer chokes on a few code-fence languages our briefs
// occasionally produce. Normalize to its supported set.
const FENCE_REWRITES: Record<string, string> = {
  tsx: "ts",
  jsx: "js",
  mdx: "md",
  zsh: "bash",
  shell: "bash",
  console: "bash",
};

function rewriteCodeFences(md: string): string {
  return md.replace(/^```([a-z0-9_-]+)/gim, (m, lang: string) => {
    const replacement = FENCE_REWRITES[lang.toLowerCase()];
    return replacement ? "```" + replacement : m;
  });
}

export async function publishToMedium(
  plan: ContentPlan,
  site: Site
): Promise<SyndicationResult> {
  const token = process.env.MEDIUM_INTEGRATION_TOKEN;
  const userId = process.env.MEDIUM_USER_ID;
  if (!token)
    return {
      ok: false,
      retryable: false,
      error: "MEDIUM_INTEGRATION_TOKEN not set",
    };
  if (!userId)
    return { ok: false, retryable: false, error: "MEDIUM_USER_ID not set" };
  if (!plan.contentMd)
    return {
      ok: false,
      retryable: false,
      error: "Content plan has no content_md",
    };

  const brief = (plan.brief ?? {}) as { title?: string };
  const title = brief.title ?? plan.title ?? plan.targetKeyword;
  const canonical = canonicalUrlFor(site, plan.slug);
  const body = rewriteCodeFences(stripFrontmatter(plan.contentMd));

  const candidateTags = plan.targetKeyword
    .toLowerCase()
    .split(/\s+/)
    .map(t => t.replace(/[^a-z0-9]/g, ""))
    .filter(t => t.length >= 3);
  const tags = Array.from(new Set(candidateTags)).slice(0, 5);

  let res: Response;
  try {
    res = await fetch(
      `${MEDIUM_API}/users/${encodeURIComponent(userId)}/posts`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          title,
          contentFormat: "markdown",
          content: body,
          canonicalUrl: canonical,
          tags,
          publishStatus: "public",
        }),
      }
    );
  } catch (err) {
    return {
      ok: false,
      retryable: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      retryable: res.status >= 500 || res.status === 429,
      error: `medium HTTP ${res.status}: ${JSON.stringify(json).slice(0, 500)}`,
      response: json,
    };
  }
  const data = (json as { data?: { id?: string; url?: string } }).data;
  return {
    ok: true,
    externalUrl: data?.url,
    externalId: data?.id,
    response: json,
  };
}
