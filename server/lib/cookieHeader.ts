/**
 * Read the Cookie header from either an Express Request (where `headers` is a
 * plain `IncomingHttpHeaders` object) or a WHATWG fetch Request (where
 * `headers` is a `Headers` object that requires `.get()`).
 *
 * Netlify Functions always provide a fetch Request, while the local Express
 * server provides an Express Request. This helper normalises both so callers
 * don't need to worry about the environment.
 *
 * @returns The raw Cookie header string, or `undefined` when absent.
 */
export function getCookieHeader(req: {
  headers: unknown;
}): string | undefined {
  const h = req.headers as Record<string, unknown>;
  // WHATWG fetch Headers object exposes a `.get()` method
  if (typeof h["get"] === "function") {
    const val = (h as { get(name: string): string | null }).get("cookie");
    return val ?? undefined;
  }
  // Express IncomingHttpHeaders — direct property access
  return h["cookie"] as string | undefined;
}
