# Production Hardening Checklist

This document outlines additional security and reliability measures that should be implemented before accepting production traffic.

## 🔴 CRITICAL — Security

### 1. Content Security Policy (CSP)

**Status:** ❌ Not Implemented

**Issue:** No CSP header is currently set, leaving the application vulnerable to XSS attacks.

**Solution:**

Add a strict Content Security Policy header. This requires:

1. **Generate nonces in server responses** — Modify `server/_core/index.ts` to generate a unique nonce per request and inject it into the HTML response.

2. **Configure Vite to use nonces** — Update `vite.config.ts` to inject nonce attributes into inline `<script>` and `<style>` tags during build.

3. **Set CSP header in Netlify** — Add to `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'nonce-${NONCE}' https://js.stripe.com; style-src 'self' 'nonce-${NONCE}' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss://denxakpahfmlsekxmubs.supabase.co https://api.stripe.com; frame-src https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
```

**References:**
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Stripe CSP Guide](https://stripe.com/docs/security/guide#content-security-policy)
- [Vite CSP Plugin](https://github.com/vitejs/vite-plugin-legacy#content-security-policy)

---

### 2. Rate Limiting for Serverless

**Status:** ⚠️ In-Memory (Not Production-Safe)

**Issue:** Current rate limiter (`server/_core/rateLimiter.ts`) uses in-memory storage, which is reset on every Netlify Function invocation. This provides **zero protection** against brute-force attacks in production.

**Solution Options:**

#### Option A: Netlify Rate Limiting Rules (Recommended)

Add to `netlify.toml`:

```toml
[[edge_functions]]
  path = "/api/auth/*"
  function = "rate-limit"

[[edge_functions.config]]
  rate_limit = { window_size = 60, max_requests = 10 }
```

Create `netlify/edge-functions/rate-limit.ts`:

```typescript
import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  // Netlify will automatically enforce the rate limit
  return context.next();
};

export const config = {
  path: ["/api/auth/*", "/api/oauth/*"],
};
```

**Pros:** Native to Netlify, no external dependencies  
**Cons:** Less flexible than custom Redis solution

#### Option B: Upstash Redis Rate Limiter

Install dependencies:

```bash
pnpm add @upstash/redis @upstash/ratelimit
```

Replace `server/_core/rateLimiter.ts`:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "unifyone:auth",
});

export const passwordResetLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
  prefix: "unifyone:reset",
});
```

**Pros:** Full control, works across all serverless instances  
**Cons:** Requires Upstash account (free tier: 10k requests/day)

#### Option C: Cloudflare WAF

Place Cloudflare in front of Netlify and use Cloudflare's built-in rate limiting rules.

**Pros:** Enterprise-grade protection, DDoS mitigation included  
**Cons:** Adds another service to manage, costs $$$ for higher tiers

**Recommended:** Start with Option A (Netlify rules), upgrade to Option B if you need more granular control.

---

## 🟠 HIGH — Reliability

### 3. Database Connection Pooling

**Status:** ⚠️ Not Configured

**Issue:** Neon serverless adapter is used without connection pooling. This can lead to connection exhaustion under load.

**Solution:**

Neon serverless adapter already uses HTTP-based queries (no persistent connections), so connection pooling is handled automatically. **No action needed** unless you switch to a different database provider.

If switching to a traditional PostgreSQL connection:

```bash
pnpm add pg @neondatabase/serverless
```

Update `server/db.ts`:

```typescript
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

---

### 4. Webhook Signature Verification Timeout

**Status:** ✅ Implemented (Stripe, PayPal, Shopify, Square)

All webhook handlers verify signatures before processing. Shopify webhook handler now logs explicitly when `SHOPIFY_API_SECRET` is missing.

---

### 5. Error Tracking and Alerting

**Status:** ✅ Sentry Configured

Sentry is initialized in `server/_core/sentry.ts` and captures `INTERNAL_SERVER_ERROR` tRPC errors. Ensure `SENTRY_DSN` is set in production.

**Additional Recommendations:**
- Set up Sentry alerts for error rate > 5% in 5 minutes
- Configure Slack/PagerDuty integration for critical errors
- Add custom Sentry context for tenant isolation issues

---

## 🟡 MEDIUM — Performance

### 6. CDN Caching Strategy

**Status:** ⚠️ Partial

Static assets (`/assets/*`, `*.js`, `*.css`) are cached for 1 year via `netlify.toml` headers.

**Recommendation:** Add edge caching for:
- `/api/billing/packages` (public, rarely changes)
- `/sitemap.xml` (regenerate daily)
- `/robots.txt` (static)

---

### 7. API Response Compression

**Status:** ✅ Netlify Default

Netlify automatically compresses responses with gzip/brotli. No action needed.

---

## 🔵 LOW — Monitoring

### 8. Structured Logging

**Status:** ✅ Implemented

Structured JSON logs with request IDs (`server/_core/logger.ts`). Logs are sent to Netlify Functions logs.

**Recommendation:** Forward logs to a log aggregation service (Logtail, Datadog, Papertrail) for long-term retention and analysis.

---

### 9. Health Check Endpoint

**Status:** ✅ Implemented

`/api/health` endpoint exists in `server/_core/docker.ts`. Verify it's accessible at:

```bash
curl https://1commerce.online/.netlify/functions/server/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": 1713148800000,
  "version": "1.0.0",
  "uptime": 12345
}
```

---

## Implementation Priority

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 🔴 | Implement CSP with nonces | High | Critical — Prevents XSS |
| 🔴 | Replace in-memory rate limiter | Medium | Critical — Prevents brute-force |
| 🟠 | Set up Sentry alerting | Low | High — Proactive issue detection |
| 🟡 | Add CDN caching for public APIs | Low | Medium — Reduces server load |
| 🔵 | Forward logs to aggregation service | Medium | Low — Better debugging |

---

## Next Steps

1. **CSP Implementation:** Dedicate a separate PR to CSP due to complexity (requires Vite plugin, nonce generation, testing).
2. **Rate Limiter:** Implement Netlify Edge Functions rate limiting OR Upstash Redis (recommend Netlify first).
3. **Monitoring:** Set up Sentry alerts and log forwarding.
4. **Testing:** Run load tests (Artillery, k6) to validate rate limiting and caching.

---

**Last Updated:** 2026-04-16  
**Maintainer:** UnifyOne Platform Team
