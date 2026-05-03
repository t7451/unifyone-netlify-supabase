/**
 * server/_core/deployNotifier.ts
 *
 * Core handler for Netlify deploy webhook events. Pulled out of the Netlify
 * function so it can be unit-tested without spinning up the function runtime.
 *
 * Flow:
 *   1. POST /api/deploys/notify
 *   2. Verify shared-secret header `x-netlify-deploy-token` against
 *      NETLIFY_DEPLOY_NOTIFY_TOKEN.
 *   3. Persist the event row to `deploy_events` (idempotent on deploy_id).
 *   4. If failure state → send Resend alert email; track last-failure flag.
 *   5. If `ready` after a previous failure → send recovery email and clear flag.
 *
 * Failure-state tracking is persisted via a Netlify Blob (`deploy-state` store,
 * key `last-failed-deploy:<site_id>`). This means the receiver is stateful
 * across cold starts, which we need so a "ready" deploy 30 minutes after a
 * "failed" deploy still triggers the recovery email.
 *
 * All external dependencies (DB, Resend, Blobs) are injected via the
 * `Deps` interface so tests don't have to touch the network or DB.
 */

export type DeployState =
  | "ready"
  | "error"
  | "failed"
  | "timeout"
  | "broken"
  | "building"
  | "enqueued"
  | "uploading"
  | "processing"
  | "rejected"
  | string;

export interface DeployEventPayload {
  // Netlify sends the full deploy object. We're conservative about what we
  // require — anything string-shaped, anything unknown gets stashed in `payload`.
  id: string;
  site_id?: string;
  name?: string;
  state: DeployState;
  branch?: string;
  commit_ref?: string;
  commit_url?: string;
  error_message?: string | null;
  deploy_url?: string;
  log_url?: string | null;
  admin_url?: string | null;
  created_at?: string;
  updated_at?: string;
  deploy_time?: number; // seconds
  // Allow extra Netlify fields without losing them.
  [key: string]: unknown;
}

const FAILURE_STATES = new Set([
  "error",
  "failed",
  "timeout",
  "broken",
  "rejected",
]);

