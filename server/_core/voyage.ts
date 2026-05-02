/**
 * Voyage AI embeddings client for UnifyOne.
 *
 * Provides production-grade semantic embeddings via the Voyage AI REST API
 * (https://docs.voyageai.com/reference/embeddings-api). Voyage is Anthropic's
 * recommended embeddings provider and is used to power the document chatbot
 * (server/routers/documentChat.ts) and the intelligence-doc seed script
 * (scripts/seed-intelligence.ts).
 *
 * Features:
 *  - Single batched call helper `voyageEmbed(texts, { mode })`.
 *  - Splits into <=128-input batches automatically (Voyage hard limit).
 *  - Coarse token guard (~120K tokens / batch ceiling).
 *  - Retries with exponential backoff on 429 / 5xx (3 tries, 250ms / 750ms / 2250ms).
 *  - Graceful fallback to a deterministic hash-based embedding when
 *    `VOYAGE_API_KEY` is unset OR every retry fails. This keeps local dev,
 *    CI, and the existing test suite unblocked while still using the real
 *    API in production.
 *  - In-memory LRU cache (256 entries) keyed by `(model, mode, text)` to
 *    suppress redundant calls when the same chunk is embedded twice in a
 *    short window.
 *  - Structured logs via the project's logger.
 *
 * The exported `EMBEDDING_DIM` constant matches the dimensionality stored in
 * the `documentEmbeddings.embedding` JSON column. Real Voyage vectors are
 * resized (truncated or zero-padded) to that length so the embedding column
 * shape stays stable regardless of the upstream model's native dimension.
 *
 * Env vars:
 *   VOYAGE_API_KEY       - required for live API calls. If unset, the helper
 *                          falls back to deterministic hash embeddings.
 *   VOYAGE_MODEL         - optional model override. Defaults to
 *                          "voyage-3-large".
 *   VOYAGE_EMBEDDING_DIM - optional output dimensionality override. Defaults
 *                          to 1536 to match the existing
 *                          documentEmbeddings.embedding column.
 */

import { logger } from "./logger";

// -- Constants ---------------------------------------------------------------

/**
 * Output dimensionality of every embedding returned by this module - both
 * real Voyage vectors (resized to this length) and the fallback hash vector.
 */
export const EMBEDDING_DIM: number = (() => {
  const raw = process.env.VOYAGE_EMBEDDING_DIM;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1536;
})();

const DEFAULT_MODEL = process.env.VOYAGE_MODEL || "voyage-3-large";
const VOYAGE_ENDPOINT = "https://api.voyageai.com/v1/embeddings";

/** Voyage hard limits (https://docs.voyageai.com/docs/rate-limits). */
const MAX_INPUTS_PER_BATCH = 128;
/** Coarse token ceiling per batch - Voyage allows ~120K total tokens. */
const MAX_TOKENS_PER_BATCH = 120_000;

const RETRY_DELAYS_MS = [250, 750, 2250];

// -- Types -------------------------------------------------------------------

export type VoyageMode = "query" | "document";

export interface VoyageEmbedOptions {
  /** Whether to embed for retrieval queries or stored documents. */
  mode?: VoyageMode;
  /** Override the default model. */
  model?: string;
  /** Override the timeout per HTTP attempt (ms). */
  timeoutMs?: number;
  /**
   * Inject a fetch implementation - primarily for tests. Falls back to the
   * global fetch.
   */
  fetchImpl?: typeof fetch;
}

interface VoyageApiResponse {
  object: "list";
  data: Array<{ object: "embedding"; embedding: number[]; index: number }>;
  model: string;
  usage?: { total_tokens?: number };
}

// -- LRU cache ---------------------------------------------------------------

const CACHE_CAPACITY = 256;
// Map preserves insertion order, which we exploit for LRU.
const lruCache = new Map<string, number[]>();

function cacheGet(key: string): number[] | undefined {
  const hit = lruCache.get(key);
  if (!hit) return undefined;
  // Touch (move to "newest")
  lruCache.delete(key);
  lruCache.set(key, hit);
  return hit;
}

