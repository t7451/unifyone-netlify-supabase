/**
 * Netlify Function — /api/deploys/notify
 *
 * Receives Netlify outgoing-webhook events for deploy_succeeded /
 * deploy_failed / deploy_locked / deploy_created and turns them into:
 *
 *   1. A persistent `deploy_events` row (idempotent on deploy_id).
 *   2. A Resend alert email when the deploy enters a failure state.
 *   3. A Resend "recovered" email when a deploy goes back to "ready" after
 *      a tracked failure (state tracked in Netlify Blobs `deploy-state`).
 *
 * Verification: callers must send `x-netlify-deploy-token: $NETLIFY_DEPLOY_NOTIFY_TOKEN`.
 *
 * Configurable env:
 *   NETLIFY_DEPLOY_NOTIFY_TOKEN — REQUIRED. Shared secret with the Netlify
 *                                 outgoing webhook config.
 *   DEPLOY_ALERT_EMAIL          — destination address. Default keith@1commerce.online.
 *   RESEND_API_KEY              — for sending alerts.
 *   DATABASE_URL                — for writing deploy_events rows.
 *
 * Returns: { ok: true, action: "alerted" | "noop" | "recovered" | "duplicate" }
 */
import type { Context } from "@netlify/functions";
import {
  buildProdDeps,
  handleDeployEvent,
  verifyToken,
  type DeployEventPayload,
} from "../../server/_core/deployNotifier";

const DEFAULT_ALERT_EMAIL = "keith@1commerce.online";

export default async (req: Request, _ctx: Context) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const expected = process.env.NETLIFY_DEPLOY_NOTIFY_TOKEN || "";
  if (!expected) {
    return Response.json(
      {
        error: "NETLIFY_DEPLOY_NOTIFY_TOKEN not set in env",
        hint: "Generate a 32+ char random string, set on Netlify, and re-run scripts/register-deploy-notifier.mjs.",
      },
      { status: 500 }
    );
  }
  const provided = req.headers.get("x-netlify-deploy-token");
  if (!verifyToken(provided, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: DeployEventPayload;
  try {
    payload = (await req.json()) as DeployEventPayload;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || !payload.id) {
    return Response.json(
      { error: "Missing required field: id" },
      { status: 400 }
    );
  }

  const cfg = {
    expectedToken: expected,
    alertEmail: process.env.DEPLOY_ALERT_EMAIL || DEFAULT_ALERT_EMAIL,
    defaultSiteName: "unify0ne",
  };

  const deps = buildProdDeps();
  const result = await handleDeployEvent(payload, cfg, deps);
  return Response.json(result.body, { status: result.status });
};

export const config = {
  path: "/api/deploys/notify",
};
