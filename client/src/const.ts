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
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // If OAuth env vars are not configured, fall back gracefully to avoid crash
  if (!oauthPortalUrl || !appId) {
    console.warn("[Auth] VITE_OAUTH_PORTAL_URL or VITE_APP_ID is not set.");
    return "/login";
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  try {
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch (e) {
    console.error("[Auth] Failed to construct OAuth URL:", e);
    return "/login";
  }
};
