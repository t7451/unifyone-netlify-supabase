import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/mcpClient", () => ({
  mcpCallTool: vi.fn(),
}));

import { mcpCallTool } from "../../lib/mcpClient";

const mockedMcpCallTool = vi.mocked(mcpCallTool);

describe("PixelForge router — tool proxy helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps listAssets with asset_type filter", async () => {
    mockedMcpCallTool.mockResolvedValue({ assets: [], total: 0 });

    await mockedMcpCallTool("list_pixel_assets", {
      tenant_id: 1,
      asset_type: "sprite",
      limit: 20,
    });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "list_pixel_assets",
      expect.objectContaining({ asset_type: "sprite" })
    );
  });

  it("maps createAsset args to snake_case", async () => {
    mockedMcpCallTool.mockResolvedValue({ id: "pf-001" });

    await mockedMcpCallTool("create_pixel_asset", {
      tenant_id: 1,
      name: "My Sprite",
      width: 16,
      height: 16,
      asset_type: "sprite",
    });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "create_pixel_asset",
      expect.objectContaining({ name: "My Sprite", width: 16, height: 16 })
    );
  });

  it("maps exportSpriteSheet with optional scale", async () => {
    mockedMcpCallTool.mockResolvedValue({ png_base64: "", frame_count: 4 });

    await mockedMcpCallTool("export_sprite_sheet", {
      asset_id: "pf-001",
      columns: 4,
      scale: 2,
    });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "export_sprite_sheet",
      expect.objectContaining({ asset_id: "pf-001", scale: 2 })
    );
  });
});
