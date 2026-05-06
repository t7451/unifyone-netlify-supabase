# 1commerce-nlweb — Cloudflare Worker

AI chat worker for UnifyOne / 1Commerce, deployed at:

> https://1commerce-nlweb.skdev-371.workers.dev

It exposes a small HTTP API backed by [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/).

## Endpoints

| Method | Path      | Description                      |
| ------ | --------- | -------------------------------- |
| GET    | `/`       | Service info                     |
| GET    | `/health` | Liveness probe (`{ ok: true }`)  |
| POST   | `/chat`   | AI chat. Streams SSE by default. |

### `POST /chat` body

```json
{
  "message": "What can UnifyOne do?",
  "model": "@cf/meta/llama-3.1-8b-instruct",
  "stream": true
}
```

Or pass a full message history:

```json
{
  "messages": [
    { "role": "system", "content": "You are helpful." },
    { "role": "user", "content": "Hi!" }
  ]
}
```

## Local development

```bash
cd services/cloudflare-worker
pnpm install
pnpm dev          # wrangler dev
```

## Deploy

Authenticate once with `wrangler login`, then:

```bash
pnpm deploy       # wrangler deploy
```

The worker name is `1commerce-nlweb` (see `wrangler.toml`), which produces the
`1commerce-nlweb.<account>.workers.dev` URL.

## Configuration

- `wrangler.toml` declares the `AI` Workers AI binding and non-secret `vars`.
- Secrets (e.g. third-party API keys) are set with `wrangler secret put NAME`.
- `ALLOWED_ORIGINS` is a comma-separated CORS allow-list.
