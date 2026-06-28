/**
 * server/routers/knowledgeGraph/index.ts
 *
 * tRPC router for Knowledge Graph — proxies to the Graph Cloudflare Worker
 * (ksksrbiz-arch/graph) via its HTTP MCP endpoint at GRAPH_MCP_URL.
 *
 * Transport layer: procedures, zod schemas, middleware. Use-cases live in
 * knowledgeGraph.service.ts; raw MCP data access lives in
 * knowledgeGraph.repo.ts.
 */

import { z } from "zod";
import { rateLimitedProcedure, router } from "../../_core/trpc";
import { mcpRateLimiter } from "../../_core/rateLimiter";
import {
  getBrainActivity,
  getStats,
  queryGraph,
  requireTenantId,
  searchNodes,
  writeNote,
} from "./knowledgeGraph.service";

const protectedProcedure = rateLimitedProcedure(mcpRateLimiter, "mcp:kg");

export const knowledgeGraphRouter = router({
  // Semantic recall over the knowledge graph via vector embeddings
  queryGraph: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        nodeType: z.string().optional(),
        label: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return queryGraph(tenantId, input);
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx);
    return getStats(tenantId);
  }),

  searchNodes: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return searchNodes(tenantId, input);
    }),

  getBrainActivity: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return getBrainActivity(tenantId, input);
    }),

  writeNote: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        text: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return writeNote(tenantId, input);
    }),

  // Retained for backward compatibility — returns empty connector list
  getConnectors: protectedProcedure.query(async ({ ctx }) => {
    requireTenantId(ctx);
    return { connectors: [] };
  }),

  // Stub: ingest triggers are initiated server-side via cron in the Graph Worker
  triggerIngest: protectedProcedure
    .input(
      z.object({
        source: z.enum(["claude_code", "git", "markdown"]),
        config: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx }) => {
      requireTenantId(ctx);
      return {
        queued: false,
        message: "Ingest is scheduled automatically by the Graph Worker crons.",
      };
    }),
});
