import type { APIRoute } from "astro";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";
import { createHmac } from "node:crypto";
import { resolveDatabaseUrl } from "../../lib/env";

// Public unsubscribe POST handler. Verifies the HMAC suppression token, then
// writes a row to spire_outreach_suppression. We write raw SQL via Neon's
// serverless driver rather than pulling in @1commerce/spire — the worker pkg
// uses drizzle 0.45 but unifyone is on 0.36, and the Spire surface isn't
// needed for one INSERT.

export const prerender = false;

const bodySchema = z.object({
  email: z.string().email(),
  token: z.string().length(32),
});

function suppressionToken(email: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(email.toLowerCase().trim())
    .digest("hex")
    .slice(0, 32);
}

function verifyToken(email: string, token: string, secret: string): boolean {
  const expected = suppressionToken(email, secret);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.OUTREACH_SUPPRESSION_HMAC_SECRET as
    | string
    | undefined;
  const neonUrl = resolveDatabaseUrl(import.meta.env);
  if (!secret || !neonUrl) {
    return json({ ok: false, error: "config_missing" }, 500);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "invalid json" }, 400);
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return json({ ok: false, error: "bad_input" }, 400);

  const { email, token } = parsed.data;
  if (!verifyToken(email, token, secret)) {
    return json({ ok: false, error: "invalid_token" }, 401);
  }

  const lower = email.toLowerCase().trim();
  const sql = neon(neonUrl);
  try {
    await sql`
      insert into spire_outreach_suppression (email, reason, expires_at)
      values (${lower}, 'unsubscribe', null)
      on conflict (email) where email is not null do nothing
    `;
  } catch (err) {
    console.error("unsubscribe insert failed", err);
    return json({ ok: false, error: "db_error" }, 500);
  }

  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
