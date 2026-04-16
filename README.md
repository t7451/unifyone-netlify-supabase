# UnifyOne — Platform Integration Guide

UnifyOne is a multi-tenant commerce SaaS platform built by PNW Enterprises / 1Commerce LLC.
This document covers the **MCP (Model Context Protocol)** integration that lets AI assistants
(Claude Desktop, custom agents, etc.) interact with your UnifyOne store data.

---

## Platform Integration

### MCP Server

The UnifyOne MCP server is a stateless JSON-RPC 2.0 endpoint that exposes 20 commerce tools
to any MCP-compatible client.

| Endpoint | Method | Purpose |
|---|---|---|
| `GET /mcp` | GET | Health probe — returns `McpHealthResponse` |
| `POST /mcp` | POST | JSON-RPC 2.0 dispatcher (tools/list, tools/call, initialize) |

### Authentication

Inbound POST requests require a Bearer token when `MCP_API_KEY` is configured:

```http
Authorization: Bearer <MCP_API_KEY>
```

Set `MCP_API_KEY` in your environment (see `.env.example`). Requests without a valid key
receive a `401` response. Leave `MCP_API_KEY` empty to disable auth (local development only).

### Available Tools

All tool names use **snake_case** (the platform's expected convention).

#### Foundation tier

| Tool | Description |
|---|---|
| `list_stores` | List all tenants registered on the platform |
| `get_tenant_info` | Get tenant details by numeric ID |

#### Walls — Products

| Tool | Description |
|---|---|
| `list_products` | List products with optional tenant/limit filters |
| `get_product` | Get a single product by ID |
| `search_products` | Full-text search across product names and descriptions |
| `get_inventory` | Current inventory levels for a tenant |
| `get_low_stock_products` | Products at or below a stock threshold |
| `get_categories` | Product categories for a tenant |
| `get_top_products` | Top-selling products by revenue |

#### Walls — Orders

| Tool | Description |
|---|---|
| `list_orders` | List orders with optional filters |
| `get_order` | Get a single order with its line items |
| `create_order` | Create a new order for a tenant |

#### Walls — Customers

| Tool | Description |
|---|---|
| `list_customers` | List customers for a tenant |
| `get_customer` | Get a customer by ID |

#### Vaults — Analytics

| Tool | Description |
|---|---|
| `get_analytics_summary` | Revenue, order count, and customer summary |
| `get_revenue_by_day` | Daily revenue breakdown |
| `get_webhook_events` | Recent webhook events for a tenant |

#### Spire — Platform & AI

| Tool | Description |
|---|---|
| `get_notifications` | Platform-wide notifications |
| `get_platform_stats` | Aggregated cross-tenant statistics |
| `ask_kai` | Ask Kai, the UnifyOne AI assistant |

---

### Wiring Claude Desktop

Add the following block to your Claude Desktop configuration
(`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "unifyone": {
      "url": "https://1commerce.online/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_MCP_API_KEY>"
      }
    }
  }
}
```

For **local development** (Netlify Dev), use:

```json
{
  "mcpServers": {
    "unifyone-local": {
      "url": "http://localhost:8888/mcp"
    }
  }
}
```

### Wiring the TypeScript SDK (stdio transport)

The `src-typescript/` package provides a fully-typed MCP server over stdio that proxies
all tool calls to your UnifyOne instance.

**Install and build:**

```bash
cd src-typescript
pnpm install
pnpm build
```

**Claude Desktop config (stdio):**

```json
{
  "mcpServers": {
    "unifyone": {
      "command": "node",
      "args": ["/absolute/path/to/src-typescript/dist/index.js"],
      "env": {
        "ONECOMMERCE_API_URL": "https://1commerce.online",
        "MCP_API_KEY": "<YOUR_MCP_API_KEY>"
      }
    }
  }
}
```

### Wiring n8n / Zapier / Custom Agents

Any HTTP client that speaks JSON-RPC 2.0 can call the MCP endpoint directly:

```bash
# List all tools
curl -s -X POST https://1commerce.online/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | jq .

# Call a tool
curl -s -X POST https://1commerce.online/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_stores","arguments":{}}}' | jq .
```

---

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MCP_API_KEY` | Recommended | Inbound auth key for the `/mcp` endpoint |
| `ONECOMMERCE_API_URL` | Optional | Override platform base URL (default: `https://1commerce.online`) |
| `MCP_WORKER_URL` | Optional | Legacy Cloudflare Worker URL override |

---

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (hot reload)
pnpm dev

# Type-check
pnpm check

# Lint
pnpm lint

# Run tests
pnpm test

# Build production bundle
pnpm build
```

See `DEPLOYMENT.md` for full Netlify deployment instructions.
