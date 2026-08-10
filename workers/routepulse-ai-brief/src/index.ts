/**
 * RoutePulse AI brief — Cloudflare Worker (Workers AI free tier).
 *
 * Why this exists:
 *  The main route-scoring model call (server/routers/routePulse/aiScoring.ts,
 *  wherever it lives — Anthropic/OpenAI) is only invoked when `needsAi` is
 *  true: an incident, a closure, or measured congestion. That's the right
 *  call for anything safety-relevant. But the *clear* case — no incidents,
 *  free-flowing — currently just gets a hardcoded string
 *  ("Fastest route, no active incidents.") with no route-specific color.
 *
 *  This worker exists to fill exactly that gap, for free: given a clear
 *  route's basic stats (distance, duration, road names), it asks a small
 *  Workers AI model for one short, specific sentence. Nothing here ever
 *  gates routing, risk scoring, or the incident-driven AI explanation —
 *  it only replaces a static string with a slightly less static one, and
 *  if it's slow, down, or misconfigured, the caller falls straight back
 *  to the hardcoded string. Low stakes by design: that's what makes it
 *  safe to run on a free, best-effort tier instead of the paid model.
 *
 * Endpoint: POST /brief
 *   Headers: Authorization: Bearer <BRIEF_SHARED_SECRET>
 *   Body: { distanceMi: number, durationMin: number, roadNames: string[] }
 *   Returns: { summary: string } or { summary: null } if generation failed
 *            (caller should treat null exactly like "worker unreachable").
 *
 * Deliberately NOT handled here (left for Kimi / a future pass, each is
 * its own scoped change, not a silent scope-creep of this worker):
 *  - No caching layer yet. Every /brief call hits the model. Fine at
 *    current volume (only fires on the already-cheap "clear route" path,
 *    at most once per route search), but if this gets reused for
 *    higher-frequency callers, add a KV cache keyed on rounded
 *    distance/duration/road-name-set before scaling up call volume.
 *  - No streaming. Response is small (one sentence) so a single
 *    non-streamed completion is simplest; revisit only if latency
 *    becomes an issue.
 *  - Not wired into the incident/congestion path at all — that path's
 *    explanation comes from the paid model on purpose (higher stakes,
 *    worth the cost). Do not redirect incident-bearing routes here.
 */

export interface Env {
  AI: Ai;
  /** Shared bearer secret — set with `npx wrangler secret put BRIEF_SHARED_SECRET`. */
  BRIEF_SHARED_SECRET?: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

type BriefRequest = {
  distanceMi: number;
  durationMin: number;
  roadNames: string[];
};

function isBriefRequest(v: unknown): v is BriefRequest {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.distanceMi === "number" &&
    typeof r.durationMin === "number" &&
    Array.isArray(r.roadNames) &&
    r.roadNames.every(x => typeof x === "string") &&
    // Small, bounded payload only — this endpoint drafts one sentence,
    // it doesn't need (or want) an essay's worth of road names.
    r.roadNames.length <= 12
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "routepulse-ai-brief" });
    }

    if (url.pathname !== "/brief" || request.method !== "POST") {
      return json({ error: "not found" }, 404);
    }

    // Auth: if a secret is configured, require it. If the operator hasn't
    // set one yet (fresh deploy), fail open to "unauthenticated but
    // reachable" rather than bricking local testing — but this should
    // always have a secret set before going anywhere near production
    // traffic, since Workers AI usage counts against the account's daily
    // neuron allowance regardless of who's calling.
    if (env.BRIEF_SHARED_SECRET) {
      const auth = request.headers.get("authorization") ?? "";
      if (auth !== `Bearer ${env.BRIEF_SHARED_SECRET}`) {
        return json({ error: "unauthorized" }, 401);
      }
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400);
    }
    if (!isBriefRequest(payload)) {
      return json({ error: "invalid body" }, 400);
    }

    const roads = payload.roadNames.filter(Boolean).slice(0, 6);
    const prompt =
      `Write exactly one short, plain sentence (under 20 words) summarizing ` +
      `a clear driving route for a gig delivery driver. No traffic issues, ` +
      `nothing to warn about. Distance: ${payload.distanceMi.toFixed(1)} mi. ` +
      `Duration: ${Math.round(payload.durationMin)} min. ` +
      `${roads.length ? `Main roads: ${roads.join(", ")}. ` : ""}` +
      `Sound like a helpful copilot, not a robot. Output only the sentence, ` +
      `no quotes, no preamble.`;

    try {
      // Small, fast, free-tier-friendly instruct model — this is a one-line
      // caption, not a reasoning task, so we deliberately don't reach for
      // anything bigger.
      const result = (await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 60,
      })) as { response?: string };

      const summary = (result.response ?? "").trim().replace(/^"|"$/g, "");
      if (!summary || summary.length > 220) {
        // Model returned nothing usable, or went on a tangent well past
        // "one short sentence" — treat as a soft failure, let the caller
        // fall back rather than surface a runaway completion to a driver.
        return json({ summary: null });
      }
      return json({ summary });
    } catch (err) {
      console.error("[routepulse-ai-brief] Workers AI call failed:", err);
      return json({ summary: null });
    }
  },
};
