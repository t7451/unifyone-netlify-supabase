import type { APIRoute } from "astro";
import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../lib/db/client";
import {
  primaryEmail,
  primaryOrgId,
  type ClerkUserEvent,
} from "../../lib/clerk";

export const prerender = false;

type ClerkEvent =
  | { type: "user.created"; data: ClerkUserEvent }
  | { type: "user.updated"; data: ClerkUserEvent }
  | { type: "user.deleted"; data: { id: string; deleted?: boolean } };

export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET not set");
    return new Response("server misconfigured", { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("missing svix headers", { status: 400 });
  }

  const body = await request.text();
  const wh = new Webhook(secret);
  let event: ClerkEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch (err) {
    console.error("svix verify failed", err);
    return new Response("bad signature", { status: 400 });
  }

  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      const email = primaryEmail(event.data)?.trim().toLowerCase();
      if (!email) return new Response("no email on user", { status: 400 });

      await getDb()
        .insert(schema.users)
        .values({
          id: event.data.id,
          email,
          orgId: primaryOrgId(event.data),
        })
        .onConflictDoUpdate({
          target: schema.users.id,
          set: { email, orgId: primaryOrgId(event.data) },
        });
    } else if (event.type === "user.deleted") {
      if (!event.data.id) return new Response("no user id", { status: 400 });
      await getDb()
        .delete(schema.users)
        .where(eq(schema.users.id, event.data.id));
    }
  } catch (err) {
    console.error("clerk webhook db op failed", err);
    return new Response("db error", { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
