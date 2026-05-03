/**
 * Netlify Function — serves Netlify Blobs over HTTP at /blobs/*.
 *
 * Mounted via netlify.toml redirect (/blobs/*  →  this function). The blob
 * key is everything after /blobs/. Pair with Netlify Image CDN by routing
 * image transforms through /.netlify/images?url=/blobs/<key>&w=...
 *
 * Reads are public — only put non-sensitive content here, or guard the key
 * namespace upstream when minting URLs.
 */
import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const STORE_NAME = process.env.NETLIFY_BLOBS_STORE ?? "uploads";

export default async (req: Request, _ctx: Context) => {
  const url = new URL(req.url);
  const prefix = "/blobs/";
  if (!url.pathname.startsWith(prefix)) {
    return new Response("Not found", { status: 404 });
  }

  const key = decodeURIComponent(url.pathname.slice(prefix.length));
  if (!key || key.includes("..")) {
    return new Response("Bad request", { status: 400 });
  }

  const store = getStore(STORE_NAME);
  const result = await store.getWithMetadata(key, { type: "stream" });
  if (!result || !result.data) {
    return new Response("Not found", { status: 404 });
  }

  const contentType =
    (result.metadata?.contentType as string | undefined) ??
    "application/octet-stream";

  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && result.etag && ifNoneMatch === result.etag) {
    return new Response(null, { status: 304, headers: { ETag: result.etag } });
  }

  return new Response(result.data, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(result.etag ? { ETag: result.etag } : {}),
    },
  });
};

export const config = {
  path: "/blobs/*",
};
