/**
 * src-typescript/src/index.ts
 *
 * Entry point for the @unifyone/mcp-server standalone TypeScript SDK.
 *
 * Creates and starts an MCP server over stdio that proxies all tool calls
 * to the UnifyOne platform at API_BASE_URL.
 *
 * Usage:
 *   npx tsx src/index.ts           # development
 *   node dist/index.js             # production (after `pnpm build`)
 *
 * Claude Desktop config example:
 *   {
 *     "mcpServers": {
 *       "unifyone": {
 *         "command": "node",
 *         "args": ["/path/to/src-typescript/dist/index.js"],
 *         "env": {
 *           "ONECOMMERCE_API_URL": "https://1commerce.online",
 *           "MCP_API_KEY": "<your-key>"
 *         }
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_NAME, SERVER_VERSION, PROTOCOL_VERSION } from "./constants.js";
import { registerAllTools } from "./tools/index.js";

async function main(): Promise<void> {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: { listChanged: false } } }
  );

  registerAllTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with the stdio JSON-RPC stream
  console.error(`[${SERVER_NAME}] v${SERVER_VERSION} started (protocol ${PROTOCOL_VERSION})`);
}

main().catch((err) => {
  console.error("[unifyone-mcp] Fatal error:", err);
  process.exit(1);
});
