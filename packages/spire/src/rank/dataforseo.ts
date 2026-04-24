// Thin DataForSEO client for the weekly rank cron. One function:
// `checkRanks()` — takes a list of tracked keywords, returns rank/url/features
// per keyword. Batches within DataForSEO's 100-task limit per request.
// Never caches; every call is fresh.

import { logger } from "../lib/logger.js";

export type RankCheckInput = {
  trackedKeywordId: string;
  keyword: string;
  targetUrl: string;
  locationCode: number;
  languageCode: string;
};

export type RankCheckResult = {
  trackedKeywordId: string;
  rank: number | null; // null when target not in top 100
  urlFound: string | null;
  serpFeatures: Record<string, boolean>; // { featured_snippet: true, ai_overview: false, ... }
};

export type DataForSeoClient = {
  checkRanks(inputs: RankCheckInput[]): Promise<RankCheckResult[]>;
};

export function createDataForSeoClient(options: {
  login: string;
  password: string;
  /** Override for testing. Defaults to the live API. */
  baseUrl?: string;
  /** Per-request fetch timeout (ms). DataForSEO's "live/advanced" endpoint can
   *  take 15-30s; 60s gives headroom. */
  timeoutMs?: number;
}): DataForSeoClient {
  const baseUrl = options.baseUrl ?? "https://api.dataforseo.com";
  const timeoutMs = options.timeoutMs ?? 60_000;
  const authHeader =
    "Basic " +
    Buffer.from(`${options.login}:${options.password}`).toString("base64");

  async function postTasks(
    tasks: RankCheckInput[]
  ): Promise<RankCheckResult[]> {
    // DataForSEO's "live" endpoint accepts up to 100 tasks per call; the
    // response shape is one top-level .tasks[] aligned 1:1 with the input.
    const body = tasks.map(t => ({
      keyword: t.keyword,
      location_code: t.locationCode,
      language_code: t.languageCode,
      device: "desktop",
      os: "windows",
      depth: 100, // top 100 organic results
    }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/v3/serp/google/organic/live/advanced`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          authorization: authHeader,
        },
        body: JSON.stringify(body),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`DataForSEO HTTP ${res.status}: ${text.slice(0, 500)}`);
    }

    const json = (await res.json()) as DataForSeoResponse;
    if (json.status_code !== 20000) {
      throw new Error(
        `DataForSEO API status ${json.status_code}: ${json.status_message}`
      );
    }

    const results: RankCheckResult[] = [];
    for (let i = 0; i < tasks.length; i += 1) {
      const task = tasks[i]!;
      const taskResponse = json.tasks?.[i];

      if (!taskResponse || taskResponse.status_code !== 20000) {
        logger.warn(
          {
            trackedKeywordId: task.trackedKeywordId,
            keyword: task.keyword,
            status: taskResponse?.status_code,
            message: taskResponse?.status_message,
          },
          "DataForSEO task error — recording null rank"
        );
        results.push({
          trackedKeywordId: task.trackedKeywordId,
          rank: null,
          urlFound: null,
          serpFeatures: {},
        });
        continue;
      }

      const items = taskResponse.result?.[0]?.items ?? [];
      // Find the first organic item whose URL matches target (partial match:
      // target_url may be a path like "/gig-workers" and the ranked URL is
      // the absolute form). We compare on pathname so domain case and
      // trailing slashes don't trip us up.
      const targetPath = extractPath(task.targetUrl);
      let rank: number | null = null;
      let urlFound: string | null = null;
      const features: Record<string, boolean> = {};

      for (const item of items) {
        if (item.type === "featured_snippet") features.featured_snippet = true;
        if (item.type === "ai_overview") features.ai_overview = true;
        if (item.type === "people_also_ask") features.people_also_ask = true;
        if (item.type !== "organic") continue;
        if (!item.url) continue;
        const itemPath = extractPath(item.url);
        if (itemPath === targetPath && rank === null) {
          rank = item.rank_absolute ?? item.rank_group ?? null;
          urlFound = item.url;
        }
      }

      results.push({
        trackedKeywordId: task.trackedKeywordId,
        rank,
        urlFound,
        serpFeatures: features,
      });
    }
    return results;
  }

  async function checkRanks(
    inputs: RankCheckInput[]
  ): Promise<RankCheckResult[]> {
    if (inputs.length === 0) return [];
    const out: RankCheckResult[] = [];
    // DataForSEO's per-call task cap is 100; stay well under to leave room
    // for other concurrent jobs in the account.
    const BATCH = 50;
    for (let i = 0; i < inputs.length; i += BATCH) {
      const batch = inputs.slice(i, i + BATCH);
      const batchResults = await postTasks(batch);
      out.push(...batchResults);
    }
    return out;
  }

  return { checkRanks };
}

function extractPath(url: string): string {
  try {
    const u = new URL(url, "https://placeholder.invalid");
    return u.pathname.replace(/\/$/, "");
  } catch {
    // Relative path; normalize trailing slash.
    return url.replace(/\/$/, "");
  }
}

// --- Response types (minimal; only what we read) ---
type DataForSeoResponse = {
  status_code: number;
  status_message?: string;
  tasks?: Array<DataForSeoTask>;
};

type DataForSeoTask = {
  status_code: number;
  status_message?: string;
  result?: Array<{
    items?: Array<DataForSeoSerpItem>;
  }>;
};

type DataForSeoSerpItem = {
  type: string; // "organic" | "featured_snippet" | "ai_overview" | ...
  url?: string;
  rank_group?: number;
  rank_absolute?: number;
};
