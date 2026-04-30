import type { CookieOptions, Request } from "express";
import { ENV } from "./env";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string | undefined): boolean {
  if (!host) return false;
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname ?? "";
  const isLocal =
    !hostname || LOCAL_HOSTS.has(hostname) || isIpAddress(hostname);

  // Cookie domain resolution:
  //   * Explicit COOKIE_DOMAIN env var wins (required in production — the
  //     startup validator refuses to boot without it).
  //   * In local dev only, auto-derive from the request hostname so devs
  //     don't need to set the env var. This intentionally does NOT happen
  //     in production: the previous auto-derivation prepended a dot to the
  //     request hostname, which on Netlify deploy previews scoped the
  //     cookie to `.<branch>--app.netlify.app` and leaked sessions to
  //     sibling preview branches.
  let domain: string | undefined;
  if (ENV.cookieDomain) {
    domain = ENV.cookieDomain;
  } else if (!isLocal && !ENV.isProduction) {
    domain = hostname.startsWith(".") ? hostname : `.${hostname}`;
  }
  // In production with no COOKIE_DOMAIN (shouldn't happen — validateEnv
  // throws — but defense in depth), leave domain undefined so the cookie
  // is host-locked to the exact request host instead of leaking to
  // siblings.

  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: isSecureRequest(req),
  };
}
