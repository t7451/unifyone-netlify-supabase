/**
 * src-typescript/src/tools/index.ts
 *
 * Re-exports all tool registration functions and a convenience
 * `registerAllTools` helper that wires every tool onto a McpServer instance.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerStoreTools } from "./stores.js";
import { registerProductTools } from "./products.js";
import { registerOrderTools } from "./orders.js";
import { registerCustomerTools } from "./customers.js";
import { registerAnalyticsTools } from "./analytics.js";
import { registerPlatformTools } from "./platform.js";
import { registerDealflowTools } from "./dealflow.js";
import { registerShopifyThemeTools } from "./shopify_theme.js";
import { registerTerpforgeTools } from "./terpforge.js";
import { registerKnowledgeGraphTools } from "./knowledge_graph.js";
import { registerPixelforgeTools } from "./pixelforge.js";

export { registerStoreTools } from "./stores.js";
export { registerProductTools } from "./products.js";
export { registerOrderTools } from "./orders.js";
export { registerCustomerTools } from "./customers.js";
export { registerAnalyticsTools } from "./analytics.js";
export { registerPlatformTools } from "./platform.js";
export { registerDealflowTools } from "./dealflow.js";
export { registerShopifyThemeTools } from "./shopify_theme.js";
export { registerTerpforgeTools } from "./terpforge.js";
export { registerKnowledgeGraphTools } from "./knowledge_graph.js";
export { registerPixelforgeTools } from "./pixelforge.js";
export { apiFetch } from "./utils.js";

/** Register every UnifyOne MCP tool on the provided server instance. */
export function registerAllTools(server: McpServer): void {
  registerStoreTools(server);
  registerProductTools(server);
  registerOrderTools(server);
  registerCustomerTools(server);
  registerAnalyticsTools(server);
  registerPlatformTools(server);
  registerDealflowTools(server);
  registerShopifyThemeTools(server);
  registerTerpforgeTools(server);
  registerKnowledgeGraphTools(server);
  registerPixelforgeTools(server);
}
