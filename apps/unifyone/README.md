# UnifyOne (Astro)

Static-first Astro app for `1commerce.online`. Deploys to Netlify preview only
(this batch); production at `1commerce.online` still serves the legacy React
SPA from the repo root until a later cutover batch.

## Stack

- Astro 4 (hybrid rendering) + React islands
- Tailwind CSS 3
- Neon Postgres via Drizzle ORM
- Clerk for auth (+ Svix-verified webhook → Neon mirror)
- `@1commerce/seo` shared package (workspace dep) for JSON-LD and meta

## Local dev

```bash
cp apps/unifyone/.env.example apps/unifyone/.env
# fill in NEON_DATABASE_URL, CLERK_* keys, etc.

pnpm install                             # from repo root
pnpm --filter unifyone db:generate       # create drizzle migrations
pnpm --filter unifyone dev               # http://localhost:4321
```

## Bootstrap Neon

```bash
psql "$NEON_DATABASE_URL" -f infra/neon/0001_init.sql
# OR (after drizzle generate):
pnpm --filter unifyone db:push
```

## Deploy

Create a **separate Netlify site** linked to this repo, branch
`claude/unifyone-astro-migration-0VtFB`, with **base directory set to
`apps/unifyone/`** (critical — otherwise the root `netlify.toml` wins and
serves the legacy SPA). Paste env vars from `.env.example`.
