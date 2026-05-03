/**
 * Read the Authorization header from either an Express Request (where `headers`
 * is an `IncomingHttpHeaders` plain object) or a WHATWG fetch Request (where
 * `headers` is a `Headers` instance).
 *
 * Mirrors getCookieHeader.ts so callers do not need to branch on environment.
 *
 * @returns The raw Authorization header string, or `undefined` when absent.
 */
export function getAuthorizationHeader(req: {
  headers: Headers | Record<string, string | string[] | undefined>;
}): string | undefined {
  if (req.headers instanceof Headers) {
    return req.headers.get("authorization") ?? undefined;
  }
  const val = req.headers["authorization"];
  return typeof val === "string" ? val : undefined;
}
