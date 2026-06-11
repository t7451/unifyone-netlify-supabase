import { describe, expect, it, vi, beforeEach } from "vitest";

const mcpCallToolMock = vi.hoisted(() => vi.fn());
vi.mock("./mcpClient", () => ({
  mcpCallTool: mcpCallToolMock,
}));

import { runSandboxedCode } from "./codeSandbox";

const user = { id: 7, tenantId: 44 };

describe("codeSandbox", () => {
  beforeEach(() => {
    mcpCallToolMock.mockReset();
  });

  it("evaluates plain JS and returns the final expression", async () => {
    const out = await runSandboxedCode({
      code: "const a = [1,2,3]; a.map(x => x * 2).reduce((s, x) => s + x, 0)",
      user,
    });
    expect(out.ok).toBe(true);
    expect(out.result).toBe(12);
  });

  it("captures console output", async () => {
    const out = await runSandboxedCode({
      code: 'console.log("hello", { n: 1 }); console.warn("careful"); 42',
      user,
    });
    expect(out.ok).toBe(true);
    expect(out.logs[0]).toBe('hello {"n":1}');
    expect(out.logs[1]).toBe("[warn] careful");
  });

  it("exposes the input global", async () => {
    const out = await runSandboxedCode({
      code: "input.values.filter(v => v > 10)",
      user,
      input: { values: [5, 15, 25] },
    });
    expect(out.ok).toBe(true);
    expect(out.result).toEqual([15, 25]);
  });

  it("returns runtime errors without throwing", async () => {
    const out = await runSandboxedCode({
      code: "nope.missing.deep",
      user,
    });
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/not defined/i);
  });

  it("enforces the wall-clock timeout on infinite loops", async () => {
    const out = await runSandboxedCode({
      code: "while (true) {}",
      user,
      timeoutMs: 300,
    });
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/interrupt/i);
  }, 10_000);

  it("calls MCP tools synchronously with forced tenant injection", async () => {
    mcpCallToolMock.mockResolvedValue({ products: [{ name: "Widget" }] });
    const out = await runSandboxedCode({
      code: `
        const data = callTool("list_products", { limit: 5, tenantId: "999" });
        data.products.map(p => p.name)
      `,
      user,
    });
    expect(out.ok).toBe(true);
    expect(out.result).toEqual(["Widget"]);
    // VM-supplied tenantId 999 must be overwritten with the real tenant.
    expect(mcpCallToolMock).toHaveBeenCalledWith("list_products", {
      limit: 5,
      tenantId: "44",
    });
    expect(out.toolCalls).toEqual([
      expect.objectContaining({ name: "list_products", ok: true }),
    ]);
  });

  it("surfaces tool failures as catchable VM errors", async () => {
    mcpCallToolMock.mockRejectedValue(new Error("tool exploded"));
    const out = await runSandboxedCode({
      code: `
        let message = "no error";
        try { callTool("list_orders", {}); } catch (e) { message = e.message; }
        message
      `,
      user,
    });
    expect(out.ok).toBe(true);
    expect(out.result).toContain("tool exploded");
  });

  it("blocks tool access when allowTools is false", async () => {
    const out = await runSandboxedCode({
      code: 'typeof callTool === "undefined" ? "blocked" : "exposed"',
      user,
      allowTools: false,
    });
    expect(out.ok).toBe(true);
    expect(out.result).toBe("blocked");
  });

  it("enforces the tool call budget", async () => {
    mcpCallToolMock.mockResolvedValue({});
    const out = await runSandboxedCode({
      code: `
        let count = 0;
        try {
          for (let i = 0; i < 10; i++) { callTool("get_tenant_info", {}); count++; }
        } catch (e) {}
        count
      `,
      user,
      maxToolCalls: 3,
    });
    expect(out.ok).toBe(true);
    expect(out.result).toBe(3);
  });

  it("has no host escape hatches", async () => {
    const out = await runSandboxedCode({
      code: `[typeof process, typeof require, typeof fetch, typeof globalThis.Deno]`,
      user,
    });
    expect(out.ok).toBe(true);
    expect(out.result).toEqual([
      "undefined",
      "undefined",
      "undefined",
      "undefined",
    ]);
  });
});
