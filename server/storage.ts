// Storage helpers for UnifyOne.
//
// Supports three backends, selected via STORAGE_BACKEND env var:
//   - "blobs"  → Netlify Blobs (default when running on Netlify)
//   - "forge"  → Biz-provided storage proxy (legacy default)
//   - "auto"   → Blobs when NETLIFY=true, else forge (default)
//
// All backends expose the same {key, url} contract so callers
// (imageGeneration.ts, clipperWorker.ts, etc.) don't need to change.

import { getStore, type Store } from "@netlify/blobs";
import { ENV } from "./_core/env";

type StorageConfig = { baseUrl: string; apiKey: string };

type Backend = "blobs" | "forge";

function selectBackend(): Backend {
  const explicit = (process.env.STORAGE_BACKEND ?? "auto").toLowerCase();
  if (explicit === "blobs" || explicit === "forge") return explicit;
  // auto: prefer Blobs when running under Netlify
  if (process.env.NETLIFY === "true" || process.env.NETLIFY_BLOBS_CONTEXT) {
    return "blobs";
  }
  // fall back to forge if its credentials are present, else still try blobs
  if (ENV.forgeApiUrl && ENV.forgeApiKey) return "forge";
  return "blobs";
}

// ---------- Netlify Blobs backend ----------

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
  // Served via a Netlify function (see netlify/functions/blobs-serve.mts).
  // Image CDN can transform via /.netlify/images?url=/blobs/<key>&w=...
  return `/blobs/${encodeURI(key)}`;
}

async function blobsPut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const store = blobStore();
  const value =
    typeof data === "string"
      ? data
      : new Blob([data as unknown as ArrayBuffer], { type: contentType });
  await store.set(key, value as Blob | string, {
    metadata: { contentType },
  });
  return { key, url: publicBlobUrl(key) };
}

async function blobsGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: publicBlobUrl(key) };
}

// ---------- Forge proxy backend (legacy) ----------

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as unknown as ArrayBuffer], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

async function forgePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

async function forgeGet(relKey: string): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

// ---------- Public API ----------

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const backend = selectBackend();
  return backend === "blobs"
    ? blobsPut(relKey, data, contentType)
    : forgePut(relKey, data, contentType);
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const backend = selectBackend();
  return backend === "blobs" ? blobsGet(relKey) : forgeGet(relKey);
}

/**
 * Returns the raw bytes of a stored object. Currently only implemented for
 * the Blobs backend — used by the /blobs/* serving function.
 */
export async function storageGetStream(
  relKey: string
): Promise<{ body: ReadableStream | null; contentType: string } | null> {
  const key = normalizeKey(relKey);
  const store = blobStore();
  const result = await store.getWithMetadata(key, { type: "stream" });
  if (!result) return null;
  const contentType =
    (result.metadata?.contentType as string | undefined) ??
    "application/octet-stream";
  return { body: result.data as ReadableStream | null, contentType };
}
