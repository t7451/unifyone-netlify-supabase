# Social Connect & Publish — Implementation Plan

> Status: **scoped, not yet built.** v1 target platforms: **Bluesky + Mastodon**
> (chosen because neither requires an app-review gate, so we can prove the full
> connect → publish → schedule pipeline end-to-end before taking on the
> review-gated networks).

## 1. Why this doc

Today the Social feature can **compose** and **save** posts, but it cannot
actually publish to any network. `socialRouter.publish`
(`server/routers/social.ts`) only flips the local post `status` to `published`
and fires a `social.post.published` automation event — distribution is
delegated to the operator's own n8n/Zapier workflows, and UnifyOne holds no
per-platform credentials. This plan adds **native account connection** and
**native publishing** while keeping the automation event as a fallback.

## 2. Current state (what already exists)

Reusable today:

| Asset                            | Location                                                             | Notes                                                                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `socialPosts` table              | `drizzle/schema.ts:482`                                              | Real & used. Has `status` enum (`draft/scheduled/published/failed/cancelled`), `scheduledAt`, `publishedAt`, `mediaUrls`, `metrics`, `platforms`, UTM fields.                               |
| `socialAccounts` table           | `drizzle/schema.ts:464`                                              | **Defined but unused.** Columns: `platform`, `handle`, `accessToken`, `refreshToken`, `tokenExpiresAt`, `isConnected`, `profileImageUrl`, `followerCount`. This is the connect scaffolding. |
| `socialRouter`                   | `server/routers/social.ts`                                           | `aiCompose` (real Claude LLM), `create`, `list`, `delete`, `getAnalytics` are real. `publish` is delegated-only (the gap).                                                                  |
| OAuth `authorization_code` model | `server/_core/customAuthRoutes.ts:595–628` (Google login)            | Working reference for an authorize → callback → token-exchange flow.                                                                                                                        |
| OAuth route registration         | `server/_core/index.ts:271` (`registerOAuthRoutes`)                  | Non-tRPC callback routes live under `/api/oauth/*`; works under both the Express and Netlify fetch adapters.                                                                                |
| Token encryption at rest         | `server/_core/shopifyTokenCrypto.ts` (+ `server/lib/apiKeyVault.ts`) | AES-256-GCM, key versioning/rotation, ≥32-char key. Direct model to copy for social tokens.                                                                                                 |
| Scheduled job pattern            | `netlify/functions/drip-scheduler-scheduled.mts`                     | Netlify Scheduled Function (`config.schedule` cron) → `processPending*()` helper in `server/_core`. Direct model for the scheduled publisher.                                               |
| Credit metering                  | `server/creditMeter.ts` (`meterCredits`)                             | For metering publish actions.                                                                                                                                                               |
| Social UI                        | `client/src/pages/Social.tsx`                                        | Compose + list/filter tabs. **No "Connect Accounts" UI.** Calls `trpc.social.{list,getAnalytics,aiCompose,create,publish,delete}`.                                                          |

Missing entirely: per-platform OAuth connect flows, any **use** of
`socialAccounts`, real platform-API publishing, a scheduled-publish worker,
token encryption applied to social tokens (columns are plaintext `text` today),
and the Connect Accounts UI.

Out of scope / not overlapping: the **CAPI router** (`server/routers/capi.ts`)
is Meta Pixel / Conversions API (ad-event tracking), _not_ content publishing —
though a future Meta adapter may reuse the same Meta app registration.

## 3. Architecture decisions

1. **Native + fallback.** When a tenant has a connected account for a platform,
   `publish` routes through that platform's adapter. The existing
   `social.post.published` automation event keeps firing so operator
   n8n/Zapier flows are not broken.
2. **Encrypt tokens at rest** (non-negotiable). Add `server/_core/socialTokenCrypto.ts`
   mirroring `shopifyTokenCrypto.ts`, keyed by a new `SOCIAL_TOKEN_ENC_KEY`.
   `socialAccounts.accessToken/refreshToken` store ciphertext only.
3. **Provider-adapter interface** so platforms are pluggable:
   ```ts
   interface SocialProvider {
     platform: SocialPlatform;
     getAuthUrl(state: string, redirectUri: string): string; // OAuth platforms
     exchangeCode(code: string, redirectUri: string): Promise<ConnectionTokens>;
     refresh?(refreshToken: string): Promise<ConnectionTokens>;
     publish(
       account: SocialAccount,
       post: PublishablePost
     ): Promise<PublishResult>;
   }
   ```
   Bluesky uses an app-password connect (no OAuth redirect) and Mastodon uses
   per-instance OAuth, so the interface must allow both a redirect flow and a
   credential/app-password flow.
