/**
 * server/_core/nonTrpcRoutes.ts
 *
 * Handles non-tRPC routes: Stripe/PayPal/Square/billing webhooks + OAuth
 * + Impact affiliate click capture.
 *
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
    { registerShopifyFetchRoutes },
    { registerMastodonFetchRoutes },
    { registerOAuthFetchRoutes },
    { registerCustomAuthFetchRoutes },
    { registerImpactFetchRoutes },
  ] = await Promise.all([
    import("../stripe").catch(() => ({ registerStripeFetchRoutes: null })),
    import("../billing").catch(() => ({ registerBillingFetchRoutes: null })),
    import("../paypal").catch(() => ({ registerPayPalFetchRoutes: null })),
    import("../square").catch(() => ({ registerSquareFetchRoutes: null })),
    import("../shopify").catch(() => ({ registerShopifyFetchRoutes: null })),
    import("../mastodonOAuth").catch(() => ({
      registerMastodonFetchRoutes: null,
    })),
    import("./oauth").catch(() => ({ registerOAuthFetchRoutes: null })),
    import("./customAuthRoutes").catch(() => ({
      registerCustomAuthFetchRoutes: null,
    })),
    import("./impactRoutes").catch(() => ({
      registerImpactFetchRoutes: null,
    })),
  ]);

  const { registerPostmanFetchRoutes } = await import("../postman").catch(
    () => ({
      registerPostmanFetchRoutes: null as unknown as FetchHandler | null,
    })
  );

  const { registerUploadFetchRoutes } = await import("../uploads").catch(
    () => ({
      registerUploadFetchRoutes: null as unknown as FetchHandler | null,
    })
  );
  const { registerResourceDownloadFetchRoutes } = await import(
    "../resourceDownloads"
  ).catch(() => ({
    registerResourceDownloadFetchRoutes: null as unknown as FetchHandler | null,
  }));
  const { registerClipsToolkitFetchRoutes } = await import(
    "../clipsToolkit"
  ).catch(() => ({
    registerClipsToolkitFetchRoutes: null as unknown as FetchHandler | null,
  }));
  const { registerAdminOpsFetchRoutes } = await import("../adminOps").catch(
    () => ({
      registerAdminOpsFetchRoutes: null as unknown as FetchHandler | null,
    })
  );

  const { registerNeonAuthFetchRoutes } = await import(
    "../neonAuthWebhook"
  ).catch(() => ({
    registerNeonAuthFetchRoutes: null as unknown as FetchHandler | null,
  }));

  return async (req: Request): Promise<Response | null> => {
    const url = new URL(req.url);
    const path = url.pathname;

    // Neon Auth webhooks
    if (path === "/api/neon/auth-webhook" && registerNeonAuthFetchRoutes) {
      try {
        const result = await (registerNeonAuthFetchRoutes as FetchHandler)(req);
        if (result) return result;
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Stripe webhooks
    if (path.startsWith("/api/stripe/") && registerStripeFetchRoutes) {
      try {
        return await (registerStripeFetchRoutes as FetchHandler)(req);
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Impact.com affiliate click capture (public, no admin gate).
    // Mounted BEFORE the admin block so /api/impact/* never falls through to
    // the admin handler (which would return 401).
    if (path.startsWith("/api/impact/") && registerImpactFetchRoutes) {
      try {
        const result = await (registerImpactFetchRoutes as FetchHandler)(req);
        if (result) return result;
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Admin ops (Resend / Cloudflare DNS / Impact reports) — admin-key
    // gated inside adminOps.
    if (path.startsWith("/api/admin/") && registerAdminOpsFetchRoutes) {
      try {
        const result = await (registerAdminOpsFetchRoutes as FetchHandler)(req);
        if (result) return result;
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

    // PayPal — handler may return null to fall through to tRPC
    if (path.startsWith("/api/paypal/") && registerPayPalFetchRoutes) {
      try {
        const result = await (
          registerPayPalFetchRoutes as unknown as FetchHandler
        )(req);
        if (result) return result;
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Square — handler may return null to fall through to tRPC
    if (path.startsWith("/api/square/") && registerSquareFetchRoutes) {
      try {
        const result = await (
          registerSquareFetchRoutes as unknown as FetchHandler
        )(req);
        if (result) return result;
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Shopify — webhook receiver + OAuth install/callback. CR4: Express
    // handler in server/shopify.ts only runs in local dev; this Fetch path
    // is what Netlify Functions actually serve.
    if (path.startsWith("/api/shopify/") && registerShopifyFetchRoutes) {
      try {
        const result = await (
          registerShopifyFetchRoutes as unknown as FetchHandler
        )(req);
        if (result) return result;
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Mastodon — per-instance OAuth connect (start + callback).
    if (
      path.startsWith("/api/social/mastodon/") &&
      registerMastodonFetchRoutes
    ) {
      try {
        const result = await (
          registerMastodonFetchRoutes as unknown as FetchHandler
        )(req);
        if (result) return result;
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Image uploads (Netlify Blobs) — POST /api/uploads/image, GET re-serve
    if (path.startsWith("/api/uploads/") && registerUploadFetchRoutes) {
      try {
        const result = await (registerUploadFetchRoutes as FetchHandler)(req);
        if (result) return result;
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Postman collection + environment JSON. Public.
    if (path.startsWith("/api/postman/") && registerPostmanFetchRoutes) {
      try {
        const result = await (registerPostmanFetchRoutes as FetchHandler)(req);
        if (result) return result;
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Public generated resource downloads for the Resources page.
    if (
      path.startsWith("/api/resources/") &&
      registerResourceDownloadFetchRoutes
    ) {
      try {
        const result = await (
          registerResourceDownloadFetchRoutes as FetchHandler
        )(req);
        if (result) return result;
      } catch (e: unknown) {
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    // Standalone clips toolkit instant-delivery download.
    if (
      path.startsWith("/api/clips-toolkit/") &&
      registerClipsToolkitFetchRoutes
    ) {
      try {
        const result = await (registerClipsToolkitFetchRoutes as FetchHandler)(
          req
        );
        if (result) return result;
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
