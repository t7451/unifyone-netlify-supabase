#!/usr/bin/env node
/**
 * Backfill: copy forge-hosted assets into Netlify Blobs.
 *
 * Reads a list of keys from a JSON manifest (or stdin), downloads each via
 * the forge proxy, and re-uploads to Netlify Blobs under the same key.
 * Existing destination blobs are skipped unless --overwrite is passed.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-forge-to-blobs.ts \
 *     --manifest=keys.json \
 *     [--store=uploads] \
 *     [--concurrency=8] \
 *     [--overwrite] \
 *     [--dry-run]
 *
 * Required env (run from a machine with both backends configured):
 *   BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY
 *   NETLIFY_SITE_ID, NETLIFY_BLOBS_TOKEN
 *
 * Manifest format: a JSON array of strings (keys) or {key, contentType}.
 *   ["generated/123.png", "products/abc/main.jpg"]
 *   [{"key":"generated/123.png","contentType":"image/png"}, ...]
 */

import { readFile } from "node:fs/promises";
import { argv, env, exit, stdin } from "node:process";
import { getStore } from "@netlify/blobs";

type Entry = { key: string; contentType?: string };

type Args = {
  manifest?: string;
  store: string;
  concurrency: number;
  overwrite: boolean;
  dryRun: boolean;
};

function parseArgs(): Args {
  const a: Args = {
    store: env.NETLIFY_BLOBS_STORE ?? "uploads",
    concurrency: 8,
    overwrite: false,
    dryRun: false,
  };
  for (const raw of argv.slice(2)) {
    if (raw === "--overwrite") a.overwrite = true;
    else if (raw === "--dry-run") a.dryRun = true;
    else if (raw.startsWith("--manifest=")) a.manifest = raw.slice(11);
    else if (raw.startsWith("--store=")) a.store = raw.slice(8);
    else if (raw.startsWith("--concurrency=")) {
      const parsed = Number(raw.slice(14));
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error("--concurrency must be a positive integer");
      }
      a.concurrency = parsed;
    }
  }
  return a;
}

async function readManifest(path?: string): Promise<Entry[]> {
  const raw = path
    ? await readFile(path, "utf8")
    : await new Promise<string>((resolve, reject) => {
        let data = "";
        stdin.setEncoding("utf8");
        stdin.on("data", c => (data += c));
        stdin.on("end", () => resolve(data));
        stdin.on("error", reject);
      });
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Manifest must be a JSON array");
  }
  return parsed.map((item: unknown, index: number): Entry => {
    if (typeof item === "string") {
      if (item.length === 0) {
        throw new Error(`Manifest entry at index ${index} has empty key`);
      }
      return { key: item };
    }
    if (
      item &&
      typeof item === "object" &&
      "key" in item &&
      typeof (item as { key: unknown }).key === "string" &&
      (item as { key: string }).key.length > 0
    ) {
      const key = (item as { key: string }).key;
      const ct = (item as { contentType?: unknown }).contentType;
      return {
        key,
        contentType: typeof ct === "string" ? ct : undefined,
      };
    }
    throw new Error(
      `Manifest entry at index ${index} must be a non-empty string or { key: string, contentType?: string }`
    );
  });
}

async function forgeDownload(key: string): Promise<{
  body: Buffer;
  contentType: string;
}> {
  const baseUrl = env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "");
  const apiKey = env.BUILT_IN_FORGE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("Missing BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY");
  }
  const timeoutMs = 30_000;
  const urlReq = new URL(`${baseUrl}/v1/storage/downloadUrl`);
  urlReq.searchParams.set("path", key);
  const urlRes = await fetch(urlReq, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!urlRes.ok) {
    throw new Error(`forge downloadUrl ${urlRes.status} for ${key}`);
  }
  const { url } = (await urlRes.json()) as { url: string };
  const objRes = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!objRes.ok) {
    throw new Error(`forge GET ${objRes.status} for ${key}`);
  }
  const buf = Buffer.from(await objRes.arrayBuffer());
  const contentType =
    objRes.headers.get("content-type") ?? "application/octet-stream";
  return { body: buf, contentType };
}

type Result = {
  key: string;
  status: "uploaded" | "skipped" | "error";
  reason?: string;
};

async function migrateOne(
  entry: Entry,
  store: ReturnType<typeof getStore>,
  args: Args
): Promise<Result> {
  try {
    if (!args.overwrite) {
      const existing = await store.getMetadata(entry.key);
      if (existing)
        return { key: entry.key, status: "skipped", reason: "exists" };
    }
    if (args.dryRun) {
      return { key: entry.key, status: "skipped", reason: "dry-run" };
    }
    const { body, contentType } = await forgeDownload(entry.key);
    const ct = entry.contentType ?? contentType;
    await store.set(entry.key, new Blob([body], { type: ct }), {
      metadata: { contentType: ct },
    });
    return { key: entry.key, status: "uploaded" };
  } catch (err) {
    return {
      key: entry.key,
      status: "error",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

async function pool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = parseArgs();
  const entries = await readManifest(args.manifest);
  if (entries.length === 0) {
    console.error("Manifest is empty.");
    exit(1);
  }

  const siteID = env.NETLIFY_SITE_ID ?? env.SITE_ID;
  const token = env.NETLIFY_BLOBS_TOKEN ?? env.NETLIFY_AUTH_TOKEN;
  if (!siteID || !token) {
    throw new Error(
      "Missing NETLIFY_SITE_ID and NETLIFY_BLOBS_TOKEN (required when running outside a Netlify function)"
    );
  }
  const store = getStore({ name: args.store, siteID, token });

  console.error(
    `Backfilling ${entries.length} entries → store="${args.store}" ` +
      `concurrency=${args.concurrency}${args.overwrite ? " overwrite" : ""}` +
      `${args.dryRun ? " dry-run" : ""}`
  );

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;
  const errorList: Result[] = [];

  const results = await pool(entries, args.concurrency, e =>
    migrateOne(e, store, args)
  );

  for (const r of results) {
    if (r.status === "uploaded") uploaded++;
    else if (r.status === "skipped") skipped++;
    else {
      errors++;
      errorList.push(r);
    }
  }

  console.error(
    `Done. uploaded=${uploaded} skipped=${skipped} errors=${errors}`
  );
  if (errors > 0) {
    console.error("Errors:");
    for (const e of errorList) console.error(`  ${e.key}: ${e.reason}`);
    exit(1);
  }
}

main().catch(err => {
  console.error(err);
  exit(1);
});
