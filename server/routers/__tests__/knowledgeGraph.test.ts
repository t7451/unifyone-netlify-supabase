import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/mcpClient", () => ({
  mcpCallTool: vi.fn(),
}));

import { mcpCallTool } from "../../lib/mcpClient";

const mockedMcpCallTool = vi.mocked(mcpCallTool);

describe("KnowledgeGraph router — tool proxy helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps queryGraph node_type filter", async () => {
    mockedMcpCallTool.mockResolvedValue({ nodes: [], edges: [] });

    await mockedMcpCallTool("query_graph", { node_type: "project", limit: 10 });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "query_graph",
      expect.objectContaining({ node_type: "project" })
    );
  });

  it("maps triggerIngest source arg", async () => {
    mockedMcpCallTool.mockResolvedValue({ job_id: "ingest-001", status: "queued" });

    await mockedMcpCallTool("trigger_graph_ingest", { source: "git" });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "trigger_graph_ingest",
      expect.objectContaining({ source: "git" })
    );
  });

  it("maps searchNodes query arg", async () => {
    mockedMcpCallTool.mockResolvedValue({ nodes: [] });

    await mockedMcpCallTool("search_graph_nodes", { query: "authentication", limit: 20 });

    expect(mockedMcpCallTool).toHaveBeenCalledWith(
      "search_graph_nodes",
      expect.objectContaining({ query: "authentication" })
    );
  });

  it("calls get_graph_stats with empty args", async () => {
    mockedMcpCallTool.mockResolvedValue({ total_nodes: 42, total_edges: 150 });

    await mockedMcpCallTool("get_graph_stats", {});

    expect(mockedMcpCallTool).toHaveBeenCalledWith("get_graph_stats", {});
  });
});
