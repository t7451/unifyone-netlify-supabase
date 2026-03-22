import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/start", async (req: Request, res: Response) => {
    const returnTo = getQueryParam(req, "returnTo");
    try {
      const authorizeUrl = await sdk.createOAuthStartUrl(req, res, returnTo);
      res.redirect(302, authorizeUrl);
    } catch (error) {
      console.error("[OAuth] Start failed", error);
      res.status(500).json({ error: "OAuth start failed" });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const { sessionToken, returnTo } = await sdk.completeOAuthCallback({
        req,
        res,
        code,
        state,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/dashboard";
      res.redirect(
        302,
        `/auth/callback?returnTo=${encodeURIComponent(safeReturnTo)}`
      );
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
