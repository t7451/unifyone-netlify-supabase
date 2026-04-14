/**
 * HTTP security response headers middleware.
 *
 * Applied early (before any route handlers) so every response — including
 * 404s, tRPC errors, and static files — carries the headers.
 *
 * Inline CSP is intentionally omitted here; Vite dev mode injects inline
 * scripts that would be blocked by a strict CSP. A separate nonce-based CSP
 * can be layered on once the build pipeline supports it.
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Middleware that attaches security response headers to every reply.
 *
 * Headers set:
 *  - X-Content-Type-Options: nosniff          — prevents MIME-type sniffing
 *  - X-Frame-Options: DENY                    — blocks clickjacking in iframes
 *  - X-XSS-Protection: 0                      — disables legacy XSS filter (modern browsers don't need it; it can be exploited)
 *  - Referrer-Policy: strict-origin-when-cross-origin
 *  - Permissions-Policy                        — disables browser features not used by this app
 *  - Strict-Transport-Security (prod only)    — enforces HTTPS for 1 year
 *  - Cross-Origin-Opener-Policy: same-origin  — isolates the browsing context
 *  - Cross-Origin-Resource-Policy: same-origin — blocks cross-origin reads of resources
 */
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isProd = process.env.NODE_ENV === "production";

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
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  // HSTS: tell browsers to only use HTTPS for 1 year, including subdomains.
  // Only send in production — in dev/staging this would break HTTP testing.
  if (isProd) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  next();
}
