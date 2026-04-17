/**
 * golf-config.mts — Save and load golf club configurations.
 *
 * Routes:
 *   POST /api/golf/config       body: GolfConfigInput
 *   GET  /api/golf/config?id=...
 *
 * Auth: Supabase JWT via Authorization: Bearer <access_token>.
 * RLS on golf_configs enforces per-user isolation.
 */
import type { Config, Context } from "@netlify/functions";
import { requireUser } from "./_lib/supabase.js";

export default async (req: Request, _ctx: Context) => {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;
  const { sb, user } = auth;

  if (req.method === "POST") {
    const body = await req.json();
    const { data, error } = await sb
      .from("golf_configs")
      .insert({
        user_id: user.id,
        engraving_text: body.engravingText ?? null,
        engraving_font: body.engravingFont ?? null,
        components: body.components ?? {},
        leather_finish: body.leatherFinish ?? null,
        logo_path: body.logoPath ?? null,
        tab_state: body.tabState ?? null,
      })
      .select("id")
      .single();
    if (error) return new Response(error.message, { status: 500 });
    return Response.json({ configId: data.id });
  }

  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return new Response("missing id", { status: 400 });
    const { data, error } = await sb
      .from("golf_configs")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return new Response(error.message, { status: 404 });
    return Response.json(data);
  }

  return new Response("method not allowed", { status: 405 });
};

export const config: Config = { path: "/api/golf/config" };
