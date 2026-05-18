import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  getAllTenants: vi.fn(),
  getProducts: vi.fn(),
  getProductById: vi.fn(),
  getOrders: vi.fn(),
  getOrderWithItems: vi.fn(),
  getCustomers: vi.fn(),
  getCustomerById: vi.fn(),
  getInventory: vi.fn(),
  getLowStockProducts: vi.fn(),
  getAnalyticsSummary: vi.fn(),
  getRevenueByDay: vi.fn(),
  getTopProducts: vi.fn(),
  getWebhookEvents: vi.fn(),
  getCategories: vi.fn(),
  createOrder: vi.fn(),
  getDb: vi.fn(),
}));
const invokeLLMMock = vi.hoisted(() => vi.fn());

vi.mock("../../server/db.js", () => dbMock);
vi.mock("../../server/_core/llm.js", () => ({
  invokeLLM: invokeLLMMock,
}));

const { default: handler } = await import("../../netlify/functions/mcp.mjs");

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const response = await handler(
    new Request("https://example.com/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      }),
    })
  );
  return response.json();
}

describe("Netlify MCP dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MCP_API_KEY = "";
    dbMock.getAllTenants.mockResolvedValue([{ id: 7 }, { id: 8 }]);
    dbMock.getProducts.mockResolvedValue([]);
    dbMock.getProductById.mockResolvedValue({ id: 44 });
    dbMock.getOrders.mockResolvedValue([]);
    dbMock.getOrderWithItems.mockResolvedValue({ id: 55, items: [] });
    dbMock.getCustomers.mockResolvedValue([]);
    dbMock.getCustomerById.mockResolvedValue({ id: 66 });
    dbMock.getLowStockProducts.mockResolvedValue([
      { inv: { quantity: 2 } },
      { inv: { quantity: 6 } },
    ]);
    dbMock.getAnalyticsSummary.mockResolvedValue({
      totalRevenue: 1,
      orderCount: 2,
      customerCount: 3,
      productCount: 4,
    });
    invokeLLMMock.mockResolvedValue({
      model: "gemini-2.5-flash",
      choices: [
        {
          message: { content: "Kai says hello" },
        },
      ],
    });
  });

  it("passes tenant IDs and option objects to tenant-scoped list tools", async () => {
    await callTool("list_products", { tenant_id: 7, limit: 3 });
    await callTool("list_orders", { tenant_id: "7", limit: 4 });
    await callTool("list_customers", { tenant_id: 7, limit: 5 });

    expect(dbMock.getProducts).toHaveBeenCalledWith(7, { limit: 3 });
    expect(dbMock.getOrders).toHaveBeenCalledWith(7, { limit: 4 });
    expect(dbMock.getCustomers).toHaveBeenCalledWith(7, { limit: 5 });
  });

  it("rejects missing or invalid tenant IDs as MCP tool errors", async () => {
    const missing = await callTool("list_products", { limit: 3 });
    const invalid = await callTool("get_product", {
      product_id: 44,
      tenant_id: "not-a-number",
    });

    expect(missing.result.isError).toBe(true);
    expect(missing.result.content[0].text).toContain("tenant_id");
    expect(invalid.result.isError).toBe(true);
    expect(invalid.result.content[0].text).toContain("tenant_id");
    expect(dbMock.getProductById).not.toHaveBeenCalled();
  });

  it("passes ID and tenant ID to single-record helpers", async () => {
    await callTool("get_product", { product_id: 44, tenant_id: 7 });
    await callTool("get_order", { order_id: 55, tenant_id: 7 });
    await callTool("get_customer", { customer_id: 66, tenant_id: 7 });

    expect(dbMock.getProductById).toHaveBeenCalledWith(44, 7);
    expect(dbMock.getOrderWithItems).toHaveBeenCalledWith(55, 7);
    expect(dbMock.getCustomerById).toHaveBeenCalledWith(66, 7);
  });

  it("uses tenant IDs, days, and limits for analytics helpers", async () => {
    await callTool("get_analytics_summary", { tenant_id: 7, days: 14 });
    await callTool("get_revenue_by_day", { tenant_id: 7, days: 14 });
    await callTool("get_top_products", { tenant_id: 7, limit: 2 });
    await callTool("get_webhook_events", { tenant_id: 7, limit: 9 });

    expect(dbMock.getAnalyticsSummary).toHaveBeenCalledWith(7, 14);
    expect(dbMock.getRevenueByDay).toHaveBeenCalledWith(7, 14);
    expect(dbMock.getTopProducts).toHaveBeenCalledWith(7, 2);
    expect(dbMock.getWebhookEvents).toHaveBeenCalledWith(7, 9);
  });

  it("does not query platform stats with a fake tenant ID", async () => {
    await callTool("get_platform_stats");

    expect(dbMock.getAnalyticsSummary).toHaveBeenCalledWith(7, 30);
    expect(dbMock.getAnalyticsSummary).toHaveBeenCalledWith(8, 30);
    expect(dbMock.getAnalyticsSummary).not.toHaveBeenCalledWith(0, 30);
    expect(dbMock.getAnalyticsSummary).not.toHaveBeenCalledWith(undefined, 30);
  });

  it("routes ask_kai to the LLM-backed Kai responder", async () => {
    const body = await callTool("ask_kai", {
      question: "How do I grow revenue?",
      context: { tenant_id: 7, page: "dashboard" },
    });

    expect(body.result.isError).toBeUndefined();
    const payload = JSON.parse(body.result.content[0].text);
    expect(payload).toMatchObject({
      answer: "Kai says hello",
      model: "gemini-2.5-flash",
    });
    expect(invokeLLMMock).toHaveBeenCalledWith(
      expect.objectContaining({
        maxTokens: 1024,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("How do I grow revenue?"),
          }),
        ]),
      })
    );
  });

  it("keeps GET health, initialize, tools/list, and ping compatible", async () => {
    const health = await handler(new Request("https://example.com/mcp"));
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual(
      expect.objectContaining({ status: "ok" })
    );

    for (const method of ["initialize", "tools/list", "ping"]) {
      const response = await handler(
        new Request("https://example.com/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: method, method }),
        })
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.error).toBeUndefined();
    }
  });

  describe("camelCase alias dispatch (18 tools)", () => {
    it("advertises all 18 camelCase aliases in tools/list", async () => {
      const response = await handler(
        new Request("https://example.com/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
          }),
        })
      );
      const body = await response.json();
      const toolNames = new Set(body.result.tools.map((t: any) => t.name));
      const aliases = [
        "listStores",
        "getTenantInfo",
        "listProducts",
        "getProduct",
        "searchProducts",
        "listOrders",
        "getOrder",
        "listCustomers",
        "getCustomer",
        "getInventory",
        "getLowStockProducts",
        "getAnalyticsSummary",
        "getRevenueByDay",
        "getTopProducts",
        "getWebhookEvents",
        "getCategories",
        "getNotifications",
        "getPlatformStats",
      ];
      for (const alias of aliases) expect(toolNames.has(alias)).toBe(true);
      expect(body.result.tools.length).toBe(69);
    });

    it("listStores delegates to getAllTenants and respects limit", async () => {
      await callTool("listStores", { limit: 1 });
      expect(dbMock.getAllTenants).toHaveBeenCalled();
    });

    it("getTenantInfo normalizes tenantId → tenant_id", async () => {
      const getTenantById = vi.fn().mockResolvedValue({ id: 7 });
      (dbMock as any).getTenantById = getTenantById;
      await callTool("getTenantInfo", { tenantId: 7 });
      expect(getTenantById).toHaveBeenCalledWith(7);
    });

    it("listProducts normalizes tenantId → tenant_id", async () => {
      await callTool("listProducts", { tenantId: 7, limit: 3 });
      expect(dbMock.getProducts).toHaveBeenCalledWith(7, { limit: 3 });
    });

    it("getProduct normalizes productId and tenantId", async () => {
      await callTool("getProduct", { productId: 44, tenantId: 7 });
      expect(dbMock.getProductById).toHaveBeenCalledWith(44, 7);
    });

    it("searchProducts delegates to getProducts with search", async () => {
      dbMock.getProducts.mockResolvedValueOnce([
        { name: "Widget", description: "" },
      ]);
      await callTool("searchProducts", { query: "Widget", tenantId: 7 });
      expect(dbMock.getProducts).toHaveBeenCalledWith(7, { search: "Widget" });
    });

    it("listOrders normalizes tenantId → tenant_id", async () => {
      await callTool("listOrders", { tenantId: 7, limit: 4 });
      expect(dbMock.getOrders).toHaveBeenCalledWith(7, { limit: 4 });
    });

    it("getOrder normalizes orderId and tenantId", async () => {
      await callTool("getOrder", { orderId: 55, tenantId: 7 });
      expect(dbMock.getOrderWithItems).toHaveBeenCalledWith(55, 7);
    });

    it("listCustomers normalizes tenantId → tenant_id", async () => {
      await callTool("listCustomers", { tenantId: 7, limit: 5 });
      expect(dbMock.getCustomers).toHaveBeenCalledWith(7, { limit: 5 });
    });

    it("getCustomer normalizes customerId and tenantId", async () => {
      await callTool("getCustomer", { customerId: 66, tenantId: 7 });
      expect(dbMock.getCustomerById).toHaveBeenCalledWith(66, 7);
    });

    it("getInventory normalizes tenantId → tenant_id", async () => {
      await callTool("getInventory", { tenantId: 7 });
      expect(dbMock.getInventory).toHaveBeenCalledWith(7, undefined);
    });

    it("getLowStockProducts normalizes tenantId and filters by threshold", async () => {
      const body = await callTool("getLowStockProducts", {
        tenantId: 7,
        threshold: 5,
      });
      expect(dbMock.getLowStockProducts).toHaveBeenCalledWith(7);
      const filtered = JSON.parse(body.result.content[0].text);
      expect(filtered).toEqual([{ inv: { quantity: 2 } }]);
    });

    it("getAnalyticsSummary normalizes tenantId and days", async () => {
      await callTool("getAnalyticsSummary", { tenantId: 7, days: 14 });
      expect(dbMock.getAnalyticsSummary).toHaveBeenCalledWith(7, 14);
    });

    it("getRevenueByDay normalizes tenantId and days", async () => {
      await callTool("getRevenueByDay", { tenantId: 7, days: 14 });
      expect(dbMock.getRevenueByDay).toHaveBeenCalledWith(7, 14);
    });

    it("getTopProducts normalizes tenantId and limit", async () => {
      await callTool("getTopProducts", { tenantId: 7, limit: 2 });
      expect(dbMock.getTopProducts).toHaveBeenCalledWith(7, 2);
    });

    it("getWebhookEvents normalizes tenantId and limit", async () => {
      await callTool("getWebhookEvents", { tenantId: 7, limit: 9 });
      expect(dbMock.getWebhookEvents).toHaveBeenCalledWith(7, 9);
    });

    it("getCategories normalizes tenantId → tenant_id", async () => {
      await callTool("getCategories", { tenantId: 7 });
      expect(dbMock.getCategories).toHaveBeenCalledWith(7);
    });

    it("getNotifications returns an empty list when DB is unavailable", async () => {
      dbMock.getDb.mockResolvedValueOnce(null);
      const body = await callTool("getNotifications", { limit: 3 });
      expect(body.result.isError).toBeUndefined();
      expect(JSON.parse(body.result.content[0].text)).toEqual([]);
    });

    it("getPlatformStats aggregates getAnalyticsSummary per tenant", async () => {
      const body = await callTool("getPlatformStats");
      expect(body.result.isError).toBeUndefined();
      expect(dbMock.getAnalyticsSummary).toHaveBeenCalledWith(7, 30);
      expect(dbMock.getAnalyticsSummary).toHaveBeenCalledWith(8, 30);
      const payload = JSON.parse(body.result.content[0].text);
      expect(payload).toMatchObject({ tenant_count: 2 });
    });
  });
});
