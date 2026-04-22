# UnifyOne

UnifyOne is a multi-tenant commerce platform for PNW Enterprises / 1Commerce LLC.
This repository currently contains:

- the legacy React + Express application at the repo root
- an Astro workspace app in `apps/unifyone/` for the next site iteration
- shared SEO utilities in `packages/seo/`
- MCP tooling that exposes UnifyOne data to Claude Desktop, n8n, and other agents

## Repository layout

| Path              | Purpose                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------- |
| `/`               | Legacy production app: React 19 + Vite frontend, Express + tRPC backend, Drizzle schema |
| `/apps/unifyone`  | Astro app for the newer marketing / content experience                                  |
| `/packages/seo`   | Shared SEO helpers used by the Astro app                                                |
| `/infra/neon`     | Neon bootstrap SQL and setup notes                                                      |
| `/netlify`        | Netlify function entrypoints and deployment wiring                                      |
| `/src-typescript` | TypeScript MCP server package                                                           |

## Prerequisites

- Node.js 22+
- Corepack enabled
- pnpm 10

```bash
corepack enable
corepack pnpm --version
```

## Getting started

### 1. Install dependencies

```bash
cd /home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase
corepack pnpm install
```

### 2. Configure environment variables

For the legacy app:

```bash
cp /home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase/.env.example /home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase/.env
```

Minimum values to run the root app locally:

| Variable         | Why it matters                                     |
| ---------------- | -------------------------------------------------- |
| `JWT_SECRET`     | Signs session JWTs; must be at least 32 characters |
| `DATABASE_URL`   | Enables Drizzle / server data access               |
| `PUBLIC_APP_URL` | Canonical app URL, used in auth, payments, and SEO |

Optional but common:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` for realtime features
- payment provider keys for Stripe, PayPal, Square, and Shopify
- `MCP_API_KEY` for authenticated `/mcp` access

If you are working on the Astro app too:

```bash
cp /home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase/apps/unifyone/.env.example /home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase/apps/unifyone/.env
```

That app expects values such as `NEON_DATABASE_URL`, `CLERK_SECRET_KEY`,
`CLERK_WEBHOOK_SECRET`, and `PUBLIC_CLERK_PUBLISHABLE_KEY`.

## Local development

### Legacy root app

```bash
cd /home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase
corepack pnpm dev
```

The Express server defaults to `http://localhost:3000`.

Useful root-level commands:

```bash
corepack pnpm check
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

### Astro workspace app

```bash
cd /home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase
corepack pnpm --filter unifyone dev
corepack pnpm --filter unifyone build
```

See `/home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase/apps/unifyone/README.md`
for Astro-specific details and
`/home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase/infra/neon/README.md`
for Neon bootstrap steps.

## Deployment and operations docs

- `/home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase/DEPLOYMENT.md`
- `/home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase/DEPLOYMENT_INSTRUCTIONS.md`
- `/home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase/AUTHENTICATION.md`
- `/home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase/PRODUCTION_CHECKLIST.md`
- `/home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase/PRODUCTION_HARDENING.md`

## MCP integration

The platform exposes an MCP server for Claude Desktop, custom agents, and workflow tools.

### Endpoints

| Endpoint    | Method | Purpose                     |
| ----------- | ------ | --------------------------- |
| `GET /mcp`  | GET    | Health probe                |
| `POST /mcp` | POST   | JSON-RPC 2.0 MCP dispatcher |

### Authentication

When `MCP_API_KEY` is configured, send it as a bearer token:

```http
Authorization: Bearer <MCP_API_KEY>
```

### Core MCP tool groups

- Foundation: `list_stores`, `get_tenant_info`
- Products: `list_products`, `get_product`, `search_products`, `get_inventory`
- Orders: `list_orders`, `get_order`, `create_order`
- Customers: `list_customers`, `get_customer`
- Analytics: `get_analytics_summary`, `get_revenue_by_day`, `get_webhook_events`
- Platform / AI: `get_notifications`, `get_platform_stats`, `ask_kai`

### Claude Desktop (remote MCP)

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

### Claude Desktop (local MCP)

```json
{
  "mcpServers": {
    "unifyone-local": {
      "url": "http://localhost:8888/mcp"
    }
  }
}
```

### TypeScript SDK

The package in `src-typescript/` exposes a typed MCP server over stdio:

```bash
cd /home/runner/work/unifyone-netlify-supabase/unifyone-netlify-supabase/src-typescript
corepack pnpm install
corepack pnpm build
```

Example Claude Desktop config:

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

### Raw JSON-RPC usage

```bash
curl -s -X POST https://1commerce.online/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```
