import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mcpCallTool,
  normalizeMcpToolArguments,
  normalizeMcpToolName,
} from "../mcpClient";

describe("mcpClient compatibility", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.MCP_API_KEY;
    delete process.env.ONECOMMERCE_API_KEY;
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

  it("prefers MCP_API_KEY for the Authorization bearer token", async () => {
    // The in-repo `/mcp` Netlify function authenticates against MCP_API_KEY, so
    // when both are present the client must send MCP_API_KEY, not the legacy
    // ONECOMMERCE_API_KEY used by the old external worker.
    process.env.MCP_API_KEY = "mcp-secret";
    process.env.ONECOMMERCE_API_KEY = "legacy-secret";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          result: { content: [{ type: "text", text: "{}" }] },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await mcpCallTool("list_deals", { tenantId: 9 });

    const headers = fetchMock.mock.calls[0][1].headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe("Bearer mcp-secret");
  });
});
