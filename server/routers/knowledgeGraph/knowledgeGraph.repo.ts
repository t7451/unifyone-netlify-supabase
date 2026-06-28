/**
 * knowledgeGraph.repo.ts — data access for the Knowledge Graph router.
 *
 * Wraps the raw HTTP MCP call to the Graph Cloudflare Worker
 * (ksksrbiz-arch/graph) via its JSON-RPC endpoint at GRAPH_MCP_URL.
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

import { ENV } from "../../_core/env";

let _rpcId = 1;

export async function graphMcpCall(
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
