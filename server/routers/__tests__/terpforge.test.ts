import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/mcpClient", () => ({
  mcpCallTool: vi.fn(),
}));

import { mcpCallTool } from "../../lib/mcpClient";

const mockedMcpCallTool = vi.mocked(mcpCallTool);

describe("TerpForge router — tool proxy helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps listCompounds with profile filter", async () => {
    mockedMcpCallTool.mockResolvedValue({ compounds: [], total: 0 });

    await mockedMcpCallTool("list_compounds", { profile: "FOCUS", limit: 5 });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "list_compounds",
      expect.objectContaining({ profile: "FOCUS", limit: 5 })
    );
  });

  it("maps simulatePurity snake_case args", async () => {
    mockedMcpCallTool.mockResolvedValue({ tier: "Premium", pass: true });

    await mockedMcpCallTool("simulate_compound_purity", {
      compound_slug: "limonene",
      purity_percentage: 90,
    });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "simulate_compound_purity",
      expect.objectContaining({ compound_slug: "limonene", purity_percentage: 90 })
    );
  });

  it("maps compareProfiles with compound_slugs array", async () => {
    mockedMcpCallTool.mockResolvedValue({ compounds: [] });

    await mockedMcpCallTool("compare_terpene_profiles", {
      compound_slugs: ["limonene", "linalool"],
    });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "compare_terpene_profiles",
      expect.objectContaining({ compound_slugs: ["limonene", "linalool"] })
    );
  });
});
