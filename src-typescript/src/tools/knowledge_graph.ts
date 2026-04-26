/**
 * src-typescript/src/tools/knowledge_graph.ts
 *
 * MCP tool registrations — Knowledge Graph (PKG-VS).
 *
 * Registered tools:
 *   • query_graph           — query the knowledge graph
 *   • get_graph_stats       — aggregated graph statistics
 *   • trigger_graph_ingest  — trigger a data ingestion run
 *   • search_graph_nodes    — full-text search across nodes
 *   • get_brain_activity    — recent Brain layer activity
 *   • get_connector_configs — list configured connectors
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "./utils.js";

export function registerKnowledgeGraphTools(server: McpServer): void {
  server.tool(
    "query_graph",
    "Query the knowledge graph with a Cypher-like filter to find nodes and edges",
    {
      node_type: z.enum(["project", "session", "file", "tool", "model", "commit", "author"]).optional().describe("Filter by node type"),
      label: z.string().optional().describe("Filter by node label"),
      limit: z.number().int().positive().optional().describe("Max results"),
    },
    async (args) => {
      const data = await apiFetch("query_graph", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_graph_stats",
    "Get aggregated statistics about the knowledge graph (node count by type, edge count, last ingested)",
    {},
    async (args) => {
      const data = await apiFetch("get_graph_stats", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "trigger_graph_ingest",
    "Trigger a data ingestion run for a specified connector source",
    {
      source: z.enum(["claude_code", "git", "markdown"]).describe("Connector source to ingest from"),
      config: z.record(z.string(), z.unknown()).optional().describe("Optional ingestion configuration"),
    },
    async (args) => {
      const data = await apiFetch("trigger_graph_ingest", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "search_graph_nodes",
    "Full-text search across knowledge graph node labels and metadata",
    {
      query: z.string().min(1).describe("Search term"),
      node_type: z.string().optional().describe("Filter by node type"),
      limit: z.number().int().positive().optional().describe("Max results"),
    },
    async (args) => {
      const data = await apiFetch("search_graph_nodes", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_brain_activity",
    "Get recent Brain layer activity — spike rates, weight-change rates, and region histograms",
    {
      seconds: z.number().int().positive().optional().describe("Time window in seconds (default: 60)"),
    },
    async (args) => {
      const data = await apiFetch("get_brain_activity", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_connector_configs",
    "List configured data connectors and their OAuth/auth status",
    {},
    async (args) => {
      const data = await apiFetch("get_connector_configs", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