4. **Multi-tenant + authz.** Connections are per `tenantId`. Connect/disconnect/
   publish mutations gated to owner/admin role. Every query filters by `tenantId`
   (project rule).
5. **Drizzle is source of truth.** Any new columns go into `drizzle/schema.ts`
   first, then `pnpm db:push`.

## 4. Phased PR breakdown

Platform-agnostic PRs (1, 3, 4) need **no external credentials** and can land
immediately. Provider PRs need the per-platform setup in §5.

### PR 1 — Token vault + accounts plumbing _(no creds)_

- `server/_core/socialTokenCrypto.ts` (+ tests) — copy of the Shopify token crypto.
- Possible migration: add `platformUserId`, `scopes`, `displayName`,
  `instanceUrl` (for Mastodon) to `socialAccounts`.
- `connectedAccounts` sub-router: `list`, `disconnect` (read/write `socialAccounts`
  with encryption; never return raw tokens to the client).
- Define the `SocialProvider` interface + registry.
- Tests: crypto round-trip, tenant isolation, token redaction.

### PR 2 — First connect flow + UI _(needs creds: Bluesky/Mastodon)_

- Connect routes registered alongside existing OAuth in `server/_core/index.ts`
  (`/api/oauth/social/:platform/start`, `/api/oauth/social/:platform/callback`).
  Bluesky: app-password form (no redirect); Mastodon: per-instance OAuth.
- `connectedAccounts.startConnect` / callback handler → encrypted store.
- **Connect Accounts UI** on `client/src/pages/Social.tsx` (new tab): per-platform
  connect/disconnect, connection status, handle/avatar.

### PR 3 — Publishing engine _(no creds; provider stub mock-tested)_

- Wire `socialRouter.publish` to dispatch via the connected account's adapter.
- Credit metering; on failure set `status=failed` + capture error; keep the
  automation event as fallback.
- Implement the first adapter's real `publish` (Bluesky `com.atproto.repo.createRecord`).
- Tests with mocked HTTP.

### PR 4 — Scheduled publisher _(no creds)_

- `netlify/functions/social-publish-scheduled.mts` (cron, mirrors drip-scheduler)
  → `server/_core/socialPublishScheduler.ts#processPendingScheduledPosts()`:
  select `status=scheduled AND scheduledAt<=now`, refresh tokens, publish,
  update status. Idempotency + per-run cap.
- Tests for the helper.

### PR 5 — Mastodon adapter publish

- Mastodon `POST /api/v1/statuses` (+ media upload via `/api/v2/media`).

### PR 6+ — Future providers (separate effort, review-gated)

- LinkedIn (light review) → X/Twitter (paid API) → Facebook/Instagram (heavy
  Meta review) → TikTok/YouTube (heavy + video pipelines).
- Optional: **metrics ingestion** PR to populate the unused `metrics` column.

## 5. Credentials & setup required (per platform)

Document in `docs/SOCIAL_PUBLISHING.md` when PR 2 lands. v1 needs:

- **Bluesky**: per-user handle + app password (generated in Bluesky settings).
  No central app registration. Env: `SOCIAL_TOKEN_ENC_KEY` only.
- **Mastodon**: per-instance OAuth app (client id/secret are per instance, often
  registered dynamically via the instance's `/api/v1/apps` endpoint).
  Env: `SOCIAL_TOKEN_ENC_KEY`; redirect URI registered with each instance.
- **Shared**: `SOCIAL_TOKEN_ENC_KEY` (≥32 chars, `openssl rand -hex 32`) and the
  public callback base URL.

Later platforms add `<PLATFORM>_CLIENT_ID` / `<PLATFORM>_CLIENT_SECRET` and a
registered redirect URI each.

## 6. Risks & notes

- **Token security** is the highest-risk surface — encryption + redaction must be
  in PR 1 before any real token is stored.
- **Rate limits / partial failure**: a post targeting multiple platforms can
  partially fail; persist per-platform results (consider a `socialPostTargets`
  child table if per-platform status/permalink tracking is wanted — decide in PR 3).
- **X/Twitter write access is now a paid API tier** — flag cost before scheduling
  that adapter.
- **Meta/TikTok app review** can take weeks; sequence them last.
- **Media uploads** (`mediaUrls`) require per-platform upload endpoints; v1 can
  ship text-only publish first and add media in a follow-up.
