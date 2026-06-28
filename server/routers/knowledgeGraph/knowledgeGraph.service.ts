/**
 * knowledgeGraph.service.ts — use-cases for the Knowledge Graph router.
 *
 * Resolves the tenant from the authenticated session and orchestrates the
 * Graph Worker MCP tool calls (via the repo layer).
 */

import { TRPCError } from "@trpc/server";
import { graphMcpCall } from "./knowledgeGraph.repo";

export function requireTenantId(ctx: {
  user: { tenantId: number | null };
}): number {
  const tenantId = ctx.user.tenantId;
  if (tenantId == null) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });
  }
  return tenantId;
}

/** Semantic recall / filtered graph query over the knowledge graph. */
export async function queryGraph(
  tenantId: number,
  input: {
    query?: string;
    nodeType?: string;
    label?: string;
    limit?: number;
  }
): Promise<unknown> {
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
      {
        label: input.label,
        type: input.nodeType,
        limit: input.limit ?? 10,
      },
      tenantId
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
  }
}

export async function getStats(tenantId: number): Promise<unknown> {
  try {
    return await graphMcpCall("stats", {}, tenantId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
  }
}

export async function searchNodes(
  tenantId: number,
  input: { query: string; limit?: number }
): Promise<unknown> {
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
}

export async function getBrainActivity(
  tenantId: number,
  input: { limit?: number }
): Promise<unknown> {
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
}

export async function writeNote(
  tenantId: number,
  input: { title?: string; text: string }
): Promise<unknown> {
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
}
