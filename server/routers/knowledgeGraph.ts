/**
 * server/routers/knowledgeGraph.ts
 *
 * tRPC router for Knowledge Graph — proxies to the Graph Cloudflare Worker
 * (ksksrbiz-arch/graph) via its HTTP MCP endpoint at GRAPH_MCP_URL.
 *
 * Graph Worker tools (actual names from src/worker/mcp-server.js):
 *   recall         — semantic vector search
 *   graph-query    — substring/type filter on flat node projection
 *   recent-events  — last N ingest events
 *   stats          — counts by node/edge type
 *   write-note     — persist a free-form note into the graph
 *
 * Tenant isolation: userId from the authenticated session is passed as
 * x-cortex-user-id so the Graph Worker scopes results to the right user.
 */

import { z } from "zod";
import { rateLimitedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { mcpRateLimiter } from "../_core/rateLimiter";
import { ENV } from "../_core/env";

const protectedProcedure = rateLimitedProcedure(mcpRateLimiter, "mcp:kg");

function requireTenantId(ctx: { user: { tenantId: number | null } }): number {
  const tenantId = ctx.user.tenantId;
  if (tenantId == null) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });
  }
  return tenantId;
}

let _rpcId = 1;

async function graphMcpCall(
  toolName: string,
  args: Record<string, unknown>,
  userId: string | number
): Promise<unknown> {
  const url = ENV.graphMcpUrl;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-cortex-user-id": String(userId),
  };
  if (ENV.graphMcpToken) {
    headers["authorization"] = `Bearer ${ENV.graphMcpToken}`;
  }

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: _rpcId++,
    method: "tools/call",
    params: { name: toolName, arguments: args },
  });

  const res = await fetch(url, { method: "POST", headers, body });
  if (!res.ok) {
    throw new Error(`Graph MCP returned ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    result?: { content?: Array<{ type: string; text: string }> };
    error?: { message: string };
  };
  if (json.error) {
    throw new Error(`Graph MCP error: ${json.error.message}`);
  }
  // Unwrap the text content block into a parsed object when possible
  const text = json.result?.content?.[0]?.text ?? "{}";
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

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
      try {
        if (input.query) {
          return await graphMcpCall(
            "recall",
            { query: input.query, topK: input.limit ?? 10 },
            tenantId
          );
        }
        return await graphMcpCall(
          "graph-query",
          { label: input.label, type: input.nodeType, limit: input.limit ?? 10 },
          tenantId
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx);
    try {
      return await graphMcpCall("stats", {}, tenantId);
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
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await graphMcpCall(
          "recall",
          { query: input.query, topK: input.limit ?? 10 },
          tenantId
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getBrainActivity: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await graphMcpCall(
          "recent-events",
          { limit: input.limit ?? 10 },
          tenantId
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
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
      try {
        return await graphMcpCall(
          "write-note",
          { title: input.title, text: input.text },
          tenantId
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
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
    .mutation(async ({ ctx, _input }) => {
      requireTenantId(ctx);
      return { queued: false, message: "Ingest is scheduled automatically by the Graph Worker crons." };
    }),
});