export interface BlobStore {
  get(key: string, opts?: { type: "json" }): Promise<unknown>;
  setJSON(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface DeployEventRow {
  deployId: string;
  siteId: string | null;
  state: string;
  branch: string | null;
  commitRef: string | null;
  errorMessage: string | null;
  payload: Record<string, unknown>;
  receivedAt: Date;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface Deps {
  /** Persist an event row; returns true if newly inserted, false if duplicate. */
  insertEvent: (row: DeployEventRow) => Promise<{ inserted: boolean }>;
  /** Send an email via Resend (or any pluggable email backend). */
  sendEmail: (msg: EmailMessage) => Promise<{ ok: boolean; error?: string }>;
  /** Persistent state store keyed by site for last-failure tracking. */
  blobStore: BlobStore;
  /** Now-fn for deterministic tests. */
  now?: () => Date;
}

export interface ReceiverConfig {
  expectedToken: string;
  alertEmail: string;
  /** Site-name fallback for emails when payload.name is missing. */
  defaultSiteName?: string;
}

export type ReceiverAction = "alerted" | "noop" | "recovered" | "duplicate";

export interface ReceiverResult {
  ok: boolean;
  action: ReceiverAction;
  status: number;
  body: Record<string, unknown>;
}

function blobKey(siteId: string | null | undefined): string {
  return `last-failed-deploy:${siteId || "unknown"}`;
}

/**
 * Subject line: "🚨 Netlify deploy FAILED: <commit_ref> on <site_name>"
 */
function failureSubject(p: DeployEventPayload, siteName: string): string {
  const commit = (p.commit_ref || "unknown").slice(0, 12);
  return `🚨 Netlify deploy FAILED: ${commit} on ${siteName}`;
}

function recoverySubject(p: DeployEventPayload, siteName: string): string {
  const commit = (p.commit_ref || "unknown").slice(0, 12);
  return `✅ Netlify deploy RECOVERED: ${commit} on ${siteName}`;
}

function fmtBody(
  kind: "failure" | "recovery",
  p: DeployEventPayload,
  siteName: string,
  ttf: number | null
): { html: string; text: string } {
  const rows: Array<[string, string]> = [
    ["State", String(p.state)],
    ["Site", siteName],
    ["Branch", p.branch || "—"],
    ["Commit", p.commit_ref || "—"],
    ["Deploy ID", p.id],
    ["Deploy URL", p.deploy_url || "—"],
    ["Log URL", p.log_url || "—"],
    ["Error", p.error_message || "—"],
    ["Time-to-failure (s)", ttf == null ? "—" : String(ttf)],
    ["Received at", new Date().toISOString()],
  ];

  const headline =
    kind === "failure"
      ? `Netlify deploy FAILED on <strong>${siteName}</strong>`
      : `Netlify deploy RECOVERED on <strong>${siteName}</strong>`;

  const adminLink = p.admin_url
    ? `<p><a href="${p.admin_url}">Investigate in Netlify admin →</a></p>`
    : "";

  const html = [
    `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">`,
    `<h2 style="color: ${kind === "failure" ? "#b91c1c" : "#15803d"};">${headline}</h2>`,
    adminLink,
    `<table cellpadding="6" cellspacing="0" style="border-collapse: collapse;">`,
    ...rows.map(
      ([k, v]) =>
        `<tr><td style="background:#f3f4f6;font-weight:600;border:1px solid #e5e7eb;">${escapeHtml(
          k
        )}</td><td style="border:1px solid #e5e7eb;">${escapeHtml(v)}</td></tr>`
    ),
    `</table>`,
    `</div>`,
  ].join("");

  const text = [
    headline.replace(/<[^>]+>/g, ""),
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    p.admin_url ? `\nInvestigate: ${p.admin_url}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Verifies the shared-secret header. Constant-time-ish comparison.
 */
export function verifyToken(
  headerValue: string | null,
  expected: string
): boolean {
  if (!expected || !headerValue) return false;
  if (headerValue.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ headerValue.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Process a single deploy event. Pure-ish: side-effects go through Deps.
 */
export async function handleDeployEvent(
  payload: DeployEventPayload,
  cfg: ReceiverConfig,
  deps: Deps
): Promise<ReceiverResult> {
  const now = deps.now ? deps.now() : new Date();
  const siteName = payload.name || cfg.defaultSiteName || "unify0ne";
  const siteId = payload.site_id || null;

  // 1. Persist the event row (idempotent on deploy_id).
  const row: DeployEventRow = {
    deployId: payload.id,
    siteId,
    state: String(payload.state),
    branch: payload.branch || null,
    commitRef: payload.commit_ref || null,
    errorMessage: payload.error_message || null,
    payload: payload as unknown as Record<string, unknown>,
    receivedAt: now,
  };
  const persisted = await deps.insertEvent(row);

  // If we've already seen this exact deploy_id, do not re-send any email.
  // Netlify retries on non-2xx, and we want to be re-runnable safely.
  if (!persisted.inserted) {
    return {
      ok: true,
      action: "duplicate",
      status: 200,
      body: { ok: true, action: "duplicate", deploy_id: payload.id },
    };
  }

  const isFailure = FAILURE_STATES.has(String(payload.state));
  const isReady = payload.state === "ready";

  if (isFailure) {
    const ttf =
      typeof payload.deploy_time === "number" ? payload.deploy_time : null;
    const { html, text } = fmtBody("failure", payload, siteName, ttf);
    const send = await deps.sendEmail({
      to: cfg.alertEmail,
      subject: failureSubject(payload, siteName),
      html,
      text,
    });
    // Mark this site as currently failing so the next "ready" triggers recovery.
    await deps.blobStore.setJSON(blobKey(siteId), {
      lastFailureAt: now.toISOString(),
      deployId: payload.id,
      commitRef: payload.commit_ref || null,
      branch: payload.branch || null,
    });
    return {
      ok: send.ok,
      action: "alerted",
      status: 200,
      body: {
        ok: send.ok,
        action: "alerted",
        emailError: send.error || null,
        deploy_id: payload.id,
      },
    };
  }

  if (isReady) {
    const prior = (await deps.blobStore.get(blobKey(siteId), {
      type: "json",
    })) as { lastFailureAt?: string; deployId?: string } | null;
    if (prior && prior.lastFailureAt) {
      const ttf =
        typeof payload.deploy_time === "number" ? payload.deploy_time : null;
      const { html, text } = fmtBody("recovery", payload, siteName, ttf);
      const send = await deps.sendEmail({
        to: cfg.alertEmail,
        subject: recoverySubject(payload, siteName),
        html,
        text,
      });
      await deps.blobStore.delete(blobKey(siteId));
      return {
        ok: send.ok,
        action: "recovered",
        status: 200,
        body: {
          ok: send.ok,
          action: "recovered",
          previousFailureAt: prior.lastFailureAt,
          deploy_id: payload.id,
        },
      };
    }
    // ready but no prior failure → quietly persist + ack
    return {
      ok: true,
      action: "noop",
      status: 200,
      body: { ok: true, action: "noop", deploy_id: payload.id },
    };
  }

  // Any other intermediate state (building, processing, …): persist + ack.
  return {
    ok: true,
    action: "noop",
    status: 200,
    body: {
      ok: true,
      action: "noop",
      deploy_id: payload.id,
      state: payload.state,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Real-Resend / real-Blob / real-DB adapters.
//
// The factories below build the production Deps. Tests construct their own.
// ─────────────────────────────────────────────────────────────────────────────

export async function sendResendEmail(
  apiKey: string | null | undefined,
  msg: EmailMessage,
  fromOverride?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromOverride || "UnifyOne Deploy Bot <hello@1commerce.online>",
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      let body = "";
      try {
        body = (await res.text()).slice(0, 200);
      } catch {
        /* swallow */
      }
      return { ok: false, error: `Resend HTTP ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Production adapter: persist a deploy_events row via the existing neon HTTP
 * client + drizzle. Pulls `getDb` and `deployEvents` lazily so this module
 * doesn't widen the cold-start surface area on the health probe.
 */
export async function persistDeployEvent(
  row: DeployEventRow
): Promise<{ inserted: boolean }> {
  const { getDb } = await import("../db");
  const { deployEvents } = await import("../../drizzle/schema");
  const db = await getDb();
  if (!db) return { inserted: false };
  // ON CONFLICT (deploy_id) DO NOTHING — idempotent inserts.
  const result = await db
    .insert(deployEvents)
    .values({
      deployId: row.deployId,
      siteId: row.siteId,
      state: row.state,
      branch: row.branch,
      commitRef: row.commitRef,
      errorMessage: row.errorMessage,
      payload: row.payload,
      receivedAt: row.receivedAt,
    })
    .onConflictDoNothing({ target: deployEvents.deployId })
    .returning({ id: deployEvents.id });
  return { inserted: result.length > 0 };
}

/**
 * Production Blob store wrapper for `deploy-state`.
 */
export function buildBlobStore(): BlobStore {
  return {
    async get(key, opts) {
      const { getStore } = await import("@netlify/blobs");
      const store = getStore("deploy-state");
      if (opts?.type === "json") {
        return store.get(key, { type: "json" });
      }
      return store.get(key, { type: "json" });
    },
    async setJSON(key, value) {
      const { getStore } = await import("@netlify/blobs");
      const store = getStore("deploy-state");
      await store.setJSON(key, value);
    },
    async delete(key) {
      const { getStore } = await import("@netlify/blobs");
      const store = getStore("deploy-state");
      await store.delete(key);
    },
  };
}

/**
 * Construct production Deps. Test code builds Deps directly.
 */
export function buildProdDeps(): Deps {
  return {
    insertEvent: persistDeployEvent,
    sendEmail: msg => sendResendEmail(process.env.RESEND_API_KEY, msg),
    blobStore: buildBlobStore(),
  };
}
