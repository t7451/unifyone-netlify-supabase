/**
 * golf-logo-url.mts — Mint a signed Supabase Storage upload URL.
 *
 * Client PUTs directly to Storage; function never touches the bytes.
 * Dodges Netlify's 6 MB sync body limit and keeps cold starts thin.
 *
 * Route: POST /api/golf/logo-url   body: { filename, contentType? }
 */
import type { Config, Context } from "@netlify/functions";
import { requireUser } from "./_lib/supabase.js";

export default async (req: Request, _ctx: Context) => {
  if (req.method !== "POST")
    return new Response("method not allowed", { status: 405 });
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;
  const { sb, user } = auth;

  const { filename, contentType } = await req.json();
  if (!filename) return new Response("filename required", { status: 400 });

  // Path: {user_id}/{uuid}-{filename} — matches RLS folder check
  const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;

  const { data, error } = await sb.storage
    .from("golf-logos")
    .createSignedUploadUrl(path);

  if (error) return new Response(error.message, { status: 500 });

  return Response.json({
    path,
    uploadUrl: data.signedUrl,
    token: data.token,
    contentType: contentType ?? "image/png",
  });
};

export const config: Config = { path: "/api/golf/logo-url" };
