import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { jwtVerify } from "jose";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

/**
 * Verify a Supabase access token (JWT) using the project's JWT secret.
 * Returns the decoded payload or null if verification fails.
 */
async function verifySupabaseToken(accessToken: string): Promise<{
  sub: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
} | null> {
  if (!ENV.supabaseJwtSecret) {
    console.error("[Auth] SUPABASE_JWT_SECRET is not configured");
    return null;
  }

  try {
    const secret = new TextEncoder().encode(ENV.supabaseJwtSecret);
    const { payload } = await jwtVerify(accessToken, secret, {
      algorithms: ["HS256"],
    });

    const sub = payload.sub;
    if (typeof sub !== "string" || sub.length === 0) {
      return null;
    }

    return {
      sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      user_metadata:
        payload.user_metadata && typeof payload.user_metadata === "object"
          ? (payload.user_metadata as {
              full_name?: string;
              name?: string;
            })
          : undefined,
    };
  } catch (error) {
    console.error("[Auth] Supabase token verification failed:", error);
    return null;
  }
}

export function registerOAuthRoutes(app: Express) {
  /**
   * POST /api/auth/supabase-session
   *
   * Exchanges a Supabase access token for the app's session cookie.
   * The client calls this after successful Supabase authentication
   * (email/password or magic link).
   */
  app.post(
    "/api/auth/supabase-session",
    async (req: Request, res: Response) => {
      const { access_token } = req.body ?? {};

      if (typeof access_token !== "string" || access_token.length === 0) {
        res.status(400).json({ error: "access_token is required" });
        return;
      }

      try {
        const tokenPayload = await verifySupabaseToken(access_token);

        if (!tokenPayload) {
          res.status(401).json({ error: "Invalid or expired token" });
          return;
        }

        const openId = tokenPayload.sub;
        const email = tokenPayload.email ?? null;
        const name =
          tokenPayload.user_metadata?.full_name ??
          tokenPayload.user_metadata?.name ??
          email ??
          "UnifyOne User";

        const sessionToken = await sdk.createSessionToken(openId, {
          name,
          email,
          loginMethod: "supabase",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        res.json({ success: true });
      } catch (error) {
        console.error("[Auth] Supabase session exchange failed:", error);
        res.status(500).json({ error: "Session creation failed" });
      }
    }
  );
}
