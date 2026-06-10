# OAuth Reference

## Auth architecture at a glance

- **Primary auth** is custom JWT + Drizzle on **Neon** — email/password,
  Google OAuth, and Auth0 all issue UnifyOne session cookies. See
  `AUTHENTICATION.md` and `server/_core/customAuth.ts`.
- **Supabase OAuth stays active in parallel** for external OAuth flows and
  specific integrations (external clients, MCP tools, specific login
  providers). Supabase is **no longer the main authentication provider**.
- Supabase access tokens can still be exchanged for an app session via
  `POST /api/auth/supabase-session` (`server/_core/oauth.ts`). Tokens signed
  with asymmetric keys (new Supabase projects) are verified against the
  project JWKS; legacy HS256 tokens are verified with `SUPABASE_JWT_SECRET`.

## Supabase OAuth endpoints

**Project ref:** `shohkfceyjdhepfrysga`

| Purpose                     | URL                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Authorization (OAuth login) | `https://shohkfceyjdhepfrysga.supabase.co/auth/v1/oauth/authorize`                                               |
| Token exchange              | `https://shohkfceyjdhepfrysga.supabase.co/auth/v1/oauth/token`                                                   |
| JWKS (for JWT verification) | `https://shohkfceyjdhepfrysga.supabase.co/auth/v1/.well-known/jwks.json`                                         |
| OpenID configuration        | `https://shohkfceyjdhepfrysga.supabase.co/auth/v1/.well-known/openid-configuration`                              |
| App's consent screen        | `http://localhost:3000/oauth/consent` (and production equivalent, e.g. `https://1commerce.online/oauth/consent`) |

The `/oauth/consent` route is where users see the consent screen when an
external app tries to connect via OAuth.

The server derives the JWKS URL from `SUPABASE_URL` automatically
(`server/_core/oauth.ts`), so no extra env var is needed for verification.

## Environment variables

Set these in Netlify (and `.env` locally). Values live in the Supabase
dashboard → Settings → API keys — never commit real keys.

```bash
SUPABASE_URL=https://shohkfceyjdhepfrysga.supabase.co
VITE_SUPABASE_URL=https://shohkfceyjdhepfrysga.supabase.co

# New key format
SUPABASE_PUBLISHABLE_KEY=sb_publishable_…   # browser-safe
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
SUPABASE_SECRET_KEY=sb_secret_…             # server-only, never expose

# Legacy fallbacks (older projects only): SUPABASE_ANON_KEY,
# VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
```

## Which flow uses what

| Flow                                          | Provider                            | Code                                           |
| --------------------------------------------- | ----------------------------------- | ---------------------------------------------- |
| Email/password signup & signin                | Custom JWT (Neon)                   | `server/_core/customAuth.ts`                   |
| Google sign-in                                | Custom (Google OAuth → app session) | `server/_core/googleOAuth*` routes             |
| Auth0 sign-in                                 | Custom (Auth0 PKCE → app session)   | `/api/auth/auth0/*`                            |
| External clients / MCP tools / parallel OAuth | Supabase OAuth                      | endpoints above + `/api/auth/supabase-session` |
| Clerk / Firebase fallbacks                    | Optional                            | `/api/auth/clerk`, `/api/auth/firebase`        |

See `docs/DATABASE_ARCHITECTURE.md` for the broader Neon vs Supabase split.
