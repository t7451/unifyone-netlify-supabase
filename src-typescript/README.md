# @t7451/mcp-server

> UnifyOne MCP Server — a TypeScript SDK that exposes UnifyOne / 1Commerce
> stores, products, orders, customers, and analytics to Claude Desktop, n8n,
> and any other [Model Context Protocol](https://modelcontextprotocol.io/)
> client.

The package runs an MCP server over **stdio** and proxies every tool call to
the UnifyOne platform's `/mcp` JSON-RPC endpoint.

## Installation

This package is published to **GitHub Packages**, so consumers need to point
the `@t7451` scope at the GitHub registry (one-time setup).

Add an `.npmrc` at the project root or in your home directory:

```ini
@t7451:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` needs the `read:packages` scope. Then:

```bash
npm install @t7451/mcp-server
# or
pnpm add @t7451/mcp-server
```

## Configuration

The server is configured purely through environment variables:

| Variable              | Required | Default                    | Purpose                                                                                                    |
| --------------------- | -------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `ONECOMMERCE_API_URL` | no       | `https://1commerce.online` | Base URL of the UnifyOne platform to proxy calls to.                                                       |
| `MCP_API_KEY`         | yes\*    | _(empty)_                  | Bearer token presented to the platform's `/mcp` endpoint. Required when the upstream server enforces auth. |

## Usage with Claude Desktop

Add an entry to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "unifyone": {
      "command": "node",
      "args": ["./node_modules/@t7451/mcp-server/dist/index.js"],
      "env": {
        "ONECOMMERCE_API_URL": "https://1commerce.online",
        "MCP_API_KEY": "<your-mcp-key>"
      }
    }
  }
}
```

Replace `./node_modules/...` with an absolute path if you are not invoking
Claude Desktop from the project root.

## Available tools

The server registers tool groups for stores, products, orders, customers,
analytics, and platform/AI utilities. The full, current list is exposed via
the standard MCP `tools/list` method — invoke it from any MCP client to see
what is available against your tenant.

## Local development

```bash
pnpm install
pnpm dev          # tsx src/index.ts (stdio server)
pnpm build        # emit dist/ via tsc
pnpm typecheck
```

## License

MIT — see [LICENSE](./LICENSE).
