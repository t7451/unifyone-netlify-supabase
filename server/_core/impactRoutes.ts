/**
 * server/_core/impactRoutes.ts
 *
 * Public Fetch handlers for Impact.com affiliate click capture.
 *
 * Mounted by server/_core/nonTrpcRoutes.ts under /api/impact/*.
 *
 *   POST /api/impact/click       — record a landing, set HttpOnly im_ref cookie
 *   GET  /api/impact/click/me    — read the current click_id from cookie (UI use)
 *
 * No admin gate — these are first-party endpoints called from the SPA on
 * affiliate landings. Rate-limit-bucketed by IP at the edge (Netlify) /
 * application layer (see _core/rateLimiter.ts) where applicable.
 */
import { randomBytes } from "node:crypto";
import { ENV } from "./env";
import { errMsg } from "./errors";
import {
  buildClickCookie,
  clientIpFromRequest,
  hashIp,
  IMPACT_COOKIE_NAME,
  readClickCookie,
  recordClick,
} from "./impact";
import { logger } from "./logger";

type ClickBody = {
  im_ref?: string;
  imRef?: string;
  landing_url?: string;
  landingUrl?: string;
};

const MAX_IM_REF_LEN = 200;
const MAX_LANDING_URL_LEN = 2048;

export async function registerImpactFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  // ── GET /api/impact/click/me ────────────────────────────────────────
  if (path === "/api/impact/click/me" && method === "GET") {
    const clickId = readClickCookie(req);
    return Response.json({ clickId: clickId ?? null });
  }

  // ── POST /api/impact/click ──────────────────────────────────────────
  if (path === "/api/impact/click" && method === "POST") {
    try {
      const body = (await req.json().catch(() => ({}))) as ClickBody;
      const imRefRaw = body.im_ref ?? body.imRef ?? "";
      const imRef = String(imRefRaw).trim().slice(0, MAX_IM_REF_LEN);
      const landingRaw = body.landing_url ?? body.landingUrl ?? "";
      const landingUrl =
        String(landingRaw).trim().slice(0, MAX_LANDING_URL_LEN) || null;

      if (!imRef) {
        return Response.json({ error: "im_ref is required" }, { status: 400 });
      }

      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        // DB unavailable — return a synthetic clickId via cookie so the
        // client UX still works (we'll lose server-side attribution).
        const ip = clientIpFromRequest(req);
        const synthetic = randomBytes(16).toString("hex");
        logger.warn("Impact click captured without DB", { imRef, ip: !!ip });
        const res = Response.json({ clickId: synthetic, persisted: false });
        res.headers.append(
          "Set-Cookie",
          buildClickCookie(synthetic, ENV.cookieDomain || undefined)
        );
        return res;
      }

      const ip = clientIpFromRequest(req);
      const ipHash = hashIp(ip);
      const userAgent = req.headers.get("user-agent");
      const referer = req.headers.get("referer") || req.headers.get("referrer");
      const existingClickId = readClickCookie(req);

      const result = await recordClick(
        db,
        {
          imRef,
          landingUrl,
          ipHash,
          userAgent,
          referer,
        },
        existingClickId
      );

      const res = Response.json({
        clickId: result.clickId,
        persisted: true,
        reused: result.alreadyExisted,
      });
      res.headers.append(
        "Set-Cookie",
        buildClickCookie(result.clickId, ENV.cookieDomain || undefined)
      );
      return res;
    } catch (err: unknown) {
      logger.error("Impact click capture failed", { error: errMsg(err) });
      return Response.json(
        { error: "Failed to record click" },
        { status: 500 }
      );
    }
  }

  return null;
}

// Re-export for convenience in adminOps integration.
export { IMPACT_COOKIE_NAME };
