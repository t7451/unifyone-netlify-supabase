/**
 * server/_core/nonTrpcRoutes.ts
 *
 * Handles non-tRPC routes: Stripe/PayPal/Square/billing webhooks + OAuth.
 * These need raw body access before any JSON parsing middleware.
 *
 * Returns null if the route is not handled here (falls through to tRPC).
 */
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";

type FetchHandler = (req: Request) => Promise<Response | null>;

export async function buildNonTrpcHandler(): Promise<
  (req: Request) => Promise<Response | null>
> {
  // Lazy-load route handlers
  const [
    { registerStripeFetchRoutes },
    { registerBillingFetchRoutes },
    { registerPayPalFetchRoutes },
    { registerSquareFetchRoutes },
    { registerOAuthFetchRoutes },
    { registerCustomAuthFetchRoutes },
  ] = await Promise.all([
    import("../stripe").catch(() => ({ registerStripeFetchRoutes: null })),
    import("../billing").catch(() => ({ registerBillingFetchRoutes: null })),
    import("../paypal").catch(() => ({ registerPayPalFetchRoutes: null })),
    import("../square").catch(() => ({ registerSquareFetchRoutes: null })),
    import("./oauth").catch(() => ({ registerOAuthFetchRoutes: null })),
    import("./customAuthRoutes").catch(() => ({
      registerCustomAuthFetchRoutes: null,
    })),
  ]);

  return async (req: Request): Promise<Response | null> => {
    const url = new URL(req.url);
    const path = url.pathname;

    // Stripe webhooks
    if (path.startsWith("/api/stripe/") && registerStripeFetchRoutes) {
      try {
        return await (registerStripeFetchRoutes as FetchHandler)(req);
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Billing webhooks
    if (path.startsWith("/api/billing/") && registerBillingFetchRoutes) {
      try {
        return await (registerBillingFetchRoutes as FetchHandler)(req);
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // PayPal
    if (path.startsWith("/api/paypal/") && registerPayPalFetchRoutes) {
      try {
        return await (registerPayPalFetchRoutes as FetchHandler)(req);
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Square
    if (path.startsWith("/api/square/") && registerSquareFetchRoutes) {
      try {
        return await (registerSquareFetchRoutes as FetchHandler)(req);
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Custom Auth (signup/signin/logout) — check BEFORE legacy OAuth
    if (path.startsWith("/api/auth/") && registerCustomAuthFetchRoutes) {
      try {
        const result = await (registerCustomAuthFetchRoutes as FetchHandler)(
          req
        );
        if (result) return result;
        // Fall through to OAuth if not handled
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // OAuth callback (legacy Supabase flow)
    if (path.startsWith("/api/auth/") && registerOAuthFetchRoutes) {
      try {
        return await (registerOAuthFetchRoutes as FetchHandler)(req);
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Logout — use the canonical COOKIE_NAME and honour COOKIE_DOMAIN
    if (path === "/api/logout" || path === "/api/auth/logout") {
      const cookieDomain = ENV.cookieDomain
        ? `; Domain=${ENV.cookieDomain}`
        : "";
      const res = Response.json({ success: true });
      res.headers.append(
        "Set-Cookie",
        `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieDomain}`
      );
      return res;
    }

    return null; // Not handled — pass to tRPC
  };
}
