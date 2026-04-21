# UnifyOne Operational Checklist

Use this checklist before shipping auth, billing, routing, or infrastructure changes. It is separate from roadmap tracking in todo.md and is intended for operational regression control while active edits are happening.

## 1. Environment Gate

- [ ] Confirm production auth secrets exist: JWT_SECRET, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_AUTHORIZE_URL, OAUTH_TOKEN_URL, OAUTH_USERINFO_URL
- [ ] Confirm app identity values are consistent: VITE_APP_ID and OAuth client identity settings match the intended deployment
- [ ] Confirm database connectivity values are present and current: DATABASE_URL
- [ ] Confirm payment keys exist and are intentionally test or live: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, VITE_STRIPE_PUBLISHABLE_KEY, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
- [ ] Confirm Netlify base URL settings are correct for the active environment if a custom origin override is used: PUBLIC_APP_URL or APP_URL
- [ ] Confirm COOKIE_DOMAIN is set correctly for production (e.g., .1commerce.online) to enable cross-subdomain sessions

## 2. Local Quality Gate

- [ ] Run pnpm lint
- [ ] Run pnpm check
- [ ] Run pnpm test
- [ ] Start the app locally with pnpm dev and confirm the server boots without auth or router errors

## 3. Auth Smoke Test

- [ ] Visit /login and confirm the branded login page renders
- [ ] Click Continue and verify the browser reaches the configured UnifyOne auth portal or local /api/oauth/start route successfully
- [ ] Complete OAuth and verify /api/oauth/callback returns a redirect instead of a 4xx or 5xx
- [ ] Confirm app_session_id is set after the callback with HttpOnly, Secure, SameSite=None, and path=/
- [ ] Confirm /auth/callback resolves into an authenticated dashboard load instead of bouncing back to /login
- [ ] Confirm /api/trpc auth.me returns a user object after login
- [ ] Confirm logout clears app_session_id and the next protected route access returns to /login

## 4. Core Product Smoke Test

- [ ] Open the dashboard and confirm no protected-route redirect loop occurs
- [ ] Verify tenant setup still works for a tenantless user
- [ ] Open Products and confirm list, create, edit, and delete flows still load
- [ ] Open Orders and confirm list, detail, and status update flows still load
- [ ] Open Customers and confirm the page renders without query failures
- [ ] Open Settings and confirm billing/integration cards render without auth errors

## 5. Payment Smoke Test

- [ ] Confirm Stripe checkout session creation still succeeds
- [ ] Confirm Stripe webhook endpoint remains reachable and signature verification still passes in the target environment
- [ ] Confirm PayPal order creation and capture still succeed
- [ ] Confirm Shopify checkout redirect still uses the tenant-configured storefront URL

## 6. Deployment Gate

- [ ] Confirm Netlify build finishes successfully
- [ ] Confirm /api/health responds with status ok after deploy
- [ ] Confirm at least one protected route loads successfully in production after deploy
- [ ] Confirm login, logout, and one payment path in production after deploy
- [ ] Review Netlify function logs for new auth, DB, webhook, or routing errors introduced by the change

## 7. Regression Notes

- [ ] Record any manual production-only findings before the next auth or infrastructure change
- [ ] If login fails after OAuth return, check callback response headers, app_session_id presence, auth.me response body, and Netlify function logs in the same session
