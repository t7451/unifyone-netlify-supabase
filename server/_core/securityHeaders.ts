/**
 * HTTP security response headers middleware.
 *
 * Applied early (before any route handlers) so every response — including
 * 404s, tRPC errors, and static files — carries the headers.
 *
 * Content-Security-Policy is applied in production only. Vite dev mode
 * injects inline HMR scripts that would be blocked by a strict CSP.
 * Netlify's CSP nonce plugin injects per-request nonces into HTML <script>
 * and <style> tags in production, so script-src does not require
 * 'unsafe-inline'.
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Strict CSP for production.
 *
 * Directives chosen to cover the app's known external dependencies:
 *  - Plausible Analytics CDN
 *  - Meta Pixel SDK (dynamically injected by metaPixelInit.ts)
 *  - Stripe.js + checkout iframes
 *  - PayPal checkout iframes
 *  - Google Fonts (stylesheet + font files)
 *  - Supabase HTTPS + WebSocket endpoints
 *  - PayPal API
 *  - Facebook Graph API (Meta Pixel event calls)
 *  - Anthropic API requests
 *  - Impact.com affiliate tracking pixel
 *  - Apollo.io website visitor tracker (script + identify API)
 *  - Cloudflare Workers (1commerce-nlweb chat worker)
 *  - Cloudflare Turnstile (bot-mitigation widget on login/signup)
 *
 * 'unsafe-inline' is allowed for style-src only because React components
 * and Tailwind CSS use inline style attributes at runtime. Script nonces are
 * injected by the Netlify CSP nonce plugin.
 */
const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self' https://plausible.io https://connect.facebook.net https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com https://assets.apollo.io https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: https://d.impactradius-event.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://api.paypal.com https://www.facebook.com https://plausible.io https://api.anthropic.com https://*.apollo.io https://*.workers.dev https://challenges.cloudflare.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://www.paypal.com https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Middleware that attaches security response headers to every reply.
 *
 * Headers set:
 *  - Content-Security-Policy (prod only)       — XSS mitigation
 *  - X-Content-Type-Options: nosniff           — prevents MIME-type sniffing
 *  - X-Frame-Options: DENY                     — blocks clickjacking in iframes
 *  - X-XSS-Protection: 0                       — disables legacy XSS filter (modern browsers don't need it; it can be exploited)
 *  - Referrer-Policy: strict-origin-when-cross-origin
 *  - Permissions-Policy                        — disables browser features not used by this app
 *  - Strict-Transport-Security (prod only)     — enforces HTTPS for 1 year
 *  - Cross-Origin-Opener-Policy: same-origin   — isolates the browsing context
 *  - Cross-Origin-Embedder-Policy: unsafe-none — avoids breaking Stripe/PayPal embeds
 *  - Cross-Origin-Resource-Policy: same-origin — blocks cross-origin reads of resources
 */
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isProd = process.env.NODE_ENV === "production";
  const isApiRoute = req.path.startsWith("/api/");

  // Strict CSP — only in production; Vite dev HMR uses inline scripts.
  // Script/style nonces are injected at the Netlify edge in production.
  if (isProd) {
    res.setHeader("Content-Security-Policy", PRODUCTION_CSP);
  }

  if (isApiRoute) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-DNS-Prefetch-Control", "off");
  }

  // Prevent MIME-type sniffing (e.g. serving a PNG as JS)
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Block this page from being embedded in iframes (clickjacking prevention)
  res.setHeader("X-Frame-Options", "DENY");

  // Disable the IE/Chrome XSS Auditor — it's deprecated and can be exploited
  res.setHeader("X-XSS-Protection", "0");

  // Only send origin on cross-origin requests, full referrer for same-origin
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Disable browser features this app doesn't use
  res.setHeader(
    "Permissions-Policy",
    [
      "accelerometer=()",
      "camera=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=(self)",
      "usb=()",
    ].join(", ")
  );

  // Cross-Origin isolation headers
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  // HSTS: tell browsers to only use HTTPS for 1 year, including subdomains.
  // Only send in production — in dev/staging this would break HTTP testing.
  if (isProd) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  next();
}
