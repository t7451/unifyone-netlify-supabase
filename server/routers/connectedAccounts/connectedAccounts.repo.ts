/**
 * server/routers/connectedAccounts/connectedAccounts.repo.ts
 *
 * Data access for connected social accounts. Wraps the encrypted vault
 * helpers in `../../lib/socialAccountStore` — relocated, not rewritten. Each
 * method calls through lazily (at call time) so the underlying binding is
 * only read when invoked, exactly as the original router's named imports did.
 */
import * as store from "../../lib/socialAccountStore";

export const connectedAccountsRepo = {
  listConnectedAccounts: (
    ...args: Parameters<typeof store.listConnectedAccounts>
  ) => store.listConnectedAccounts(...args),
  disconnectAccount: (...args: Parameters<typeof store.disconnectAccount>) =>
    store.disconnectAccount(...args),
  storeConnection: (...args: Parameters<typeof store.storeConnection>) =>
    store.storeConnection(...args),
};
