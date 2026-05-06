#!/usr/bin/env tsx

import { fileURLToPath } from "node:url";

type FetchLike = typeof fetch;

type HealthProbeOptions = {
  targets: string[];
  attempts: number;
  timeoutMs?: number;
  strict?: boolean;
  fetchImpl?: FetchLike;
  log?: (message: string) => void;
};

export type HealthProbeResult = {
  target: string;
  attempt: number;
  status: "pass" | "fail";
  httpStatus?: number;
  appStatus?: string;
  latencyMs?: number;
  message: string;
};

const DEFAULT_TARGET = "https://1commerce.online/api/health";
const DEFAULT_ATTEMPTS = 5;
const DEFAULT_TIMEOUT_MS = 10_000;
const NON_STRICT_OK_STATUSES = new Set(["healthy", "ok", "degraded"]);
const STRICT_OK_STATUSES = new Set(["healthy", "ok"]);

function normalizeHealthUrl(target: string): string {
  const url = new URL(target || DEFAULT_TARGET);
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/api/health";
  }
  url.search = "";
  url.hash = "";
  return url.toString();
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? "");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseTargets(env: NodeJS.ProcessEnv): string[] {
  const raw = env.HEALTH_URLS || env.HEALTH_BASE_URL || DEFAULT_TARGET;
  return raw
    .split(",")
    .map(target => target.trim())
    .filter(Boolean)
    .map(normalizeHealthUrl);
}

function parseStatus(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { status?: unknown };
    return typeof parsed.status === "string" ? parsed.status : null;
  } catch {
    return null;
  }
}

function validateStatus(appStatus: string | null, strict: boolean) {
  if (!appStatus) return "expected JSON body with string status";

  const okStatuses = strict ? STRICT_OK_STATUSES : NON_STRICT_OK_STATUSES;
  if (!okStatuses.has(appStatus)) {
    return strict
      ? `expected healthy/ok status, got ${appStatus}`
      : `expected healthy/degraded/ok status, got ${appStatus}`;
  }

  return null;
}

export async function runHealthProbe(
  options: HealthProbeOptions
): Promise<HealthProbeResult[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const log = options.log ?? console.log;
  const strict = options.strict ?? false;
  const results: HealthProbeResult[] = [];

  for (const target of options.targets.map(normalizeHealthUrl)) {
    log(`Health target: ${target}`);

    for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
      const startedAt = Date.now();

      try {
        const response = await fetchImpl(target, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
        });
        const body = await response.text();
        const latencyMs = Date.now() - startedAt;
        const appStatus = parseStatus(body) ?? undefined;

        const statusError =
          response.status < 200 || response.status >= 400
            ? `expected 2xx/3xx, got ${response.status}`
            : validateStatus(appStatus ?? null, strict);

        if (statusError) {
          results.push({
            target,
            attempt,
            status: "fail",
            httpStatus: response.status,
            appStatus,
            latencyMs,
            message: statusError,
          });
          log(
            `FAIL ${target} #${attempt} - HTTP ${response.status} app=${appStatus ?? "unknown"} ${latencyMs}ms - ${statusError}`
          );
        } else {
          results.push({
            target,
            attempt,
            status: "pass",
            httpStatus: response.status,
            appStatus,
            latencyMs,
            message: `${response.status}`,
          });
          log(
            `PASS ${target} #${attempt} - HTTP ${response.status} app=${appStatus} ${latencyMs}ms`
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({
          target,
          attempt,
          status: "fail",
          message,
        });
        log(`FAIL ${target} #${attempt} - ${message}`);
      }
    }
  }

  return results;
}

async function main() {
  const results = await runHealthProbe({
    targets: parseTargets(process.env),
    attempts: parsePositiveInteger(
      process.env.HEALTH_ATTEMPTS,
      DEFAULT_ATTEMPTS
    ),
    timeoutMs: parsePositiveInteger(
      process.env.HEALTH_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS
    ),
    strict: process.env.HEALTH_STRICT === "true",
  });
  const failed = results.filter(result => result.status === "fail");

  console.log(
    `Health probe complete: ${results.length - failed.length} passed, ${failed.length} failed`
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  void main();
}
