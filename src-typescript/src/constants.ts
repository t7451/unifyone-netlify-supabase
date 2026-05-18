/**
 * src-typescript/src/constants.ts
 *
 * Shared constants for the @unifyone/mcp-server TypeScript SDK.
 * Set ONECOMMERCE_API_URL to override the target platform endpoint.
 */

/** Base URL of the UnifyOne / 1Commerce platform. */
export const API_BASE_URL =
  process.env.ONECOMMERCE_API_URL ?? "https://mcp-p.1commerce.online";

/** MCP JSON-RPC endpoint derived from the base URL. */
export const MCP_ENDPOINT = `${API_BASE_URL}/mcp`;

/** Inbound / outbound API key — read from env at runtime. */
export const MCP_API_KEY = process.env.MCP_API_KEY ?? "";

/** MCP protocol version this SDK targets. */
export const PROTOCOL_VERSION = "2024-11-05" as const;

/** Canonical server name reported in the initialize handshake. */
export const SERVER_NAME = "unifyone-mcp" as const;

/** Server version — kept in sync with netlify/functions/mcp.mjs. */
export const SERVER_VERSION = "2.1.0" as const;
