/**
 * server/routers/knowledgeGraph.ts
 *
 * tRPC router for Knowledge Graph — personal knowledge graph system.
 * All procedures are protected (require auth) and proxy to the MCP tool layer.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { mcpCallTool } from "../lib/mcpClient";

export const knowledgeGraphRouter = router({
  queryGraph: protectedProcedure
    .input(
      z.object({
        nodeType: z
          .enum(["project", "session", "file", "tool", "model", "commit", "author"])
          .optional(),
        label: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("query_graph", {
          node_type: input.nodeType,
          label: input.label,
          limit: input.limit,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getStats: protectedProcedure.query(async () => {
    try {
      return await mcpCallTool("get_graph_stats", {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
    }
  }),

  triggerIngest: protectedProcedure
    .input(
      z.object({
        source: z.enum(["claude_code", "git", "markdown"]),
        config: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await mcpCallTool("trigger_graph_ingest", {
          source: input.source,
          config: input.config,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  searchNodes: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        nodeType: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("search_graph_nodes", {
          query: input.query,
          node_type: input.nodeType,
          limit: input.limit,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getBrainActivity: protectedProcedure
    .input(z.object({ seconds: z.number().int().positive().optional() }))
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("get_brain_activity", { seconds: input.seconds });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getConnectors: protectedProcedure.query(async () => {
    try {
      return await mcpCallTool("get_connector_configs", {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
    }
  }),
});
