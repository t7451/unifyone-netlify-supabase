import type { CookieOptions, Request } from "express";
import { ENV } from "./env";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
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
  const hostname = req.hostname;
  const isLocal = LOCAL_HOSTS.has(hostname) || isIpAddress(hostname);

  // Prefer explicit COOKIE_DOMAIN env var; fall back to auto-detecting from
  // the request hostname for production requests.
  let domain: string | undefined;
  if (ENV.cookieDomain) {
    domain = ENV.cookieDomain;
  } else if (!isLocal) {
    // Prepend a dot so the cookie is valid for the apex domain and all
    // first-party subdomains (e.g. .1commerce.online).
    domain = hostname.startsWith(".") ? hostname : `.${hostname}`;
  }

  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: isSecureRequest(req),
  };
}
