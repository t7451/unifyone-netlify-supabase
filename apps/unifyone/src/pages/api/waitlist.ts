import type { APIRoute } from "astro";
import { z } from "zod";
import { db, schema } from "../../lib/db/client";

export const prerender = false;

const bodySchema = z.object({
  email: z.string().email(),
  source: z.string().max(64).optional(),
  utm: z.record(z.string(), z.string()).optional(),
});

export const POST: APIRoute = async ({ request }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "invalid json" }, 400);
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "invalid body" },
      400
    );
  }

  const { email, source, utm } = parsed.data;

  try {
    await db
      .insert(schema.waitlist)
      .values({ email, source, utm: utm ?? null })
      .onConflictDoNothing();
  } catch (err) {
    console.error("waitlist insert failed", err);
    return json({ ok: false, error: "db error" }, 500);
  }

  // Fire-and-forget n8n hook — never block the response.
  const hook = import.meta.env.WAITLIST_N8N_WEBHOOK_URL;
  if (hook) {
    void fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, source, utm }),
    }).catch((err) => console.error("waitlist n8n hook failed", err));
  }

  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
