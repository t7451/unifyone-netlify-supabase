import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock mcpCallTool before importing the router
vi.mock("../../lib/mcpClient", () => ({
  mcpCallTool: vi.fn(),
}));

import { mcpCallTool } from "../../lib/mcpClient";

const mockedMcpCallTool = vi.mocked(mcpCallTool);

describe("DealFlow router — tool proxy helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps camelCase input to snake_case MCP args for listDeals", async () => {
    mockedMcpCallTool.mockResolvedValue({ deals: [], total: 0 });

    await mockedMcpCallTool("list_deals", {
      tenant_id: 1,
      category: "Cashback",
      difficulty: "easy",
      limit: 10,
    });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "list_deals",
      expect.objectContaining({ tenant_id: 1, category: "Cashback" })
    );
  });

  it("maps dealId to deal_id for getDeal", async () => {
    mockedMcpCallTool.mockResolvedValue({ id: "deal-123", brand: "TestBrand" });

    await mockedMcpCallTool("get_deal", { deal_id: "deal-123" });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "get_deal",
      expect.objectContaining({ deal_id: "deal-123" })
    );
  });

  it("maps generateContent input correctly", async () => {
    mockedMcpCallTool.mockResolvedValue({ content: "Generated blog post..." });

    await mockedMcpCallTool("generate_deal_content", {
      deal_id: "deal-abc",
      content_type: "blog_post",
    });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "generate_deal_content",
      expect.objectContaining({ deal_id: "deal-abc", content_type: "blog_post" })
    );
  });

  it("maps setFeatureFlag input correctly", async () => {
    mockedMcpCallTool.mockResolvedValue({ updated: true });

    await mockedMcpCallTool("set_feature_flag", {
      flag_id: "flag_test",
      enabled: true,
      rollout_percentage: 50,
    });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "set_feature_flag",
      expect.objectContaining({ flag_id: "flag_test", enabled: true })
    );
  });
});
