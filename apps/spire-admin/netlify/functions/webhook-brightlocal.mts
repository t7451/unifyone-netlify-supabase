import type { Config } from "@netlify/functions";
import { connectNeon, logger } from "@1commerce/spire";
import { handleBrightLocalCallback } from "../../../../services/spire-worker/src/submitters/brightlocal.js";

// BrightLocal fires a webhook per citation as it lands (or fails). We
// authenticate the callback by verifying the shared secret in the URL's
// token query param, match on (order_id, directory), and update the
// spire_submission_citations row.
//
// This endpoint runs on the spire-admin Netlify site — NOT on the
// unifyone production site — so a misbehaving webhook can't cause
// customer-facing issues.

export const config: Config = {
  path: "/api/webhooks/brightlocal",
};

type BrightLocalCallbackBody = {
  order_id?: string | number;
  external_reference?: string;
  directory?: string;
  directory_name?: string;
  live_url?: string | null;
  status?: string;
};

export default async (req: Request) => {
  const url = new URL(req.url);
  const expectedToken = process.env.BRIGHTLOCAL_WEBHOOK_TOKEN;
  const gotToken = url.searchParams.get("token");
  if (!expectedToken || gotToken !== expectedToken) {
    logger.warn({ gotToken: gotToken ? "[present]" : "[absent]" }, "Unauthorized BrightLocal webhook");
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const neonUrl = process.env.NEON_DATABASE_URL;
  if (!neonUrl) return new Response("NEON_DATABASE_URL not set", { status: 500 });

  let body: BrightLocalCallbackBody;
  try {
    body = (await req.json()) as BrightLocalCallbackBody;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const orderId = body.order_id !== undefined ? String(body.order_id) : null;
  const directoryName = body.directory ?? body.directory_name ?? "unknown";
  const liveUrl = typeof body.live_url === "string" ? body.live_url : null;
  const rawStatus = (body.status ?? "live").toLowerCase();
  const status: "live" | "rejected" | "error" =
    rawStatus === "rejected" ? "rejected" : rawStatus === "error" ? "error" : "live";

  if (!orderId) {
    return new Response(JSON.stringify({ ok: false, error: "missing order_id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { sql: raw, db } = connectNeon(neonUrl);
  try {
    await db.transaction(async (tx) => {
      await handleBrightLocalCallback({
        tx,
        orderId,
        directoryName,
        liveUrl,
        status,
        rawPayload: body as Record<string, unknown>,
      });
    });
    logger.info({ orderId, directoryName, status, liveUrl }, "BrightLocal callback processed");
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  } finally {
    await raw.end({ timeout: 5 });
  }
};
