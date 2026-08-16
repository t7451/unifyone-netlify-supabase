/**
 * Rate-limited live smoke of PDX golden routes against production.
 * Schedule: every 6 hours — samples a few OD pairs, logs health metrics.
 *
 * Env: optional GOLDEN_SMOKE_BASE_URL (default https://1commerce.online)
 */
import type { Config } from "@netlify/functions";

const SAMPLE = [
  {
    origin: "Pioneer Courthouse Square, Portland, OR",
    destination: "Portland International Airport, Portland, OR",
  },
  {
    origin: "Beaverton Transit Center, Beaverton, OR",
    destination: "Pioneer Courthouse Square, Portland, OR",
  },
  {
    origin: "Clackamas Town Center, Clackamas, OR",
    destination: "Downtown Portland, OR",
  },
];

export default async () => {
  const base = (
    process.env.GOLDEN_SMOKE_BASE_URL ||
    process.env.URL ||
    "https://1commerce.online"
  ).replace(/\/+$/, "");

  const results: Array<Record<string, unknown>> = [];

  for (const pair of SAMPLE) {
    const input = encodeURIComponent(
      JSON.stringify({
        "0": {
          json: {
            origin: pair.origin,
            destination: pair.destination,
            preference: "balanced",
            stops: [],
            optimizeStops: true,
          },
        },
      })
    );
    const url = `${base}/api/trpc/routePulse.getRoute?batch=1&input=${input}`;
    const started = Date.now();
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(25_000),
      });
      const ms = Date.now() - started;
      if (!res.ok) {
        results.push({ ...pair, ok: false, status: res.status, ms });
        continue;
      }
      const body = (await res.json()) as unknown;
      const row = Array.isArray(body) ? body[0] : body;
      const data =
        (row as { result?: { data?: { json?: unknown } } })?.result?.data
          ?.json ??
        (row as { result?: { data?: unknown } })?.result?.data;
      const route = (data as { route?: { duration?: number; flow?: { samples?: number }; liveDurationS?: number }; grounding?: unknown })
        ?.route;
      results.push({
        origin: pair.origin.slice(0, 40),
        ok: !!route,
        ms,
        durationS: route?.liveDurationS ?? route?.duration ?? null,
        flowSamples: route?.flow?.samples ?? 0,
        grounding: (data as { grounding?: unknown })?.grounding ?? null,
      });
    } catch (err) {
      results.push({
        ...pair,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    // Soft rate limit between samples
    await new Promise(r => setTimeout(r, 1500));
  }

  const okCount = results.filter(r => r.ok).length;
  console.log("[routepulse-golden-smoke]", { okCount, total: results.length, results });
  return new Response(
    JSON.stringify({ okCount, total: results.length, results }),
    { status: okCount > 0 ? 200 : 500 }
  );
};

export const config: Config = {
  schedule: "0 */6 * * *", // every 6 hours
};
