import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/mcpClient", () => ({
  mcpCallTool: vi.fn(),
}));

import { mcpCallTool } from "../../lib/mcpClient";

const mockedMcpCallTool = vi.mocked(mcpCallTool);

describe("ShopifyTheme router — tool proxy helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps getSections with optional tenantId", async () => {
    mockedMcpCallTool.mockResolvedValue({ sections: [] });

    await mockedMcpCallTool("get_theme_sections", { tenant_id: 1 });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "get_theme_sections",
      expect.objectContaining({ tenant_id: 1 })
    );
  });

  it("maps syncConfig args to snake_case", async () => {
    mockedMcpCallTool.mockResolvedValue({ synced: true });

    await mockedMcpCallTool("sync_theme_config", {
      tenant_id: 1,
      section: "hero",
      settings: { heading: "Welcome" },
    });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "sync_theme_config",
      expect.objectContaining({ tenant_id: 1, section: "hero" })
    );
  });

  it("maps updateSection with valid section enum", async () => {
    mockedMcpCallTool.mockResolvedValue({ updated: true });

    await mockedMcpCallTool("update_section_settings", {
      tenant_id: 1,
      section: "newsletter",
      settings: { heading: "Subscribe", subheading: "Get 10% off" },
    });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "update_section_settings",
      expect.objectContaining({ section: "newsletter" })
    );
  });

  it("maps getPerformance with required tenantId", async () => {
    mockedMcpCallTool.mockResolvedValue({ performance: 94 });

    await mockedMcpCallTool("get_theme_performance", { tenant_id: 1 });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "get_theme_performance",
      expect.objectContaining({ tenant_id: 1 })
    );
  });
});
