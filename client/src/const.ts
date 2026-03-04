export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// Guards against missing env vars (e.g. on Netlify before env vars are configured).
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // If OAuth env vars are not configured, fall back gracefully to avoid crash
  if (!oauthPortalUrl || !appId) {
    console.warn("[Auth] VITE_OAUTH_PORTAL_URL or VITE_APP_ID is not set.");
    return "/";
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
    console.error("[Auth] Failed to construct login URL:", e);
    return "/";
  }
};
