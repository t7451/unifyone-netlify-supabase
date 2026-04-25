import type { Config } from "@netlify/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { connectNeon, logger, schema } from "@1commerce/spire";

// Resend event webhook for delivered / bounced / complained / opened / clicked.
// We don't action opens/clicks (open rates are noise + privacy theatre); but
// hard bounces and complaints write to suppression so the next send blocks.

export const config: Config = {
  path: "/api/webhooks/resend-events",
};

type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.complained"
  | "email.bounced"
  | "email.opened"
  | "email.clicked"
  | "email.failed";

interface ResendEventPayload {
  type?: ResendEventType;
  data?: {
    email_id?: string;
    to?: string[];
    bounce?: { type?: string; subType?: string };
  };
}

export default async (req: Request) => {
  const secret = process.env.RESEND_EVENTS_SECRET;
  if (!secret) {
    return new Response("RESEND_EVENTS_SECRET not set", { status: 500 });
  }
  const neonUrl = process.env.NEON_DATABASE_URL;
  if (!neonUrl) return new Response("NEON_DATABASE_URL not set", { status: 500 });

  const body = await req.text();
  if (!verifySvixSignature(req.headers, body, secret)) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let payload: ResendEventPayload;
  try {
    payload = JSON.parse(body) as ResendEventPayload;
  } catch {
    return new Response("invalid JSON", { status: 400 });
  }

  const data = payload.data ?? {};
  const recipients = data.to ?? [];
  const messageId = data.email_id;

  const { sql: raw, db } = connectNeon(neonUrl);
  let action = "noop";
  try {
    switch (payload.type) {
      case "email.bounced": {
        const isHard =
          (data.bounce?.type ?? "").toLowerCase() === "permanent" ||
          (data.bounce?.subType ?? "").toLowerCase().includes("hard");
        if (isHard) {
          for (const email of recipients) {
            await db
              .insert(schema.outreachSuppression)
              .values({
                email: email.toLowerCase().trim(),
                reason: "hard_bounce",
                expiresAt: null,
                sourceMessageId: messageId
                  ? await resolveOurMessageId(db, messageId)
                  : null,
              })
              .onConflictDoNothing({ target: schema.outreachSuppression.email });
          }
          action = "hard_bounce_suppressed";
        } else {
          action = "soft_bounce_logged";
        }
        // Mirror status onto the originating message.
        if (messageId) {
          const ours = await resolveOurMessageId(db, messageId);
          if (ours) {
            await db
              .update(schema.outreachMessages)
              .set({ status: isHard ? "bounced" : "sent", error: "bounce_event" })
              .where(eq(schema.outreachMessages.id, ours));
          }
        }
        break;
      }
      case "email.complained": {
        for (const email of recipients) {
          const at = email.indexOf("@");
          if (at < 0) continue;
          const domain = email.slice(at + 1).toLowerCase();
          await db
            .insert(schema.outreachSuppression)
            .values({
              domain,
              reason: "complaint",
              expiresAt: null,
            })
            .onConflictDoNothing({ target: schema.outreachSuppression.domain });
        }
        action = "complaint_suppressed_domain";
        break;
      }
      case "email.delivered":
      case "email.opened":
      case "email.clicked":
      case "email.sent":
      case "email.delivery_delayed":
      case "email.failed":
      default:
        // Just log — open/click are noise; failed/delayed surface in retry attempts.
        action = `logged_${payload.type ?? "unknown"}`;
    }
  } finally {
    await raw.end({ timeout: 5 });
  }

  logger.info({ type: payload.type, action, recipients }, "Resend event handled");
  return new Response(JSON.stringify({ ok: true, action }), {
    headers: { "content-type": "application/json" },
  });
};

async function resolveOurMessageId(
  db: ReturnType<typeof connectNeon>["db"],
  resendMessageId: string
): Promise<string | null> {
  const rows = await db
    .select({ id: schema.outreachMessages.id })
    .from(schema.outreachMessages)
    .where(eq(schema.outreachMessages.resendMessageId, resendMessageId))
    .limit(1);
  return rows[0]?.id ?? null;
}

function verifySvixSignature(
  headers: Headers,
  body: string,
  secret: string
): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const sigHeader = headers.get("svix-signature");
  if (!id || !timestamp || !sigHeader) return false;

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    return false;
  }

  const decodedSecret = secret.startsWith("whsec_")
    ? Buffer.from(secret.replace(/^whsec_/, ""), "base64")
    : Buffer.from(secret, "utf8");

  const message = `${id}.${timestamp}.${body}`;
  const computed = createHmac("sha256", decodedSecret)
    .update(message)
    .digest("base64");

  for (const part of sigHeader.split(" ")) {
    const [, sig] = part.split(",");
    if (!sig) continue;
    try {
      if (timingSafeEqual(Buffer.from(sig), Buffer.from(computed))) return true;
    } catch {
      continue;
    }
  }
  return false;
}
