#!/usr/bin/env tsx

import { fileURLToPath } from "node:url";
import { RESOURCE_DOWNLOADS } from "../server/resourceDownloads";

type FetchLike = typeof fetch;

type SmokeCheck = {
  name: string;
  path: string;
  expect: (response: Response, body: string) => string | null;
  headers?: Record<string, string>;
};

type CheckResult = {
  name: string;
  path: string;
  status: "pass" | "fail" | "skip";
  message: string;
};

type SmokeOptions = {
  baseUrl: string;
  authCookie?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  log?: (message: string) => void;
};

const DEFAULT_BASE_URL = "https://1commerce.online";
const DEFAULT_TIMEOUT_MS = 10_000;

export const PUBLIC_ROUTE_PATHS = [
  "/",
  "/resources",
  "/components",
  "/contact?topic=custom-resources",
  "/integrations",
  "/pricing",
  "/api/health",
] as const;

export const RESOURCE_DOWNLOAD_PATHS = Object.keys(RESOURCE_DOWNLOADS)
  .sort()
  .map(id => `/api/resources/${encodeURIComponent(id)}/download`);

function normalizeBaseUrl(baseUrl: string): URL {
  const parsed = new URL(baseUrl || DEFAULT_BASE_URL);
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed;
}

function buildUrl(baseUrl: URL, path: string): string {
  const pathUrl = new URL(path, baseUrl);
  return pathUrl.toString();
}

function expectOk(response: Response): string | null {
  if (response.status < 200 || response.status >= 400) {
    return `expected 2xx/3xx, got ${response.status}`;
  }
  return null;
}

function expectHtml(response: Response, body: string): string | null {
  const okError = expectOk(response);
  if (okError) return okError;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return `expected HTML content-type, got ${contentType || "missing"}`;
  }

  if (!body.includes("<!DOCTYPE html") && !body.includes("<html")) {
    return "expected HTML body";
  }

  return null;
}

function expectHealth(response: Response, body: string): string | null {
  const okError = expectOk(response);
  if (okError) return okError;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return `expected JSON content-type, got ${contentType || "missing"}`;
  }

  try {
    const parsed = JSON.parse(body) as { status?: unknown };
    const validStatuses = ["healthy", "degraded", "ok"];
    if (!validStatuses.includes(String(parsed.status))) {
      return `expected healthy/degraded/ok status, got ${String(
        parsed.status
      )}`;
    }
  } catch {
    return "expected valid JSON body";
  }

  return null;
}

function expectResourceDownload(
  response: Response,
  body: string
): string | null {
  const okError = expectOk(response);
  if (okError) return okError;

  const disposition = response.headers.get("content-disposition") ?? "";
  if (!disposition.toLowerCase().includes("attachment")) {
    return "expected attachment content-disposition";
  }

  if (body.length <= 20) {
    return "expected non-empty generated resource body";
  }

  return null;
}

function expectAuthenticatedMe(
  response: Response,
  body: string
): string | null {
  const okError = expectOk(response);
  if (okError) return okError;

  try {
    const parsed = JSON.parse(body) as {
      result?: { data?: unknown };
      error?: unknown;
    };
    if (parsed.error) return "auth.me returned a tRPC error";
    if (!parsed.result || parsed.result.data === null) {
      return "auth.me returned no authenticated user";
    }
  } catch {
    return "expected valid tRPC JSON body";
  }

  return null;
}

export function buildPublicSmokeChecks(): SmokeCheck[] {
  const routeChecks = PUBLIC_ROUTE_PATHS.map(path => ({
    name: `public route ${path}`,
    path,
    expect: path === "/api/health" ? expectHealth : expectHtml,
    headers: path === "/api/health" ? { Accept: "application/json" } : {},
  }));

  const downloadChecks = RESOURCE_DOWNLOAD_PATHS.map(path => ({
    name: `resource download ${path}`,
    path,
    expect: expectResourceDownload,
  }));

  return [...routeChecks, ...downloadChecks];
}

export async function runPublicSmoke(
  options: SmokeOptions
): Promise<CheckResult[]> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const log = options.log ?? console.log;
  const checks = buildPublicSmokeChecks();
  const results: CheckResult[] = [];

  log(`Smoke base URL: ${baseUrl.toString()}`);
  log(`Public checks: ${checks.length}`);

  for (const check of checks) {
    const url = buildUrl(baseUrl, check.path);
    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: check.headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await response.text();
      const error = check.expect(response, body);

      if (error) {
        results.push({
          name: check.name,
          path: check.path,
          status: "fail",
          message: error,
        });
        log(`FAIL ${check.path} — ${error}`);
      } else {
        results.push({
          name: check.name,
          path: check.path,
          status: "pass",
          message: `${response.status}`,
        });
        log(`PASS ${check.path} — ${response.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        name: check.name,
        path: check.path,
        status: "fail",
        message,
      });
      log(`FAIL ${check.path} — ${message}`);
    }
  }

  if (!options.authCookie) {
    results.push({
      name: "authenticated route auth.me",
      path: "/api/trpc/auth.me",
      status: "skip",
      message: "set SMOKE_AUTH_COOKIE or SMOKE_COOKIE to enable",
    });
    log("SKIP /api/trpc/auth.me — no auth cookie provided");
    return results;
  }

  try {
    const authPath = "/api/trpc/auth.me";
    const response = await fetchImpl(buildUrl(baseUrl, authPath), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: options.authCookie,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.text();
    const error = expectAuthenticatedMe(response, body);

    if (error) {
      results.push({
        name: "authenticated route auth.me",
        path: authPath,
        status: "fail",
        message: error,
      });
      log(`FAIL ${authPath} — ${error}`);
    } else {
      results.push({
        name: "authenticated route auth.me",
        path: authPath,
        status: "pass",
        message: `${response.status}`,
      });
      log(`PASS ${authPath} — ${response.status}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      name: "authenticated route auth.me",
      path: "/api/trpc/auth.me",
      status: "fail",
      message,
    });
    log(`FAIL /api/trpc/auth.me — ${message}`);
  }

  return results;
}

function authCookieFromEnv(env: NodeJS.ProcessEnv): string | undefined {
  return env.SMOKE_AUTH_COOKIE || env.SMOKE_COOKIE || env.SMOKE_SESSION_COOKIE;
}

async function main() {
  const results = await runPublicSmoke({
    baseUrl: process.env.SMOKE_BASE_URL ?? DEFAULT_BASE_URL,
    authCookie: authCookieFromEnv(process.env),
    timeoutMs: Number(process.env.SMOKE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
  });
  const failed = results.filter(result => result.status === "fail");
  const skipped = results.filter(result => result.status === "skip");

  console.log(
    `Smoke complete: ${results.length - failed.length - skipped.length} passed, ` +
      `${failed.length} failed, ${skipped.length} skipped`
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  void main();
}
