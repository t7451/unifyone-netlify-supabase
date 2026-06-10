# UnifyOne

**UnifyOne** is an AI-powered, multi-tenant commerce platform built for PNW Enterprises / 1Commerce LLC. It lets you manage stores, orders, customers, and analytics across multiple tenants — all from a single unified dashboard, with built-in AI automation via Claude.

This repository contains:

- **Root app** — the production React + Express application
- **`apps/unifyone/`** — an Astro-based marketing and content site (next iteration)
- **`packages/seo/`** — shared SEO utilities consumed by the Astro app
- **`src-typescript/`** — source for [`@t7451/mcp-server`](./src-typescript/README.md), our published MCP (Model Context Protocol) server that surfaces UnifyOne data to Claude Desktop, n8n, and other AI agents

## Repository layout

| Path              | Purpose                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/`               | **Production app** — React 19 + Vite frontend, Express + tRPC API, Drizzle ORM schema, and Vitest test suite                |
| `/apps/unifyone`  | **Marketing site** — Astro app for the public-facing marketing and content experience                                       |
| `/packages/seo`   | **SEO utilities** — shared meta-tag and sitemap helpers used by the Astro app                                               |
| `/infra/neon`     | **Database bootstrap** — Neon (serverless Postgres) setup SQL and migration notes                                           |
| `/netlify`        | **Serverless functions** — Netlify function entrypoints and deployment configuration                                        |
| `/src-typescript` | **MCP server** — source for the [`@t7451/mcp-server`](./src-typescript/README.md) npm package, published to GitHub Packages |

## Prerequisites

- **Node.js 22+**
- **pnpm 10** (managed via Corepack)

Enable Corepack and verify pnpm is available:

```bash
corepack enable
corepack pnpm --version
```

## Getting started

### 1. Install dependencies

```bash
corepack pnpm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

**Required variables** for the root app:

| Variable         | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| `JWT_SECRET`     | Signs and verifies session tokens (minimum 32 characters) |
| `DATABASE_URL`   | PostgreSQL connection string for Drizzle ORM              |
| `PUBLIC_APP_URL` | Canonical URL used in auth redirects, payments, and SEO   |

**Optional variables** (add as needed):

- `SUPABASE_URL` / `SUPABASE_SECRET_KEY` — Supabase credit-metering + Stripe billing layer (see `docs/DATABASE_ARCHITECTURE.md`)
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — enable realtime features via Supabase (legacy `VITE_SUPABASE_ANON_KEY` also accepted)
- Payment provider keys — `STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_ID`, `SQUARE_ACCESS_TOKEN`, `SHOPIFY_*`
- `MCP_API_KEY` — protects the `/mcp` endpoint with bearer-token authentication

If you are also working on the Astro marketing site:

```bash
cp apps/unifyone/.env.example apps/unifyone/.env
```

That app additionally requires `NEON_DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, and `PUBLIC_CLERK_PUBLISHABLE_KEY`.

## Local development

### Root app (React + Express)

Start the development server with hot reload:

```bash
corepack pnpm dev
```

The Express API server starts at `http://localhost:3000` and the Vite frontend is served on the same port via proxy.

Other useful commands:

| Command               | What it does                       |
| --------------------- | ---------------------------------- |
| `corepack pnpm check` | Run TypeScript type checking       |
| `corepack pnpm lint`  | Lint all `.ts` / `.tsx` files      |
| `corepack pnpm test`  | Run the Vitest test suite          |
| `corepack pnpm build` | Build the frontend + server bundle |

### Astro marketing site

```bash
corepack pnpm --filter unifyone dev    # start dev server
corepack pnpm --filter unifyone build  # production build
```

- Astro-specific details: `apps/unifyone/README.md`
- Database bootstrap steps: `infra/neon/README.md`

## Deployment and operations docs

