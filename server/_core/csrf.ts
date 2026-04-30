/**
 * CSRF protection for cookie-authenticated mutations.
 *
 * Strategy: Origin/Referer allow-list check on state-changing requests
 * that carry the session cookie. This complements SameSite=Lax on the
 * session cookie (which already blocks most CSRF vectors) and the strict
 * CORS allow-list (which blocks cross-origin XHR with credentials). It
 * specifically catches the residual class of attack — top-level form
 * POSTs from attacker-controlled pages — that SameSite=Lax does not.
 *
 * Why not double-submit cookie tokens? They require client cooperation on
 * every mutation (tRPC link, fetch wrapper, etc.) and a token endpoint.
 * Origin/Referer validation is enforced server-side only and is the
 * approach OWASP recommends as a first-line defense alongside SameSite.
 *
 * Trusted origins are sourced from CORS_ALLOWED_ORIGINS + PUBLIC_APP_URL,
 * matching the CORS allow-list so configuration stays consistent.
 *
 * Webhook routes (Stripe/PayPal/Shopify/Square) and OAuth callbacks are
 * exempt — they are signed/verified by other means and intentionally do
 * not carry a session cookie or originate from our own pages.
 */
import type { RequestHandler } from "express";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const EXEMPT_PATH_PREFIXES = [
  "/api/stripe/webhook",
  "/api/paypal/webhook",
  "/api/shopify/webhook",
  "/api/square/webhook",
  "/api/billing/webhook",
  "/api/n8n/webhook",
  "/api/oauth/callback",
  // Health/metrics — never authenticated, never state-changing
  "/api/health",
  "/api/ready",
  "/api/metrics",
];

function buildTrustedOrigins(): Set<string> {
  const fromEnv = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const appUrl = (process.env.PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const set = new Set<string>(fromEnv);
  if (appUrl) set.add(appUrl);
  if (!ENV.isProduction) {
    set.add("http://localhost:3000");
    set.add("http://localhost:5173");
    set.add("http://127.0.0.1:3000");
    set.add("http://127.0.0.1:5173");
  }
  return set;
}

function originOf(url: string): string | null {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export function csrfProtection(): RequestHandler {
  const trusted = buildTrustedOrigins();

  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const path = req.path;
    if (EXEMPT_PATH_PREFIXES.some(prefix => path.startsWith(prefix))) {
      return next();
    }

    // Only enforce on cookie-authenticated requests. API token / Bearer
    // requests don't carry the session cookie and aren't browser-driven.
    const cookieHeader = req.headers.cookie ?? "";
    const hasSessionCookie =
      cookieHeader.includes(`${COOKIE_NAME}=`) ||
      cookieHeader.includes("auth_token=");
    if (!hasSessionCookie) return next();

    const originHeader =
      typeof req.headers.origin === "string" ? req.headers.origin : null;
    const refererHeader =
      typeof req.headers.referer === "string" ? req.headers.referer : null;

    const candidate =
      originHeader ?? (refererHeader ? originOf(refererHeader) : null);

    if (!candidate) {
      // Mutation with cookie but no Origin/Referer — refuse. Browsers
      // attach at least one of these on cross-site form submissions.
      res.status(403).json({ error: "Missing Origin/Referer header" });
      return;
    }

    if (!trusted.has(candidate)) {
      res.status(403).json({ error: "Untrusted origin" });
      return;
    }

    next();
  };
}
