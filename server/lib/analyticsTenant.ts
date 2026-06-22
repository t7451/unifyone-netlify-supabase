/**
 * Tenant resolution for first-party analytics ingest (behavior events +
 * microsurveys).
 *
 * - Authenticated callers are always pinned to their own JWT tenant (never a
 *   client-supplied value) — tenant isolation.
 * - Anonymous storefront visitors don't know their tenant id, so they fall back
 *   to a configured default tenant (`ANALYTICS_DEFAULT_TENANT_ID`). This is what
 *   lets anonymous shoppers be attributed at all. With no env var set, anonymous
 *   ingest is a safe no-op (returns null), preserving prior behavior.
 *
 * The env-var fallback is intended for a single-owner deployment of this tool.
 * In a genuine multi-tenant context you would resolve the tenant by host/domain
 * instead; leave the env var unset there.
 */

export function defaultAnalyticsTenantId(): number | null {
  const raw = process.env.ANALYTICS_DEFAULT_TENANT_ID;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function resolveAnalyticsTenant(opts: {
  user?: { tenantId: number | null } | null;
  inputTenantId?: number | null;
}): number | null {
  // Authenticated user: only ever their own tenant (may be null).
  if (opts.user) return opts.user.tenantId;
  // Anonymous: explicit client tenant, else the configured default.
  return opts.inputTenantId ?? defaultAnalyticsTenantId();
}
