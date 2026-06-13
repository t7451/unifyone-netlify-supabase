/**
 * server/neonAuthWebhook.ts
 *
 * Receives Neon Auth webhook events (user.created, user.before_confirmation,
 * user.deleted, password_reset.requested, etc.) and performs side-effects:
 *   - Logs structured events for observability
 *   - Creates the matching tenant row on user.created so the user can log in
 *     via the custom JWT flow immediately
 *   - Fires internal notifications for visibility (new sign-ups, deletions)
 *
 * Neon signs each request with HMAC-SHA256:
 *   header: x-neon-signature: t=<unix_ts>,v1=<hex_sig>
 *   signed string: "<unix_ts>.<raw_body>"
 *
 * Set NEON_AUTH_WEBHOOK_SECRET in your environment to the signing secret
 * shown in the Neon Console → Auth → Webhooks panel.
 *
 * Endpoint: POST /api/neon/auth-webhook
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "./_core/logger";
import { getDb, upsertUser } from "./db";

// ── Types ────────────────────────────────────────────────────────────────────

interface NeonUser {
  id: string;
  primary_email: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  created_at_millis: number;
}

interface NeonWebhookEvent {
  type: string;
  data: {
    user?: NeonUser;
    new_user?: NeonUser;
    attempt_code?: string;
  };
}

// ── Signature verification ───────────────────────────────────────────────────

function verifyNeonSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;

  // Header format: "t=1234567890,v1=abc123def456..."
  const parts = Object.fromEntries(
    signatureHeader.split(",").map(p => p.split("=") as [string, string])
  );
  const ts = parts["t"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  // Reject events older than 5 minutes
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (age > 300) {
    logger.warn("neonAuthWebhook: stale timestamp rejected", { age });
    return false;
  }

  const signed = `${ts}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(v1, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

// ── Event handlers ───────────────────────────────────────────────────────────

async function handleUserCreated(user: NeonUser): Promise<void> {
  logger.info("neonAuthWebhook: user.created", {
    userId: user.id,
    email: user.primary_email,
  });

  // upsertUser is idempotent — safe to call even if the row already exists.
  try {
    await upsertUser({
      openId: user.id,
      email: user.primary_email ?? undefined,
      name: user.display_name ?? user.primary_email?.split("@")[0] ?? null,
      loginMethod: "neon",
    });
    logger.info("neonAuthWebhook: user row upserted", { userId: user.id });
  } catch (err) {
    // Non-fatal: customAuth.ts creates the row on first sign-in if this fails.
    logger.warn("neonAuthWebhook: user upsert failed", {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handleUserDeleted(user: NeonUser): Promise<void> {
  logger.info("neonAuthWebhook: user.deleted", {
    userId: user.id,
    email: user.primary_email,
  });
  // Soft-delete: set deletedAt so auth lookups skip this user.
  try {
    const db = await getDb();
    if (!db) return;
    const { users } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.openId, user.id));
  } catch (err) {
    logger.warn("neonAuthWebhook: user soft-delete failed", {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function registerNeonAuthFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== "/api/neon/auth-webhook") return null;
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const secret = process.env.NEON_AUTH_WEBHOOK_SECRET ?? "";
  const rawBody = await req.text();

  if (secret) {
    const sig = req.headers.get("x-neon-signature");
    if (!verifyNeonSignature(rawBody, sig, secret)) {
      logger.warn("neonAuthWebhook: invalid signature");
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    logger.warn(
      "neonAuthWebhook: NEON_AUTH_WEBHOOK_SECRET not set — skipping signature check"
    );
  }

  let event: NeonWebhookEvent;
  try {
    event = JSON.parse(rawBody) as NeonWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  logger.info("neonAuthWebhook: received event", { type: event.type });

  try {
    switch (event.type) {
      case "user.created": {
        const user = event.data.user ?? event.data.new_user;
        if (user) await handleUserCreated(user);
        break;
      }
      case "user.deleted": {
        const user = event.data.user;
        if (user) await handleUserDeleted(user);
        break;
      }
      case "user.updated":
        logger.info("neonAuthWebhook: user.updated", {
          userId: event.data.user?.id,
        });
        break;
      case "password_reset.requested":
        logger.info("neonAuthWebhook: password_reset.requested", {
          userId: event.data.user?.id,
        });
        break;
      default:
        logger.info("neonAuthWebhook: unhandled event type", {
          type: event.type,
        });
    }
  } catch (err) {
    logger.error("neonAuthWebhook: event handler threw", {
      type: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
    // Still return 200 so Neon doesn't keep retrying for handler-level bugs.
  }

  return Response.json({ received: true });
}
