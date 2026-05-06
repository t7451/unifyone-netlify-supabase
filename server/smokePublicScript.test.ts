import { describe, expect, it } from "vitest";
import {
  buildPublicSmokeChecks,
  PUBLIC_ROUTE_PATHS,
  RESOURCE_DOWNLOAD_PATHS,
  runPublicSmoke,
} from "../scripts/smoke-public";
import { RESOURCE_DOWNLOADS } from "./resourceDownloads";

function responseFor(url: string): Response {
  const parsed = new URL(url);

  if (parsed.pathname === "/api/health") {
    return Response.json({ status: "healthy" });
  }

  if (parsed.pathname === "/api/trpc/auth.me") {
    return Response.json({
      result: { data: { id: 1, email: "user@example.com" } },
    });
  }

  if (parsed.pathname.startsWith("/api/resources/")) {
    return new Response("generated resource body for smoke testing", {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": 'attachment; filename="resource.md"',
      },
    });
  }

  return new Response("<!DOCTYPE html><html><body>ok</body></html>", {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

describe("public smoke script", () => {
  it("includes required public pages and all resource downloads", () => {
    const paths = buildPublicSmokeChecks().map(check => check.path);

    expect(paths).toEqual(expect.arrayContaining([...PUBLIC_ROUTE_PATHS]));
    expect(RESOURCE_DOWNLOAD_PATHS).toHaveLength(
      Object.keys(RESOURCE_DOWNLOADS).length
    );
    expect(paths).toEqual(expect.arrayContaining(RESOURCE_DOWNLOAD_PATHS));
  });

  it("passes deterministic public checks and skips auth without a cookie", async () => {
    const results = await runPublicSmoke({
      baseUrl: "https://example.test",
      fetchImpl: async input => responseFor(String(input)),
      log: () => undefined,
    });

    expect(results.filter(result => result.status === "fail")).toEqual([]);
    expect(results).toContainEqual(
      expect.objectContaining({
        path: "/api/trpc/auth.me",
        status: "skip",
      })
    );
  });

  it("checks auth.me when a cookie is provided without logging the cookie", async () => {
    const messages: string[] = [];
    const results = await runPublicSmoke({
      baseUrl: "https://example.test",
      authCookie: "session=secret-cookie-value",
      fetchImpl: async input => responseFor(String(input)),
      log: message => messages.push(message),
    });

    expect(results.filter(result => result.status === "fail")).toEqual([]);
    expect(results).toContainEqual(
      expect.objectContaining({
        path: "/api/trpc/auth.me",
        status: "pass",
      })
    );
    expect(messages.join("\n")).not.toContain("secret-cookie-value");
  });

  it("marks failed public checks as failures", async () => {
    const results = await runPublicSmoke({
      baseUrl: "https://example.test",
      fetchImpl: async input => {
        const parsed = new URL(String(input));
        if (parsed.pathname === "/pricing") {
          return new Response("not found", { status: 404 });
        }
        return responseFor(String(input));
      },
      log: () => undefined,
    });

    expect(results).toContainEqual(
      expect.objectContaining({
        path: "/pricing",
        status: "fail",
      })
    );
  });
});
