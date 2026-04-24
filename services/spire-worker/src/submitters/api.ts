import type { ApiMethodConfig, SubmissionPayload } from "@1commerce/spire";
import { logger } from "../lib/logger.js";

// HTTP submitter. Dispatches on method_config.endpoint — each directory
// needs a different request body and auth pattern, so this is a switch
// statement, not a generic engine.
//
// For the MVP, only a handful of endpoints are wired up. Any unhandled
// endpoint name returns a `retryable: false` failure so the operator knows
// to hand-roll that directory.

export type ApiSubmitResult = {
  success: boolean;
  liveUrl?: string;
  response?: Record<string, unknown>;
  error?: string;
  /** false = don't retry (schema mismatch, bad auth). true = retryable (5xx, network). */
  retryable?: boolean;
};

export async function submitViaApi(input: {
  config: ApiMethodConfig;
  payload: SubmissionPayload;
}): Promise<ApiSubmitResult> {
  const { config, payload } = input;

  switch (config.endpoint) {
    case "devto":
      return submitDevTo(payload, config);
    case "hashnode":
      return submitHashnode(payload, config);
    case "bing_places":
      return unsupported(
        "bing_places — Bing Places API requires verified business ownership; implement after manual verification"
      );
    case "google_business_profile":
      return unsupported(
        "google_business_profile — Google My Business API requires OAuth and verified business; implement after manual setup"
      );
    case "generic_rest":
      return submitGenericRest(payload, config);
    default: {
      // exhaustive check
      const _exhaustive: never = config.endpoint;
      void _exhaustive;
      return unsupported(
        `unknown endpoint: ${String((config as { endpoint: string }).endpoint)}`
      );
    }
  }
}

// --- Dev.to — creates a draft article via /api/articles.
// https://developers.forem.com/api
async function submitDevTo(
  payload: SubmissionPayload,
  _config: ApiMethodConfig
): Promise<ApiSubmitResult> {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey)
    return { success: false, error: "DEVTO_API_KEY not set", retryable: false };

  const body = {
    article: {
      title: payload.tagline,
      body_markdown: payload.description,
      published: false, // draft-only from Spire; the operator reviews before publishing
      tags: payload.tags.slice(0, 4),
      canonical_url: payload.url,
    },
  };

  try {
    const res = await fetch("https://dev.to/api/articles", {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!res.ok) {
      return {
        success: false,
        error: `dev.to HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`,
        retryable: res.status >= 500 || res.status === 429,
        response: json,
      };
    }
    return {
      success: true,
      liveUrl: typeof json.url === "string" ? json.url : undefined,
      response: json,
    };
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "dev.to request failed"
    );
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      retryable: true,
    };
  }
}

// --- Hashnode — GraphQL mutation for publishing a draft.
async function submitHashnode(
  payload: SubmissionPayload,
  _config: ApiMethodConfig
): Promise<ApiSubmitResult> {
  const token = process.env.HASHNODE_TOKEN;
  const publicationId = process.env.HASHNODE_PUBLICATION_ID;
  if (!token)
    return {
      success: false,
      error: "HASHNODE_TOKEN not set",
      retryable: false,
    };
  if (!publicationId)
    return {
      success: false,
      error: "HASHNODE_PUBLICATION_ID not set",
      retryable: false,
    };

  const mutation = `
    mutation PublishPost($input: PublishPostInput!) {
      publishPost(input: $input) { post { id url } }
    }
  `;
  const variables = {
    input: {
      title: payload.tagline,
      contentMarkdown: payload.description,
      publicationId,
      tags: payload.tags.slice(0, 5).map(name => ({ name })),
      originalArticleURL: payload.url,
    },
  };

  try {
    const res = await fetch("https://gql.hashnode.com", {
      method: "POST",
      headers: { authorization: token, "content-type": "application/json" },
      body: JSON.stringify({ query: mutation, variables }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (
      !res.ok ||
      ("errors" in json && Array.isArray(json.errors) && json.errors.length > 0)
    ) {
      return {
        success: false,
        error: `hashnode HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`,
        retryable: res.status >= 500,
        response: json,
      };
    }
    const post = (
      json as { data?: { publishPost?: { post?: { url?: string } } } }
    ).data?.publishPost?.post;
    return { success: true, liveUrl: post?.url, response: json };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      retryable: true,
    };
  }
}

// --- Generic REST — config.url + optional mapping. Useful for small
// directories with simple "POST this JSON" endpoints.
async function submitGenericRest(
  payload: SubmissionPayload,
  config: ApiMethodConfig
): Promise<ApiSubmitResult> {
  if (!config.url)
    return {
      success: false,
      error: "generic_rest requires method_config.url",
      retryable: false,
    };

  // Apply the field mapping (payload key → directory field name).
  const mapping = config.mapping ?? {};
  const body: Record<string, unknown> = {};
  for (const [from, to] of Object.entries(mapping)) {
    const value = (payload as unknown as Record<string, unknown>)[from];
    if (value !== undefined) body[to] = value;
  }
  // Also drop the raw payload under `_raw` so the receiver can fall back.
  body._raw = payload;

  try {
    const res = await fetch(config.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: Record<string, unknown> | undefined;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // non-JSON response; capture as string
    }
    if (!res.ok) {
      return {
        success: false,
        error: `generic_rest HTTP ${res.status}: ${text.slice(0, 300)}`,
        retryable: res.status >= 500 || res.status === 429,
        response: json ?? { raw: text.slice(0, 1000) },
      };
    }
    return { success: true, response: json ?? { raw: text.slice(0, 1000) } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      retryable: true,
    };
  }
}

function unsupported(reason: string): ApiSubmitResult {
  return { success: false, error: reason, retryable: false };
}
