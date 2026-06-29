/**
 * UnifyOne — Cross-cutting constants (shared client + server)
 *
 * Framework-free values used on both sides of the wire: auth cookie names,
 * token/cookie lifetimes, the HTTP client timeout, and the canonical
 * auth/database error messages. Part of the shared kernel — see
 * `docs/ARCHITECTURE.md`.
 */

export const COOKIE_NAME = "app_session_id";
export const REFRESH_COOKIE_NAME = "app_refresh_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
/** Lifetime for access JWTs issued on login/signup (7 days). */
export const ACCESS_TOKEN_LIFETIME_MS = 1000 * 60 * 60 * 24 * 7;
/** Lifetime for opaque refresh token cookies (30 days). */
export const REFRESH_TOKEN_LIFETIME_MS = 1000 * 60 * 60 * 24 * 30;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
export const GIG_OPERATOR_FEATURES_DISABLED_ERR_MSG =
  "Gig-operator features are not enabled for this workspace.";
export const NO_DATABASE_URL =
  "No database URL set. Provide NEON_DATABASE_URL, NETLIFY_DATABASE_URL, or DATABASE_URL (or install the Netlify Neon extension).";
