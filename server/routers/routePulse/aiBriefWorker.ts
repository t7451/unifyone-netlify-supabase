/**
 * Thin client for the routepulse-ai-brief Cloudflare Worker
 * (see workers/routepulse-ai-brief). Drafts the one-line explanation for
 * *clear* routes only — the case that currently gets a hardcoded string
 * because it doesn't earn a call to the paid scoring model.
 *
 * This is deliberately low-stakes and fails silently to null on anything
 * short of a clean 200: unset env vars, network errors, timeout, or a
 * worker-side soft-failure (`{ summary: null }`). The caller
 * (routePulse.service.ts) must keep the static-string fallback for every
 * one of those cases — never let a missing/slow free-tier worker degrade
 * the response.
 */

import { ENV } from "../../_core/env";

const TIMEOUT_MS = 2500;

export async function getClearRouteBrief(input: {
  distanceMi: number;
  durationMin: number;
  roadNames: string[];
}): Promise<string | null> {
  const url = ENV.routepulseAiBriefUrl;
  if (!url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/brief`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(ENV.routepulseAiBriefSecret
          ? { authorization: `Bearer ${ENV.routepulseAiBriefSecret}` }
          : {}),
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[routePulse] ai-brief worker HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { summary?: string | null };
    return body.summary && body.summary.trim().length > 0
      ? body.summary.trim()
      : null;
  } catch (err) {
    // Timeout, DNS failure, worker cold-start hiccup — all the same
    // outcome from the caller's perspective: no enrichment this time.
    console.warn("[routePulse] ai-brief worker unreachable:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