function cacheSet(key: string, value: number[]): void {
  if (lruCache.has(key)) lruCache.delete(key);
  lruCache.set(key, value);
  while (lruCache.size > CACHE_CAPACITY) {
    const oldest = lruCache.keys().next().value;
    if (oldest === undefined) break;
    lruCache.delete(oldest);
  }
}

/** Test/utility hook to clear the LRU. */
export function _clearVoyageCache(): void {
  lruCache.clear();
}

// -- Public API --------------------------------------------------------------

/**
 * Compute embeddings for a list of texts.
 *
 * Returns a `number[][]` of length `texts.length`, with each inner vector
 * having length `EMBEDDING_DIM`. Always resolves - never throws - because it
 * falls back to the deterministic hash embedding on any failure path.
 */
export async function voyageEmbed(
  texts: string[],
  opts: VoyageEmbedOptions = {}
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const mode: VoyageMode = opts.mode ?? "document";
  const model = opts.model ?? DEFAULT_MODEL;
  const apiKey = process.env.VOYAGE_API_KEY;

  // Apply LRU cache up front. We assemble the final result by index so that
  // cache hits and misses interleave correctly.
  const result: (number[] | undefined)[] = new Array(texts.length).fill(
    undefined
  );
  const missingIndices: number[] = [];
  const missingTexts: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    const key = `${model}::${mode}::${texts[i]}`;
    const hit = cacheGet(key);
    if (hit) {
      result[i] = hit;
    } else {
      missingIndices.push(i);
      missingTexts.push(texts[i]);
    }
  }

  if (missingTexts.length === 0) {
    return result as number[][];
  }

  let liveVectors: number[][] | null = null;
  if (apiKey) {
    try {
      liveVectors = await voyageEmbedLive(missingTexts, {
        mode,
        model,
        apiKey,
        timeoutMs: opts.timeoutMs ?? 20_000,
        fetchImpl: opts.fetchImpl ?? fetch,
      });
    } catch (err) {
      logger.warn("[Voyage] live embed failed; falling back to hash", {
        error: err instanceof Error ? err.message : String(err),
        n: missingTexts.length,
        mode,
        model,
      });
      liveVectors = null;
    }
  }

  for (let i = 0; i < missingIndices.length; i++) {
    const idx = missingIndices[i];
    const text = missingTexts[i];
    const vec = liveVectors
      ? resizeVector(liveVectors[i], EMBEDDING_DIM)
      : deterministicEmbedding(text, EMBEDDING_DIM);
    const key = `${model}::${mode}::${text}`;
    cacheSet(key, vec);
    result[idx] = vec;
  }

  return result as number[][];
}

/** Convenience wrapper for a single input. */
export async function voyageEmbedOne(
  text: string,
  opts: VoyageEmbedOptions = {}
): Promise<number[]> {
  const [vec] = await voyageEmbed([text], opts);
  return vec;
}

// -- Internals ---------------------------------------------------------------

interface LiveEmbedArgs {
  mode: VoyageMode;
  model: string;
  apiKey: string;
  timeoutMs: number;
  fetchImpl: typeof fetch;
}

async function voyageEmbedLive(
  texts: string[],
  args: LiveEmbedArgs
): Promise<number[][]> {
  const batches = splitIntoBatches(texts);
  const out: number[][] = new Array(texts.length);
  let cursor = 0;
  for (const batch of batches) {
    const start = Date.now();
    const { embeddings, usage } = await callVoyageWithRetries(batch, args);
    const latency = Date.now() - start;
    const tokenEstimate =
      usage?.total_tokens ?? Math.round(batch.join(" ").length / 4);
    logger.info("[Voyage] embed", {
      mode: args.mode,
      model: args.model,
      n: batch.length,
      tokens: tokenEstimate,
      latencyMs: latency,
    });
    for (let i = 0; i < embeddings.length; i++) {
      out[cursor + i] = embeddings[i];
    }
    cursor += batch.length;
  }
  return out;
}

