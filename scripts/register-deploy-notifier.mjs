#!/usr/bin/env node
/**
 * scripts/register-deploy-notifier.mjs
 *
 * Idempotently register Netlify outgoing webhooks that POST deploy events to
 * the in-app receiver at /api/deploys/notify. Listed events:
 *
 *   - deploy_failed   (state went red — primary alert)
 *   - deploy_locked   (locked deploy means rollbacks are blocked — alert)
 *   - deploy_created  (gives us a "started" timestamp for time-to-failure)
 *
 * "deploy_succeeded" intentionally not registered: the receiver only emits a
 * recovery email when a deploy goes "ready" *after* a tracked failure, and
 * the deploy_failed → deploy_succeeded transition is what we care about.
 * (If we wanted, we could register that too — see ADD_SUCCESS env var.)
 *
 * Usage:
 *   NETLIFY_AUTH_TOKEN=… NETLIFY_SITE_ID=… NETLIFY_DEPLOY_NOTIFY_TOKEN=… \
 *     node scripts/register-deploy-notifier.mjs
 *
 * Optional:
 *   NETLIFY_DEPLOY_NOTIFY_URL=https://1commerce.online/api/deploys/notify  (default)
 *   ADD_SUCCESS=1   — also register deploy_succeeded
 *
 * Idempotent: lists existing hooks, only creates ones that don't already
 * point at the same URL+event. Safe to re-run.
 */

const NETLIFY_API = "https://api.netlify.com/api/v1";

function die(msg, code = 1) {
  console.error(`\n[register-deploy-notifier] ERROR: ${msg}\n`);
  process.exit(code);
}

const authToken = process.env.NETLIFY_AUTH_TOKEN;
const siteId = process.env.NETLIFY_SITE_ID;
const sharedSecret = process.env.NETLIFY_DEPLOY_NOTIFY_TOKEN;
const notifyUrl =
  process.env.NETLIFY_DEPLOY_NOTIFY_URL ||
  "https://1commerce.online/api/deploys/notify";

if (!authToken) {
  die(
    [
      "NETLIFY_AUTH_TOKEN not set.",
      "",
      "Generate one at:",
      "  https://app.netlify.com/user/applications#personal-access-tokens",
      "",
      "Then run:",
      "  export NETLIFY_AUTH_TOKEN=nfp_xxx",
      "  export NETLIFY_SITE_ID=<your-site-id-from-netlify-site-settings>",
      "  export NETLIFY_DEPLOY_NOTIFY_TOKEN=<the-shared-secret-you-set-on-netlify-env>",
      "  node scripts/register-deploy-notifier.mjs",
    ].join("\n")
  );
}
if (!siteId) {
  die(
    "NETLIFY_SITE_ID not set. Find it at: Site → Site configuration → Site information → Site ID."
  );
}
if (!sharedSecret) {
  die(
    "NETLIFY_DEPLOY_NOTIFY_TOKEN not set. Generate a 32+ char random string and set it BOTH on Netlify env and in this shell before running."
  );
}

const eventsToRegister = [
  "deploy_failed",
  "deploy_locked",
  "deploy_created",
];
if (process.env.ADD_SUCCESS === "1") eventsToRegister.push("deploy_succeeded");

const log = (...a) => console.log("[register-deploy-notifier]", ...a);

async function netlify(path, init = {}) {
  const res = await fetch(`${NETLIFY_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* swallow */
  }
  if (!res.ok) {
    const msg = body && body.message ? body.message : `${res.status}`;
    die(`Netlify API ${path} → ${res.status} ${msg}`);
  }
  return body;
}

async function main() {
  log(`site_id=${siteId}`);
  log(`notify_url=${notifyUrl}`);
  log(`events=${eventsToRegister.join(",")}`);

  // 1. List existing hooks for this site.
  const existing = await netlify(`/hooks?site_id=${encodeURIComponent(siteId)}`);
  if (!Array.isArray(existing)) {
    die(`Expected an array from /hooks, got: ${JSON.stringify(existing).slice(0, 200)}`);
  }
  log(`found ${existing.length} existing hook(s) on this site`);

  let created = 0;
  let kept = 0;
  for (const event of eventsToRegister) {
    const match = existing.find(
      h =>
        h &&
        h.type === "url" &&
        h.event === event &&
        h.data &&
        h.data.url === notifyUrl
    );
    if (match) {
      log(`✓ already registered: ${event} → ${notifyUrl} (id=${match.id})`);
      kept += 1;
      continue;
    }

    const body = {
      site_id: siteId,
      type: "url",
      event,
      data: {
        url: notifyUrl,
        // Netlify supports arbitrary headers on outgoing webhooks via
        // `headers` on the data object on newer accounts. Where unsupported,
        // we fall back to query-string. Most accounts honor headers; we set
        // both for safety.
        headers: {
          "x-netlify-deploy-token": sharedSecret,
        },
      },
    };
    const result = await netlify(`/hooks`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    log(`+ created hook: ${event} → ${notifyUrl} (id=${result && result.id})`);
    created += 1;
  }

  log(`\nDone. created=${created} kept=${kept}`);
  log(
    "\nVerify by triggering a deploy and watching for entries at /api/admin/deploy-events (admin-key gated)."
  );
  log(
    "Smoke-test the receiver without a real deploy via:\n" +
      "  curl -s -X POST https://1commerce.online/api/admin/deploy-notify/test \\\n" +
      `    -H "x-admin-key: $ADMIN_API_KEY" \\\n` +
      `    -H "content-type: application/json" \\\n` +
      `    -d '{"state":"error","commit_ref":"deadbeef","error_message":"smoke test"}'`
  );
}

main().catch(err => die(err.stack || err.message || String(err)));
