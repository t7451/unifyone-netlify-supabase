// Storage helpers for UnifyOne — backed by Netlify Blobs.
//
// All callers (imageGeneration.ts, clipperWorker.ts, etc.) use the same
// {key, url} contract. Public reads are served by
// netlify/functions/blobs-serve.mts at /blobs/<key>; image transforms
// go through the Netlify Image CDN.

import { getStore, type Store } from "@netlify/blobs";

const DEFAULT_STORE = process.env.NETLIFY_BLOBS_STORE ?? "uploads";

function blobStore(): Store {
  // siteID/token are auto-injected when running in a Netlify function;
  // for local dev the @netlify/blobs SDK uses a sandboxed local store.
  const siteID = process.env.NETLIFY_SITE_ID ?? process.env.SITE_ID;
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ?? process.env.NETLIFY_AUTH_TOKEN;
  if (siteID && token) {
    return getStore({ name: DEFAULT_STORE, siteID, token });
  }
  return getStore(DEFAULT_STORE);
}

function publicBlobUrl(key: string): string {
  return `/blobs/${encodeURI(key)}`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const value =
    typeof data === "string"
      ? data
      : new Blob([data as unknown as ArrayBuffer], { type: contentType });
  await blobStore().set(key, value as Blob | string, {
    metadata: { contentType },
  });
  return { key, url: publicBlobUrl(key) };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: publicBlobUrl(key) };
}

/**
 * Returns the raw bytes of a stored object — used by the /blobs/* serving
 * function.
 */
export async function storageGetStream(
  relKey: string
): Promise<{ body: ReadableStream | null; contentType: string } | null> {
  const key = normalizeKey(relKey);
  const result = await blobStore().getWithMetadata(key, { type: "stream" });
  if (!result) return null;
  const contentType =
    (result.metadata?.contentType as string | undefined) ??
    "application/octet-stream";
  return { body: result.data as ReadableStream | null, contentType };
}
