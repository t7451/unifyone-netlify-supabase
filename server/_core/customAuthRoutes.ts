/**
 * Custom Auth Fetch Routes
 * 
 * POST /api/auth/signup     - Create account with email/password
 * POST /api/auth/signin     - Sign in with email/password
 * POST /api/auth/logout     - Clear session cookie
 * POST /api/auth/clerk      - Verify Clerk session token (fallback)
 * POST /api/auth/firebase   - Verify Firebase ID token (fallback)
 */

import {
  signUp,
  signIn,
  verifyClerkSession,
  verifyFirebaseIdToken,
  buildSessionCookie,
  buildLogoutCookie,
} from "./customAuth";

export async function registerCustomAuthFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();
  const isSecure = url.protocol === "https:";

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": url.origin || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  // Only handle POST requests
  if (method !== "POST") {
    return null;
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": url.origin || "*",
    "Access-Control-Allow-Credentials": "true",
  };

  try {
    // ── Sign Up ────────────────────────────────────────────────────────────
    if (path === "/api/auth/signup") {
      const body = await req.json().catch(() => ({}));
      const { email, password, name } = body as {
        email?: string;
        password?: string;
        name?: string;
      };

      const result = await signUp(email || "", password || "", name);

      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: 400, headers: corsHeaders }
        );
      }

      const response = Response.json(
        {
          success: true,
          user: result.user,
        },
        { status: 201, headers: corsHeaders }
      );

      response.headers.append(
        "Set-Cookie",
        buildSessionCookie(result.sessionToken!, isSecure)
      );

      return response;
    }

    // ── Sign In ────────────────────────────────────────────────────────────
    if (path === "/api/auth/signin") {
      const body = await req.json().catch(() => ({}));
      const { email, password } = body as {
        email?: string;
        password?: string;
      };

      const result = await signIn(email || "", password || "");

      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: 401, headers: corsHeaders }
        );
      }

      const response = Response.json(
        {
          success: true,
          user: result.user,
        },
        { status: 200, headers: corsHeaders }
      );

      response.headers.append(
        "Set-Cookie",
        buildSessionCookie(result.sessionToken!, isSecure)
      );

      return response;
    }

    // ── Logout ─────────────────────────────────────────────────────────────
    if (path === "/api/auth/logout") {
      const response = Response.json(
        { success: true },
        { status: 200, headers: corsHeaders }
      );

      response.headers.append("Set-Cookie", buildLogoutCookie(isSecure));

      return response;
    }

    // ── Clerk Fallback ─────────────────────────────────────────────────────
    if (path === "/api/auth/clerk") {
      const body = await req.json().catch(() => ({}));
      const { sessionToken } = body as { sessionToken?: string };

      if (!sessionToken) {
        return Response.json(
          { success: false, error: "Session token required" },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await verifyClerkSession(sessionToken);

      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: 401, headers: corsHeaders }
        );
      }

      const response = Response.json(
        {
          success: true,
          user: result.user,
        },
        { status: 200, headers: corsHeaders }
      );

      response.headers.append(
        "Set-Cookie",
        buildSessionCookie(result.sessionToken!, isSecure)
      );

      return response;
    }

    // ── Firebase Fallback ──────────────────────────────────────────────────
    if (path === "/api/auth/firebase") {
      const body = await req.json().catch(() => ({}));
      const { idToken } = body as { idToken?: string };

      if (!idToken) {
        return Response.json(
          { success: false, error: "ID token required" },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await verifyFirebaseIdToken(idToken);

      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: 401, headers: corsHeaders }
        );
      }

      const response = Response.json(
        {
          success: true,
          user: result.user,
        },
        { status: 200, headers: corsHeaders }
      );

      response.headers.append(
        "Set-Cookie",
        buildSessionCookie(result.sessionToken!, isSecure)
      );

      return response;
    }

    return null; // Not a custom auth route
  } catch (err: any) {
    console.error("[customAuthRoutes] Error:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
