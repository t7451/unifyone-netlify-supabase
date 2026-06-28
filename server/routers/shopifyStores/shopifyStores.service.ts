import {
  listStoresSummary,
  selectStoreFull,
  selectStoreOwnership,
  selectStoreOwnershipWithDomain,
  selectStoreScopes,
  setStoreStatus,
  setStoreLastSyncAt,
  linkStoreToUser,
  shopifyStores,
  eq,
  and,
} from "./shopifyStores.repo";

/**
 * Use-case layer for Shopify store management. Holds the ownership /
 * cross-tenant isolation logic; transport (zod, procedures) stays in index.ts
 * and data access in shopifyStores.repo.ts. Behaviour is unchanged from the
 * original single-file router — queries and side-effect order are identical.
 */

interface CallerCtx {
  id: number;
  role: string;
  tenantId: number | null;
  email?: string | null;
  name?: string | null;
}

export async function listStores(user: CallerCtx) {
  const isAdmin = user.role === "admin";
  // Non-admins: filter by both userId AND tenantId so a user can never see
  // stores belonging to a different tenant they happen to share a userId with.
  const whereClause = isAdmin
    ? undefined
    : user.tenantId !== null
      ? and(
          eq(shopifyStores.userId, user.id),
          eq(shopifyStores.tenantId, user.tenantId)
        )
      : eq(shopifyStores.userId, user.id);
  return listStoresSummary(whereClause);
}

export async function getStore(user: CallerCtx, storeId: number) {
  const isAdmin = user.role === "admin";
  const whereClause = isAdmin
    ? eq(shopifyStores.id, storeId)
    : user.tenantId !== null
      ? and(
          eq(shopifyStores.id, storeId),
          eq(shopifyStores.userId, user.id),
          eq(shopifyStores.tenantId, user.tenantId)
        )
      : and(eq(shopifyStores.id, storeId), eq(shopifyStores.userId, user.id));
  const stores = await selectStoreFull(whereClause);
  if (!stores.length) throw new Error("Store not found");
  // Never return the access token to the client
  const { accessToken: _token, ...safe } = stores[0];
  return safe;
}

/**
 * Verify the caller may mutate the given store. Mirrors the original inline
 * ownership checks (non-admins must own the store and share its tenant).
 */
function assertCanMutate(
  user: CallerCtx,
  store: { userId: number; tenantId: number | null }
): boolean {
  const isAdmin = user.role === "admin";
  if (!isAdmin) {
    if (store.userId !== user.id) throw new Error("Forbidden");
    // Enforce tenant isolation: store must belong to the caller's tenant
    if (
      store.tenantId !== null &&
      user.tenantId !== null &&
      store.tenantId !== user.tenantId
    ) {
      throw new Error("Forbidden");
    }
  }
  return isAdmin;
}

/**
 * Build the atomic-update WHERE clause used by removeStore/syncNow. Admins
 * target the store by id alone; non-admins additionally pin userId to prevent
 * TOCTOU cross-tenant writes. Identical to the original inline expression.
 */
function mutateWhere(user: CallerCtx, storeId: number, isAdmin: boolean) {
  return isAdmin
    ? eq(shopifyStores.id, storeId)
    : and(eq(shopifyStores.id, storeId), eq(shopifyStores.userId, user.id));
}

export async function removeStore(user: CallerCtx, storeId: number) {
  // Verify ownership — select both userId and tenantId for cross-tenant isolation.
  const stores = await selectStoreOwnership(storeId);
  if (!stores.length) throw new Error("Store not found");
  const isAdmin = assertCanMutate(user, stores[0]);
  // Atomic update: include tenantId (or userId) in WHERE to prevent TOCTOU cross-tenant writes
  await setStoreStatus(mutateWhere(user, storeId, isAdmin), "uninstalled");
  return { success: true };
}

export async function syncNow(user: CallerCtx, storeId: number) {
  const stores = await selectStoreOwnershipWithDomain(storeId);
  if (!stores.length) throw new Error("Store not found");
  const isAdmin = assertCanMutate(user, stores[0]);
  // Atomic update: include userId in WHERE to prevent TOCTOU cross-tenant writes
  await setStoreLastSyncAt(mutateWhere(user, storeId, isAdmin), new Date());
  return { success: true, syncedAt: new Date().toISOString() };
}

export async function getScopes(user: CallerCtx, storeId: number) {
  const stores = await selectStoreScopes(storeId);
  if (!stores.length) throw new Error("Store not found");
  assertCanMutate(user, stores[0]);
  const scopes = stores[0].scopes.split(",").map(s => s.trim());
  return { scopes };
}

export async function linkToUser(input: {
  storeId: number;
  userId: number;
  tenantId?: number;
}) {
  await linkStoreToUser(input.storeId, input.userId, input.tenantId);
  return { success: true };
}
