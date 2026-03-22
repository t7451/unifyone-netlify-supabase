export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

function normalizePortalUrl(url: string | undefined): string | null {
  if (!url) return null;

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Returns the UnifyOne-branded login page path.
 * All auth entry points route through /login so users never see Manus OAuth UI directly.
 * The actual OAuth redirect is initiated from the Login page after showing UnifyOne branding.
 */
export const getLoginUrl = (_returnPath?: string): string => {
  return "/login";
};

/**
 * Returns the best available auth handoff URL.
 * Prefer the configured UnifyOne auth portal when present; otherwise fall back to the local OAuth start route.
 * Do NOT call this from ProtectedRoute or nav components — use getLoginUrl() instead.
 */
export const getOAuthUrl = (returnPath?: string): string => {
  const normalizedReturnPath =
    returnPath && returnPath.startsWith("/") && !returnPath.startsWith("//")
      ? returnPath
      : "/dashboard";

  const authPortalUrl = normalizePortalUrl(
    import.meta.env.VITE_OAUTH_PORTAL_URL as string | undefined
  );

  if (authPortalUrl) {
    const portalLoginUrl = new URL("/login", authPortalUrl);
    portalLoginUrl.searchParams.set("returnTo", normalizedReturnPath);
    return portalLoginUrl.toString();
  }

  return `/api/oauth/start?returnTo=${encodeURIComponent(normalizedReturnPath)}`;
};
