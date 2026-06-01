# UnifyOne marketing site (Astro 5)

Static-first Astro app for **`marketing.1commerce.online`**. Deploys as a
separate base-directory build on the **`unify0ne`** Netlify project — the main
React SPA at `1commerce.online` is served from the repo root and uses the root
`netlify.toml`.

## Stack

- Astro 5 (static + on-demand routes for `/api/*`) + React islands
- Tailwind CSS 3
- Neon Postgres via Drizzle ORM (waitlist + unsubscribe only)
- `@1commerce/seo` shared workspace package for JSON-LD and sitemap

## Local dev

```bash
cp apps/unifyone/.env.example apps/unifyone/.env
# fill in NEON_DATABASE_URL (or leave blank to skip waitlist locally)

pnpm install                             # from repo root
pnpm --filter unifyone dev               # http://localhost:4321
```

## Routes

| Route                                                                  | Type                     | Notes                                     |
| ---------------------------------------------------------------------- | ------------------------ | ----------------------------------------- |
| `/`, `/pricing`, `/gig-workers`, `/freelancers`, `/developers`, `/smb` | static                   | persona landing pages                     |
| `/blog`, `/blog/[slug]`                                                | static                   | MDX content collection                    |
| `/sign-in`, `/sign-up`                                                 | 302 → `1commerce.online` | redirect-only                             |
| `/sitemap.xml`                                                         | static                   | manual; uses `@1commerce/seo`             |
| `/api/health`                                                          | on-demand                | smoke check; reports build + env presence |
| `/api/waitlist`                                                        | on-demand                | POSTs to `WAITLIST_N8N_WEBHOOK_URL`       |
| `/api/unsubscribe`                                                     | on-demand                | HMAC-verified suppression list write      |

## Go-live checklist (Netlify project `unify0ne`)

1. **Site settings → Build & deploy → Continuous deployment**
   - Repository: `t7451/unifyone-netlify-supabase`
   - Production branch: `main`
   - **Base directory: `apps/unifyone`** ← critical
   - Publish directory: `dist` (relative to base)
   - Build command: leave empty (read from `apps/unifyone/netlify.toml`)

2. **Site settings → Environment variables** — set on _all_ deploy contexts:

   | Var                                | Required    | Purpose                                                                                                              |
   | ---------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
   | `PUBLIC_SITE_URL`                  | yes         | `https://marketing.1commerce.online`                                                                                 |
   | `NEON_DATABASE_URL`                | recommended | OR install the Netlify **Neon** extension; the integration sets `NETLIFY_DATABASE_URL` and our code falls back to it |
   | `WAITLIST_N8N_WEBHOOK_URL`         | optional    | only for `/api/waitlist`                                                                                             |
   | `OUTREACH_SUPPRESSION_HMAC_SECRET` | optional    | only for `/api/unsubscribe`                                                                                          |

3. **Domain settings**
   - Add `marketing.1commerce.online` as a custom domain.
   - Issue HTTPS cert.

4. **Deploy and smoke test**
   - Trigger a fresh deploy.
   - Hit `https://<deploy-preview-url>/api/health` — expect
     `{"status":"ok","db":true,...}`.
   - Hit `/`, `/pricing`, `/blog` — should 200.
   - `/sitemap.xml` — should 200 with valid XML.

## Why deploys may fail/hang

The marketing site shares the repo with the legacy app. When the root
`pnpm-lock.yaml` changes (e.g. legacy app adds/removes a dep), an install
with `--frozen-lockfile` could fail or hang on Netlify's build environment.
We deliberately install with **non-frozen lockfile** + `--filter unifyone...`
to keep the install minimal and resilient to legacy-app churn.

If a deploy hangs >5 minutes, check:

1. Build log for pnpm resolution errors
2. Whether `[build.ignore]` is incorrectly returning 0 (skipping needed builds)
3. Whether the Netlify project has the right base directory set
