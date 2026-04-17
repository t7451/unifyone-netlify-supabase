/**
 * Read the Cookie header from either an Express Request (where `headers` is an
 * `IncomingHttpHeaders` plain object) or a WHATWG fetch Request (where
 * `headers` is a `Headers` instance).
 *
 * Netlify Functions always provide a fetch Request, while the local Express
 * server provides an Express Request. This helper normalises both so callers
 * don't need to worry about the environment.
 *
 * @returns The raw Cookie header string, or `undefined` when absent.
 */
export function getCookieHeader(req: {
  headers:
    | Headers
    | Record<string, string | string[] | undefined>;
}): string | undefined {
  if (req.headers instanceof Headers) {
    // WHATWG fetch Request — use the Headers API
    return req.headers.get("cookie") ?? undefined;
  }
  // Express Request — IncomingHttpHeaders has cookie as string | undefined
  const val = req.headers["cookie"];
  return typeof val === "string" ? val : undefined;
}