- `DEPLOYMENT.md`
- `DEPLOYMENT_INSTRUCTIONS.md`
- `AUTHENTICATION.md`
- `PRODUCTION_CHECKLIST.md`
- `PRODUCTION_HARDENING.md`

## MCP integration

**MCP (Model Context Protocol)** is an open standard that lets AI assistants like Claude interact with external data sources through a structured tool interface. UnifyOne exposes an MCP server so that Claude Desktop, n8n workflows, and custom agents can query your stores, orders, customers, and analytics in real time.

### Endpoints

| Endpoint    | Method | Purpose                                      |
| ----------- | ------ | -------------------------------------------- |
| `GET /mcp`  | GET    | Health probe — confirm the server is running |
| `POST /mcp` | POST   | JSON-RPC 2.0 dispatcher — invoke MCP tools   |

### Authentication

When `MCP_API_KEY` is set, include it as a bearer token on every request:

```http
Authorization: Bearer <MCP_API_KEY>
```

### Available tool groups

| Group           | Tools                                                               |
| --------------- | ------------------------------------------------------------------- |
| **Foundation**  | `list_stores`, `get_tenant_info`                                    |
| **Products**    | `list_products`, `get_product`, `search_products`, `get_inventory`  |
| **Orders**      | `list_orders`, `get_order`, `create_order`                          |
| **Customers**   | `list_customers`, `get_customer`                                    |
| **Analytics**   | `get_analytics_summary`, `get_revenue_by_day`, `get_webhook_events` |
| **Platform/AI** | `get_notifications`, `get_platform_stats`, `ask_kai`                |

### Connect Claude Desktop (remote server)

Add the following to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "unifyone": {
      "url": "https://mcp-p.1commerce.online/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_MCP_API_KEY>"
      }
    }
  }
}
```

### Connect Claude Desktop (local server)

```json
{
  "mcpServers": {
    "unifyone-local": {
      "url": "http://localhost:8888/mcp"
    }
  }
}
```

### TypeScript stdio server — `@t7451/mcp-server`

The `src-typescript/` package is published to GitHub Packages as
[`@t7451/mcp-server`](./src-typescript/README.md). It runs a Model Context
Protocol server over stdio — useful for local development, testing, and embedding
in agents that prefer a stdio transport over the hosted `/mcp` endpoint.

Point your `@t7451` scope at GitHub Packages (one-time, in `~/.npmrc`):

```ini
@t7451:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install:

```bash
pnpm add @t7451/mcp-server
```

Add it to Claude Desktop:

```json
{
  "mcpServers": {
    "unifyone": {
      "command": "node",
      "args": ["./node_modules/@t7451/mcp-server/dist/index.js"],
      "env": {
        "ONECOMMERCE_API_URL": "https://mcp-p.1commerce.online",
        "MCP_API_KEY": "<YOUR_MCP_API_KEY>"
      }
    }
  }
}
```

See [`src-typescript/README.md`](./src-typescript/README.md) for the full setup,
local-development instructions, and a tag/release workflow that publishes new
versions automatically.

### Test with cURL

```bash
curl -s -X POST https://mcp-p.1commerce.online/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Publishing `@t7451/mcp-server`

A new version of the MCP server is published to GitHub Packages whenever a tag
matching `mcp-server-v*` is pushed. The workflow lives at
[`.github/workflows/publish-mcp-server.yml`](./.github/workflows/publish-mcp-server.yml).

To cut a release:

```bash
# 1. Bump the version in src-typescript/package.json
# 2. Commit and push to main
# 3. Tag and push:
git tag mcp-server-v1.0.0
git push origin mcp-server-v1.0.0
```

The workflow runs `tsc`, builds the package, and runs `npm publish` against
`https://npm.pkg.github.com` using the repo's built-in `GITHUB_TOKEN` — no
additional secrets required.

## License

[MIT](./LICENSE) — Copyright (c) 2025 1Commerce LLC / PNW Enterprises.