/**
 * Split inputs into batches that respect both Voyage's 128-input cap and the
 * coarse 120K-token budget (estimated as 4 chars/token).
 */
function splitIntoBatches(texts: string[]): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let currentTokens = 0;
  for (const t of texts) {
    const est = Math.ceil(t.length / 4);
    const wouldOverflow =
      current.length + 1 > MAX_INPUTS_PER_BATCH ||
      currentTokens + est > MAX_TOKENS_PER_BATCH;
    if (wouldOverflow && current.length > 0) {
      batches.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(t);
    currentTokens += est;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

async function callVoyageWithRetries(
  batch: string[],
  args: LiveEmbedArgs
): Promise<{ embeddings: number[][]; usage?: VoyageApiResponse["usage"] }> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await singleVoyageRequest(batch, args);
      return res;
    } catch (err) {
      lastErr = err;
      const retriable = isRetriableError(err);
      if (!retriable || attempt === RETRY_DELAYS_MS.length) {
        throw err;
      }
      const delay = RETRY_DELAYS_MS[attempt];
      logger.warn("[Voyage] retry", {
        attempt: attempt + 1,
        delayMs: delay,
        error: err instanceof Error ? err.message : String(err),
      });
      await sleep(delay);
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Voyage exhausted retries");
}

class VoyageHttpError extends Error {
  status: number;
  retriable: boolean;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.retriable = status === 429 || (status >= 500 && status < 600);
  }
}

async function singleVoyageRequest(
  batch: string[],
  args: LiveEmbedArgs
): Promise<{ embeddings: number[][]; usage?: VoyageApiResponse["usage"] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const res = await args.fetchImpl(VOYAGE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: batch,
        model: args.model,
        input_type: args.mode, // "query" | "document"
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await safeReadText(res);
      throw new VoyageHttpError(
        res.status,
        `Voyage API ${res.status}: ${body.slice(0, 200)}`
      );
    }
    const json = (await res.json()) as VoyageApiResponse;
    if (!json.data || json.data.length !== batch.length) {
      throw new Error(
        `Voyage returned ${json.data?.length ?? 0} embeddings for ${batch.length} inputs`
      );
    }
    // Sort by index to be safe (Voyage returns ordered, but defensive coding).
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    return {
      embeddings: sorted.map(d => d.embedding),
      usage: json.usage,
    };
  } finally {
    clearTimeout(timer);
  }
}

function isRetriableError(err: unknown): boolean {
  if (err instanceof VoyageHttpError) return err.retriable;
  if (err instanceof Error) {
    // AbortError (timeout) and generic network errors are retriable.
    if (err.name === "AbortError") return true;
    if (/network|fetch failed|ECONNRESET|ETIMEDOUT/i.test(err.message))
      return true;
  }
  return false;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Pad / truncate a vector to the target length without changing the
 * direction of the leading components. We use zeros for padding so cosine
 * similarity over the padded portion contributes nothing.
 */
function resizeVector(vec: number[], target: number): number[] {
  if (vec.length === target) return vec;
  if (vec.length > target) return vec.slice(0, target);
  const out = vec.slice();
  while (out.length < target) out.push(0);
  return out;
}

/**
 * Deterministic fallback embedding - same algorithm as the legacy hash
 * embed used previously in documentChat / seed-intelligence. Identical
 * inputs produce identical vectors so that fallback queries can still
 * round-trip in tests and dev.
 *
 * NOT semantic - only used when VOYAGE_API_KEY is unset or every retry
 * fails. Production must always have VOYAGE_API_KEY set.
 */
export function deterministicEmbedding(text: string, dim: number): number[] {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  const out: number[] = new Array(dim);
  let seed = Math.abs(hash) || 1;
  for (let i = 0; i < dim; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    out[i] = (seed / 233280) * 2 - 1;
  }
  return out;
}
