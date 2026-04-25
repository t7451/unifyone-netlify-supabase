import type { ContentPlan, Site } from "../../schema.js";
import type { SyndicationResult } from "../types.js";

// Substack adapter. Same shape as LinkedIn — no public API, browser
// automation lives on the worker. Substack's editor exposes a
// canonical_url field in post settings (only as a meta tag, not a true
// rel=canonical on the page header), but we still set it; better than
// zero signal.

export async function publishToSubstack(
  _plan: ContentPlan,
  _site: Site
): Promise<SyndicationResult> {
  return {
    ok: false,
    retryable: false,
    error:
      "substack adapter is browser-method; the Contabo spire-worker handles publishing. " +
      "This stub returns ok:false so the API-side syndicate-tick leaves the row queued.",
    response: { method: "browser", deferred: true },
  };
}
