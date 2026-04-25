import type { ContentPlan, Site } from "../../schema.js";
import type { SyndicationResult } from "../types.js";

// LinkedIn Articles adapter. There is no public Articles API — the only
// way to publish programmatically is via Playwright on a logged-in
// browser session. The actual browser drive lives in
// services/spire-worker/src/adapters/linkedin-playwright.ts.
//
// This adapter, called from the Netlify-side `publish.ts`, returns a
// "deferred" result — the syndication row stays queued, and the spire
// worker on Contabo claims it on its next tick (same pattern as
// directory submissions with method='form').

export async function publishToLinkedIn(
  _plan: ContentPlan,
  _site: Site
): Promise<SyndicationResult> {
  return {
    ok: false,
    retryable: false,
    error:
      "linkedin adapter is browser-method; the Contabo spire-worker handles publishing. " +
      "This stub returns ok:false so the API-side syndicate-tick leaves the row queued — " +
      "the worker will pick it up by status='queued' + method='browser' filter.",
    response: { method: "browser", deferred: true },
  };
}
