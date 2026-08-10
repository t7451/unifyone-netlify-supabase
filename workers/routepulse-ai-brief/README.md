# routepulse-ai-brief

Cloudflare Worker using **Workers AI (free tier)** to draft the one-line
summary shown for a clear route — the case where nothing needs the paid
scoring model.

## Why

`routePulse.service.ts` only calls the paid AI (Anthropic/OpenAI) when
`needsAi` is true — an incident, a TomTom-flagged closure, or measured
congestion under 90% of free-flow. That's the right call: it's the
safety-relevant path and worth the cost. But the _clear_ path currently
falls back to a single hardcoded string
(`"Fastest route, no active incidents."`) with zero route-specific detail.

This worker fills that one gap, for free: given a clear route's distance,
duration, and main road names, it asks a small Workers AI model
(`@cf/meta/llama-3.1-8b-instruct`) for one short sentence. It never touches
routing, risk scoring, or the incident-driven explanation — only the
"nothing to say" fallback string.

## API

```
POST /brief
  Authorization: Bearer <BRIEF_SHARED_SECRET>
  Body: { "distanceMi": 4.2, "durationMin": 11, "roadNames": ["I-405", "NE Weidler St"] }
  -> { "summary": "Quick straight shot down I-405, light traffic the whole way." }
     or { "summary": null }  — treat exactly like "worker unreachable": fall back.

GET /health -> {"ok":true}
```

## Deploy

```bash
cd workers/routepulse-ai-brief
npx wrangler deploy
npx wrangler secret put BRIEF_SHARED_SECRET
```

Then in Netlify env vars, set the **same** secret value plus the worker URL:

```
ROUTEPULSE_AI_BRIEF_URL=https://routepulse-ai-brief.<your-subdomain>.workers.dev
ROUTEPULSE_AI_BRIEF_SECRET=<same value as BRIEF_SHARED_SECRET>
```

**Both unset by default is fine.** `getClearRouteBrief()` in
`server/routers/routePulse/aiBriefWorker.ts` returns `null` immediately if
`ROUTEPULSE_AI_BRIEF_URL` isn't configured, and the service falls back to
the static string exactly as it did before this worker existed. Nothing
breaks if you never deploy this.

## Not done here (scoped out on purpose — flagging for Kimi)

- No caching (KV or otherwise). Fine at current call volume — this only
  fires once per route search, only on the already-cheap clear-route path.
  Add a KV cache keyed on rounded `distanceMi`/`durationMin`/road-name-set
  before reusing this worker for anything higher-frequency.
- No retry logic. A single failed call just returns `null` and the caller
  falls back — by design, since this is a nice-to-have, not a
  safety-relevant path worth retry complexity.
- Workers AI free tier has a **daily neuron allowance** per account —
  monitor usage in the Cloudflare dashboard if this gets reused elsewhere;
  this worker doesn't track or rate-limit its own usage.
