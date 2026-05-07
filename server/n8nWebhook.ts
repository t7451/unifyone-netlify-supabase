/**
 * Inbound n8n webhook receiver.
 *
 * UnifyOne advertises `/api/n8n/webhook` to operators (see
 * server/routers/developer.ts) as the endpoint n8n workflows call into.
 * Without HMAC verification this would be an unauthenticated mutation
 * surface; this module implements the receiver with a shared-secret
 * HMAC-SHA256 check over the raw request body.
 *
 * Required env: N8N_WEBHOOK_SECRET. n8n must be configured to send the
 * header `X-N8N-Signature: sha256=<hex digest of body>`.
 *
 * Verified bodies are parsed and persisted to the `webhook_events` table
 * for audit. Type-specific handlers can pick up rows by source="n8n" and
 * status="pending" and process them out-of-band.
 */
import express, { type Express, type Request, type Response } from "express";
import crypto from "crypto";
import { errMsg } from "./_core/errors";
import { logSystemWebhookEvent, logWebhookEvent } from "./db";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function verifyN8nSignature(
  rawBody: string,
  signature: string | undefined
): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed — never accept unverified webhooks.
    console.error("[n8n] N8N_WEBHOOK_SECRET is not set; rejecting webhook");
    return false;
  }
  if (!signature) return false;
  const provided = signature.startsWith("sha256=")
    ? signature.slice("sha256=".length)
    : signature;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  return safeEqual(provided, expected);
}

/**
 * Coerce a tenant id from common shapes seen in n8n payloads. n8n
 * workflows typically forward UnifyOne event payloads that already
 * contain `tenant_id` / `tenantId`. Returns `null` if absent or
 * non-numeric so the row falls through to the system-level log.
 */
function extractTenantId(event: unknown): number | null {
  if (!event || typeof event !== "object") return null;
  const obj = event as Record<string, unknown>;
  const candidates = [
    obj.tenantId,
    obj.tenant_id,
    (obj.payload as Record<string, unknown> | undefined)?.tenantId,
    (obj.payload as Record<string, unknown> | undefined)?.tenant_id,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
    if (typeof c === "string") {
      const n = Number(c);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

export function registerN8nWebhookRoutes(app: Express) {
  app.post(
    "/api/n8n/webhook",
    express.raw({ type: "*/*", limit: "1mb" }),
    async (req: Request, res: Response) => {
      try {
        const rawBody =
          req.body instanceof Buffer
            ? req.body.toString("utf8")
            : typeof req.body === "string"
              ? req.body
              : JSON.stringify(req.body);

        const sigHeader = req.headers["x-n8n-signature"];
        const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;

        if (!verifyN8nSignature(rawBody, signature)) {
          return res.status(401).json({ error: "Invalid signature" });
        }

        let event: unknown;
        try {
          event = JSON.parse(rawBody);
        } catch {
          return res.status(400).json({ error: "Invalid JSON" });
        }
        const evt = event as { type?: string; workflowId?: string };
        const eventType = evt.type ?? "unknown";

        // Persist for audit + downstream processing. Tenant-scope when the
        // payload carries a tenantId; otherwise log as system-level.
        const tenantId = extractTenantId(event);
        const payload =
          event && typeof event === "object"
            ? (event as Record<string, unknown>)
            : { raw: rawBody };
        try {
          if (tenantId != null) {
            await logWebhookEvent("n8n", eventType, payload, tenantId);
          } else {
            await logSystemWebhookEvent("n8n", eventType, payload);
          }
        } catch (err: unknown) {
          // Persistence failure shouldn't fail the webhook ack — n8n would
          // retry and we'd ack twice. Log and continue.
          console.error("[n8n] failed to persist webhook event:", errMsg(err));
        }

        console.log(
          `[n8n] Webhook verified: type=${eventType} workflow=${evt.workflowId ?? "unknown"} tenantId=${tenantId ?? "system"}`
        );

        res.status(200).json({ received: true });
      } catch (err: unknown) {
        console.error("[n8n] Webhook handler error:", errMsg(err));
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );
}
