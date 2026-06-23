/**
 * Minimal, best-effort Google Trends client (no API key, no dependency).
 *
 * Google Trends has no official API; this hits the same unofficial endpoints
 * the website uses. They are rate-limited and can change without notice, so
 * every network failure degrades gracefully to `null` — callers must treat
 * trends data as optional enrichment, never a hard dependency.
 *
 * Flow: /explore returns widgets (each with a token + request payload); the
 * RELATED_QUERIES widget's token is then used against /relatedsearches.
 * Responses are prefixed with `)]}',` which must be stripped before JSON.parse.
 */

const BASE = "https://trends.google.com/trends/api";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { exp: number; data: RelatedQueries | null }>();

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

export type RankedQuery = { query: string; value: number };
export type RelatedQueries = { top: RankedQuery[]; rising: RankedQuery[] };

/** Strip the `)]}',` XSSI prefix Google prepends, then JSON.parse. */
export function stripJsonPrefix(text: string): unknown {
  const idx = text.indexOf("{");
  const arrIdx = text.indexOf("[");
  const start =
    idx === -1 ? arrIdx : arrIdx === -1 ? idx : Math.min(idx, arrIdx);
  if (start === -1) throw new Error("no json found");
  return JSON.parse(text.slice(start));
}

type ExploreWidget = {
  id?: string;
  token?: string;
  request?: unknown;
};

/** Find the RELATED_QUERIES widget's token + request in an /explore response. */
export function parseExploreForRelatedQueries(
  exploreJson: unknown
): { token: string; request: unknown } | null {
  const widgets = (exploreJson as { widgets?: ExploreWidget[] })?.widgets;
  if (!Array.isArray(widgets)) return null;
  const w = widgets.find(
    x => x?.id === "RELATED_QUERIES" && x.token && x.request
  );
  if (!w?.token || w.request == null) return null;
  return { token: w.token, request: w.request };
}

type RankedList = {
  rankedKeyword?: Array<{ query?: string; value?: number }>;
};

/** Parse a /relatedsearches response into top + rising ranked queries. */
export function parseRelatedSearches(json: unknown): RelatedQueries {
  const lists = (json as { default?: { rankedList?: RankedList[] } })?.default
    ?.rankedList;
  const toQueries = (list?: RankedList): RankedQuery[] =>
    (list?.rankedKeyword ?? [])
      .filter(k => typeof k.query === "string")
      .map(k => ({ query: k.query as string, value: Number(k.value ?? 0) }));
  return {
    top: toQueries(lists?.[0]),
    rising: toQueries(lists?.[1]),
  };
}

/**
 * Fetch top + rising related queries for a term. Returns null on any failure
 * (rate-limited, network error, parse error, no widget). Cached for 6h.
 */
export async function fetchRelatedQueries(
  term: string,
  geo = ""
): Promise<RelatedQueries | null> {
  const key = `${geo}:${term.toLowerCase().trim()}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.data;

  let data: RelatedQueries | null = null;
  try {
    const exploreReq = {
      comparisonItem: [{ keyword: term, geo, time: "today 12-m" }],
      category: 0,
      property: "",
    };
    const exploreUrl = `${BASE}/explore?hl=en-US&tz=0&req=${encodeURIComponent(
      JSON.stringify(exploreReq)
    )}`;
    const exploreRes = await fetch(exploreUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (exploreRes.ok) {
      const widget = parseExploreForRelatedQueries(
        stripJsonPrefix(await exploreRes.text())
      );
      if (widget) {
        const dataUrl = `${BASE}/widgetdata/relatedsearches?hl=en-US&tz=0&req=${encodeURIComponent(
          JSON.stringify(widget.request)
        )}&token=${encodeURIComponent(widget.token)}`;
        const dataRes = await fetch(dataUrl, {
          headers: BROWSER_HEADERS,
          signal: AbortSignal.timeout(8000),
        });
        if (dataRes.ok) {
          data = parseRelatedSearches(stripJsonPrefix(await dataRes.text()));
        }
      }
    }
  } catch {
    data = null;
  }

  cache.set(key, { exp: Date.now() + CACHE_TTL_MS, data });
  return data;
}
