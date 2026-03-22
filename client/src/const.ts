export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Returns the UnifyOne-branded login page path.
 * All auth entry points route through /login so users never see Manus OAuth UI directly.
 * The actual OAuth redirect is initiated from the Login page after showing UnifyOne branding.
 */
export const getLoginUrl = (_returnPath?: string): string => {
  return "/login";
};

/**
 * Returns the raw Manus OAuth URL. Used internally by the Login page only.
 * Do NOT call this from ProtectedRoute or nav components — use getLoginUrl() instead.
 */
export const getOAuthUrl = (): string => {
  return "/api/oauth/start";
};
