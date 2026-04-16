/**
 * src-typescript/src/tools/utils.ts
 *
 * Shared fetch helper for all tool registration modules.
 * Calls the UnifyOne MCP endpoint with JSON-RPC 2.0 and returns parsed data.
 */

import { API_BASE_URL, MCP_API_KEY } from "../constants.js";

export async function apiFetch(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (MCP_API_KEY) headers["Authorization"] = `Bearer ${MCP_API_KEY}`;

  const res = await fetch(`${API_BASE_URL}/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status} calling tool "${toolName}"`);

  const json = (await res.json()) as { result?: { content?: Array<{ text: string }> } };
  const text = json.result?.content?.[0]?.text ?? "{}";
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Tool "${toolName}" returned non-JSON response: ${text.slice(0, 200)}`);
  }
}
