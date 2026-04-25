import type { ContentPlan, Site } from "../../schema.js";
import {
  canonicalUrlFor,
  stripFrontmatter,
  type SyndicationResult,
} from "../types.js";

// Dev.to syndication adapter. Posts the article to dev.to/api/articles
// with canonical_url pointing back to the UnifyOne original. Dev.to
// honors canonical_url and renders a "Originally posted at <link>" line
// at the top of the syndicated copy — exactly what we want for SEO
// attribution.

const DEV_TO_API = "https://dev.to/api/articles";

// Dev.to allows max 4 tags, lowercase, alphanumeric only. Our brief tags
// can include hyphens / cluster names — normalize hard so the API doesn't 422.
function normalizeDevtoTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 30);
}

export async function publishToDevTo(
  plan: ContentPlan,
  site: Site
): Promise<SyndicationResult> {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      retryable: false,
      error: "DEVTO_API_KEY not set on the worker",
    };
  }

  if (!plan.contentMd) {
    return {
      ok: false,
      retryable: false,
      error: "Content plan has no content_md to syndicate",
    };
  }

  const brief = (plan.brief ?? {}) as {
    title?: string;
    metaDescription?: string;
  };
  const title = brief.title ?? plan.title ?? plan.targetKeyword;
  const description = brief.metaDescription ?? "";
  const canonical = canonicalUrlFor(site, plan.slug);
  const body = stripFrontmatter(plan.contentMd);

  // Pull tags from the brief's clusters via spire_keywords if present;
  // fall back to a normalized version of the target keyword's tokens.
  const candidateTags = [
    plan.targetKeyword.split(/\s+/).filter(t => t.length > 2),
    [plan.targetKeyword],
  ]
    .flat()
    .map(normalizeDevtoTag)
    .filter(t => t.length >= 3);
  const tags = Array.from(new Set(candidateTags)).slice(0, 4);

  let res: Response;
  try {
    res = await fetch(DEV_TO_API, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        article: {
          title,
          body_markdown: body,
          published: true,
          canonical_url: canonical,
          tags,
          description: description.slice(0, 200),
        },
      }),
    });
  } catch (err) {
    return {
      ok: false,
      retryable: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      // 4xx is mostly schema/auth (bad key, duplicate canonical) — non-retryable.
      retryable: res.status >= 500 || res.status === 429,
      error: `dev.to HTTP ${res.status}: ${text.slice(0, 500)}`,
    };
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    ok: true,
    externalUrl: typeof data.url === "string" ? data.url : undefined,
    externalId: data.id !== undefined ? String(data.id) : undefined,
    response: data,
  };
}
