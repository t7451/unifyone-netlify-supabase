/**
 * Helpers for rendering Netlify Blob-backed images through the Netlify
 * Image CDN. Use these instead of hand-building /.netlify/images URLs.
 *
 *   <img src={blobImage("products/123/main.jpg", { w: 800, fit: "cover" })} />
 */

export type ImageTransform = {
  /** Target width in px. */
  w?: number;
  /** Target height in px. */
  h?: number;
  /** Cropping/fit strategy. */
  fit?: "cover" | "contain" | "fill";
  /** Output format. */
  fm?: "avif" | "webp" | "jpg" | "png";
  /** Quality 1–100 (lossy formats only). */
  q?: number;
};

/** Returns the raw, untransformed URL for a stored blob. */
export function blobUrl(key: string): string {
  return `/blobs/${encodeURI(key.replace(/^\/+/, ""))}`;
}

/** Returns an Image-CDN-transformed URL for a stored image blob. */
export function blobImage(key: string, t: ImageTransform = {}): string {
  const params = new URLSearchParams({ url: blobUrl(key) });
  if (t.w) params.set("w", String(t.w));
  if (t.h) params.set("h", String(t.h));
  if (t.fit) params.set("fit", t.fit);
  if (t.fm) params.set("fm", t.fm);
  if (t.q) params.set("q", String(t.q));
  return `/.netlify/images?${params.toString()}`;
}
