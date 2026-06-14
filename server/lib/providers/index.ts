/**
 * Built-in social provider registration.
 *
 * Call `registerBuiltinSocialProviders()` before resolving providers. It is
 * idempotent, so repeated calls (e.g. per request, or across tests) are safe.
 */
import { hasProvider, registerProvider } from "../socialProviders";
import { blueskyProvider } from "./bluesky";

let registered = false;

export function registerBuiltinSocialProviders(): void {
  if (registered) return;
  if (!hasProvider("bluesky")) registerProvider(blueskyProvider);
  registered = true;
}
