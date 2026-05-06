import { describe, expect, it } from "vitest";
import { runHealthProbe } from "../scripts/probe-health";

function jsonHealth(status: string, httpStatus = 200): Response {
  return Response.json({ status }, { status: httpStatus });
}

describe("health probe script", () => {
  it("passes repeated healthy checks", async () => {
    const results = await runHealthProbe({
      targets: ["https://example.test"],
      attempts: 3,
      fetchImpl: async () => jsonHealth("healthy"),
      log: () => undefined,
    });

    expect(results).toHaveLength(3);
    expect(results.every(result => result.status === "pass")).toBe(true);
    expect(results.every(result => result.target.endsWith("/api/health"))).toBe(
      true
    );
  });

  it("allows degraded responses outside strict mode", async () => {
    const results = await runHealthProbe({
      targets: ["https://example.test/api/health"],
      attempts: 1,
      fetchImpl: async () => jsonHealth("degraded"),
      log: () => undefined,
    });

    expect(results[0]).toEqual(
      expect.objectContaining({ status: "pass", appStatus: "degraded" })
    );
  });

  it("fails degraded responses in strict mode", async () => {
    const results = await runHealthProbe({
      targets: ["https://example.test/api/health"],
      attempts: 1,
      strict: true,
      fetchImpl: async () => jsonHealth("degraded"),
      log: () => undefined,
    });

    expect(results[0]).toEqual(
      expect.objectContaining({ status: "fail", appStatus: "degraded" })
    );
  });

  it("fails non-2xx responses", async () => {
    const results = await runHealthProbe({
      targets: ["https://example.test/api/health"],
      attempts: 1,
      fetchImpl: async () => jsonHealth("ok", 503),
      log: () => undefined,
    });

    expect(results[0]).toEqual(
      expect.objectContaining({ status: "fail", httpStatus: 503 })
    );
  });
});
