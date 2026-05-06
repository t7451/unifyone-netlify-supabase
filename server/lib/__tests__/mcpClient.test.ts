import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mcpCallTool,
  normalizeMcpToolArguments,
  normalizeMcpToolName,
} from "../mcpClient";

describe("mcpClient compatibility", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes legacy camelCase tool names to snake_case", () => {
    expect(normalizeMcpToolName("listProducts")).toBe("list_products");
    expect(normalizeMcpToolName("getAnalyticsSummary")).toBe(
      "get_analytics_summary"
    );
    expect(normalizeMcpToolName("list_deals")).toBe("list_deals");
  });

  it("normalizes top-level argument names and authoritative tenant_id", () => {
    expect(
      normalizeMcpToolArguments(
        {
          tenantId: "client-tenant",
          tenant_id: "other-client-tenant",
          productId: 123,
          asset_type: "sprite",
          skipMe: undefined,
        },
        { authoritativeTenantId: "ctx-tenant" }
      )
    ).toEqual({
      product_id: 123,
      asset_type: "sprite",
      tenant_id: "ctx-tenant",
    });
  });

  it("sends normalized tool calls over JSON-RPC", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          result: { content: [{ type: "text", text: '{"ok":true}' }] },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      mcpCallTool("getProduct", { productId: 123, tenantId: 9 })
    ).resolves.toEqual({ ok: true });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.params).toEqual({
      name: "get_product",
      arguments: { product_id: 123, tenant_id: 9 },
    });
  });
});
