export const ENV = {
  appId: process.env.VITE_APP_ID ?? "unifyone",
  appBaseUrl:
    process.env.PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.URL ??
    process.env.DEPLOY_PRIME_URL ??
    process.env.DEPLOY_URL ??
    "",
  // Cookie/JWT signing secret — prefer JWT_SECRET, fall back to SUPABASE_JWT_SECRET.
  //
  // The SUPABASE_JWT_SECRET fallback is retained so existing deployments
  // that haven't yet set JWT_SECRET keep working. Operators MUST set a
  // dedicated JWT_SECRET (>= 32 chars). Note: new Supabase projects use
  // asymmetric JWT signing keys (verified via JWKS), so SUPABASE_JWT_SECRET
  // only exists on legacy projects (see docs/OAUTH.md).
  cookieSecret: process.env.JWT_SECRET ?? process.env.SUPABASE_JWT_SECRET ?? "",
  /**
   * Explicit cookie domain — restricts the session cookie to your root domain
   * and prevents it leaking to unrelated subdomains.
   *
   * Set COOKIE_DOMAIN=.1commerce.online (note the leading dot) to allow the
   * cookie on the apex domain and all first-party subdomains.
   * Leave unset in local development (cookie will be scoped to localhost).
   */
  cookieDomain: process.env.COOKIE_DOMAIN ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  // OpenRouter (https://openrouter.ai). When OPENROUTER_API_KEY is set it
  // becomes the PRIMARY LLM provider: every Kai/UnifyAI invocation is routed
  // to OpenRouter using OPENROUTER_MODEL (defaults to the free Hermes 3
  // Llama 3.1 405B model). Forge/Groq/Vercel routing applies only when the
  // key is unset.
  openRouterApiUrl: process.env.OPENROUTER_API_URL ?? "",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterModel: process.env.OPENROUTER_MODEL ?? "",
  // ── Kai native tool keys (all optional — tools self-disable when unset) ──
  // Brave Search API (https://brave.com/search/api) → web_search tool.
  braveSearchApiKey: process.env.BRAVE_SEARCH_API_KEY ?? "",
  // Firecrawl (https://firecrawl.dev) → fetch_page uses it when set,
  // otherwise falls back to native fetch + HTML→Markdown conversion.
  firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? "",
  // Browserless (https://browserless.io) → browser_screenshot /
  // browser_get_content tools for real-browser automation.
  browserlessApiKey: process.env.BROWSERLESS_API_KEY ?? "",
  browserlessUrl:
    process.env.BROWSERLESS_URL ?? "https://chrome.browserless.io",
  // Linear (https://linear.app/settings/api) → linear_* issue tools.
  linearApiKey: process.env.LINEAR_API_KEY ?? "",
  // Optional GitHub token for read_github (higher rate limits, private repos).
  githubToken: process.env.GITHUB_TOKEN ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  vercelAiGatewayApiUrl: process.env.VERCEL_AI_GATEWAY_API_URL ?? "",
  vercelOidcToken: process.env.VERCEL_OIDC_TOKEN ?? "",
  groqApiUrl: process.env.GROQ_API_URL ?? "",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  squareAccessToken: process.env.SQUARE_ACCESS_TOKEN ?? "",
  squareLocationId: process.env.SQUARE_LOCATION_ID ?? "",
  squareWebhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? "",
  squareEnvironment: (process.env.SQUARE_ENVIRONMENT ?? "production") as
    "sandbox" | "production",
  // Supabase backs the credit-metering + Stripe billing layer and optional
  // Realtime — it is NOT the primary database (that's Neon via DATABASE_URL)
  // and NOT the primary auth provider. See docs/DATABASE_ARCHITECTURE.md.
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  // Legacy HS256 JWT secret. New Supabase projects sign tokens with
  // asymmetric keys verified via JWKS instead — leave this empty for them.
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? "",
  // Server-side Supabase key. New key format is sb_secret_… via
  // SUPABASE_SECRET_KEY; legacy service_role JWTs via
  // SUPABASE_SERVICE_ROLE_KEY are still accepted as a fallback.
  supabaseSecretKey:
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "",
  // Browser-safe Supabase key (sb_publishable_… or legacy anon JWT).
  supabasePublishableKey:
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "",
  // Graph Worker MCP endpoint (ksksrbiz-arch/graph Cloudflare Worker).
  // Tools: recall, graph-query, recent-events, stats, write-note.
  // Optional: Bearer token for Graph Worker inbound auth.
  graphMcpUrl:
    process.env.GRAPH_MCP_URL ?? "https://graph.skdev-371.workers.dev/mcp",
  graphMcpToken: process.env.GRAPH_MCP_TOKEN ?? "",
  // Built Media clipping platform URL (ksksrbiz-arch/built-media).
  builtMediaUrl: process.env.BUILT_MEDIA_URL ?? "",
  builtMediaApiKey: process.env.BUILT_MEDIA_API_KEY ?? "",
  // ── RoutePulse (hyperlocal route intelligence) ──
  // OSRM routing engine — public demo server by default, swap for a
  // self-hosted instance in production (see docs).
  osrmUrl: process.env.OSRM_URL ?? "https://router.project-osrm.org",
  // Road511 unified 511 API (57 US/CA jurisdictions).
  road511ApiKey: process.env.R511_API_KEY ?? "",
  // ODOT TripCheck API (Oregon-native incidents/cameras/road conditions).
  tripcheckApiKey: process.env.TRIPCHECK_KEY ?? "",
  // TomTom Routing API — fallback used only if OSRM is unreachable/down.
  // Free tier: 2,500 requests/day. https://developer.tomtom.com
  tomtomApiKey: process.env.TOMTOM_API_KEY ?? "",
  // NOTE for Kimi: OPENWEBNINJA_API_KEY is live in Netlify (set 2026-08-09)
  // but nothing in this codebase reads it yet — no integration exists.
  // Wire it up here the same way tomtomApiKey is wired above, then add the
  // actual fetch call in routePulse.service.ts near fetchTomTomFallback /
  // fetchBaseRoutes (that's the natural home for another routing/traffic
  // data source). Whatever it ends up doing, please route it through
  // fetchWithTimeout() (top of routePulse.service.ts) rather than a bare
  // fetch() — that's what fixed the hang-until-platform-timeout issue on
  // the other three upstreams, and a fourth unguarded fetch would
  // reintroduce the same failure mode for whatever calls this one.
  openWebNinjaApiKey: process.env.OPENWEBNINJA_API_KEY ?? "",
  // Nominatim (OpenStreetMap) geocoding — free, no API key. Usage policy
  // requires a descriptive User-Agent identifying the app + contact URL.
  // https://operations.osmfoundation.org/policies/nominatim/
  nominatimUrl:
    process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org",
  nominatimUserAgent:
    process.env.NOMINATIM_USER_AGENT ??
    "UnifyOne-RoutePulse/1.0 (+https://1commerce.online/tools/route-pulse)",
  // US Census Bureau Geocoder — free, no API key, no rate-limit policy like
  // Nominatim's. Used as a fallback when Nominatim can't fuzzy-match a real
  // US address (e.g. renamed streets, accented official names like
  // Portland's "César E. Chávez Blvd" vs. a plain-ASCII user-typed variant).
  // https://geocoding.geo.census.gov/geocoder/Geocoding_Services.html
  censusGeocoderUrl:
    process.env.CENSUS_GEOCODER_URL ??
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
  // Route-scoring AI runs through the existing Kai model router
  // (server/lib/kaiModels + server/_core/llm) — OpenRouter free-tier
  // models with Groq/Vercel AI Gateway fallback. No dedicated key needed.
};

/**
 * Canonical app URL for use in server-side links (emails, redirects, webhooks).
 * Resolution order:
 *   1. PUBLIC_APP_URL  (explicit override in Netlify env vars)
 *   2. APP_URL         (Netlify branch alias)
 *   3. URL             (Netlify primary URL — auto-set by Netlify)
 *   4. DEPLOY_PRIME_URL (Netlify deploy preview URL)
 *   5. Hardcoded fallback
 *
 * Always returns a URL **without** a trailing slash.
 */
export function getAppUrl(): string {
  const raw =
    process.env.PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    "https://1commerce.online";
  return raw.replace(/\/+$/, "");
}
