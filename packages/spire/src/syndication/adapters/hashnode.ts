import type { ContentPlan, Site } from "../../schema.js";
import {
  canonicalUrlFor,
  stripFrontmatter,
  type SyndicationResult,
} from "../types.js";

// Hashnode v2 GraphQL adapter. Mutation: publishPost. Sets
// originalArticleURL to the UnifyOne canonical — Hashnode renders that
// as the noindex/canonical signal automatically.

const HASHNODE_GQL = "https://gql.hashnode.com";

const PUBLISH_MUTATION = `
  mutation PublishPost($input: PublishPostInput!) {
    publishPost(input: $input) {
      post { id slug url }
    }
  }
`;

export async function publishToHashnode(
  plan: ContentPlan,
  site: Site
): Promise<SyndicationResult> {
  const token = process.env.HASHNODE_PAT;
  const publicationId = process.env.HASHNODE_PUBLICATION_ID;
  if (!token)
    return {
      ok: false,
      retryable: false,
      error: "HASHNODE_PAT not set on the worker",
    };
  if (!publicationId)
    return {
      ok: false,
      retryable: false,
      error: "HASHNODE_PUBLICATION_ID not set",
    };
  if (!plan.contentMd)
    return {
      ok: false,
      retryable: false,
      error: "Content plan has no content_md",
    };

  const brief = (plan.brief ?? {}) as { title?: string };
  const title = brief.title ?? plan.title ?? plan.targetKeyword;
  const canonical = canonicalUrlFor(site, plan.slug);
  const body = stripFrontmatter(plan.contentMd);

  const variables = {
    input: {
      title,
      contentMarkdown: body,
      publicationId,
      // originalArticleURL is the canonical signal — Hashnode noindexes the
      // copy and surfaces a "Originally published at" link.
      originalArticleURL: canonical,
      tags: deriveHashnodeTags(plan).map(slug => ({ slug, name: slug })),
    },
  };

  let res: Response;
  try {
    res = await fetch(HASHNODE_GQL, {
      method: "POST",
      headers: {
        authorization: token,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ query: PUBLISH_MUTATION, variables }),
    });
  } catch (err) {
    return {
      ok: false,
      retryable: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || (Array.isArray(json.errors) && json.errors.length > 0)) {
    return {
      ok: false,
      retryable: res.status >= 500,
      error: `hashnode HTTP ${res.status}: ${JSON.stringify(json).slice(0, 500)}`,
      response: json,
    };
  }

  const post = (
    json as {
      data?: { publishPost?: { post?: { id?: string; url?: string } } };
    }
  ).data?.publishPost?.post;
  return {
    ok: true,
    externalUrl: post?.url,
    externalId: post?.id,
    response: json,
  };
}

function deriveHashnodeTags(plan: ContentPlan): string[] {
  const tokens = plan.targetKeyword
    .toLowerCase()
    .split(/\s+/)
    .map(t => t.replace(/[^a-z0-9-]/g, ""))
    .filter(t => t.length >= 3);
  return Array.from(new Set(tokens)).slice(0, 5);
}
