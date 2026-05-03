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
 * The body is intentionally NOT processed yet — this is a verified-receipt
 * stub. Wire event-specific handlers (workflow run completion, etc.) once
 * the contract with the n8n side is finalized.
 */
import express, { type Express, type Request, type Response } from "express";
import crypto from "crypto";
import { errMsg } from "./_core/errors";

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

        // Parse and dispatch — currently a stub. Persist to webhook_events
        // for audit once event types are defined.
        let event: unknown;
        try {
          event = JSON.parse(rawBody);
        } catch {
          return res.status(400).json({ error: "Invalid JSON" });
        }
        const evt = event as { type?: string; workflowId?: string };
        console.log(
          `[n8n] Webhook verified: type=${evt.type ?? "unknown"} workflow=${evt.workflowId ?? "unknown"}`
        );

        res.status(200).json({ received: true });
      } catch (err: unknown) {
        console.error("[n8n] Webhook handler error:", errMsg(err));
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );
}

// ─── Fetch-style handler for Netlify Functions ───────────────────────────────
// Mirrors registerN8nWebhookRoutes but as Web Fetch so it runs in serverless.
export async function registerN8nWebhookFetchRoutes(
  req: Request
): Promise<Response | null> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("x-n8n-signature") || undefined;
    if (!verifyN8nSignature(rawBody, sig)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    let event: unknown;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const evt = event as { type?: string; workflowId?: string };
    console.log(
      `[n8n] Webhook verified: type=${evt.type ?? "unknown"} workflow=${evt.workflowId ?? "unknown"}`
    );
    return Response.json({ received: true });
  } catch (err: unknown) {
    return Response.json({ error: errMsg(err) }, { status: 500 });
  }
}
