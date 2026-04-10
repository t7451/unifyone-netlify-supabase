/**
 * server/_core/nonTrpcRoutes.ts
 *
 * Handles non-tRPC routes: Stripe/PayPal/Square/billing webhooks + OAuth.
 * These need raw body access before any JSON parsing middleware.
 *
 * Returns null if the route is not handled here (falls through to tRPC).
 */
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
  ] = await Promise.all([
    import("../stripe").catch(() => ({ registerStripeFetchRoutes: null })),
    import("../billing").catch(() => ({ registerBillingFetchRoutes: null })),
    import("../paypal").catch(() => ({ registerPayPalFetchRoutes: null })),
    import("../square").catch(() => ({ registerSquareFetchRoutes: null })),
    import("./oauth").catch(() => ({ registerOAuthFetchRoutes: null })),
  ]);

  return async (req: Request): Promise<Response | null> => {
    const url = new URL(req.url);
    const path = url.pathname;

    // Stripe webhooks
    if (path.startsWith("/api/stripe/") && registerStripeFetchRoutes) {
      try {
        return await (registerStripeFetchRoutes as any)(req);
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // Billing webhooks
    if (path.startsWith("/api/billing/") && registerBillingFetchRoutes) {
      try {
        return await (registerBillingFetchRoutes as any)(req);
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // PayPal
    if (path.startsWith("/api/paypal/") && registerPayPalFetchRoutes) {
      try {
        return await (registerPayPalFetchRoutes as any)(req);
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // Square
    if (path.startsWith("/api/square/") && registerSquareFetchRoutes) {
      try {
        return await (registerSquareFetchRoutes as any)(req);
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // OAuth callback
    if (path.startsWith("/api/auth/") && registerOAuthFetchRoutes) {
      try {
        return await (registerOAuthFetchRoutes as any)(req);
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // Logout
    if (path === "/api/logout" || path === "/api/auth/logout") {
      const res = Response.json({ success: true });
      res.headers.append(
        "Set-Cookie",
        "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
      );
      return res;
    }

    return null; // Not handled — pass to tRPC
  };
}
