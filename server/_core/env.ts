export const ENV = {
  appId: process.env.VITE_APP_ID ?? "unifyone",
  appBaseUrl:
    process.env.PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.URL ??
    process.env.DEPLOY_PRIME_URL ??
    process.env.DEPLOY_URL ??
    "",
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
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  squareAccessToken: process.env.SQUARE_ACCESS_TOKEN ?? "",
  squareLocationId: process.env.SQUARE_LOCATION_ID ?? "",
  squareWebhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? "",
  squareEnvironment: (process.env.SQUARE_ENVIRONMENT ?? "production") as
    | "sandbox"
    | "production",
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
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
