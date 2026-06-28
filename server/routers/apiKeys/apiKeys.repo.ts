/**
 * server/routers/apiKeys/apiKeys.repo.ts
 *
 * Data access for user-scoped provider API keys. Wraps the helpers in
 * `../../lib/userApiKeys` — relocated, not rewritten. Function helpers call
 * through lazily (at call time) so the underlying binding is only read when
 * invoked, exactly as the original router's named imports did.
 */
import * as userApiKeys from "../../lib/userApiKeys";

export const API_KEY_PROVIDERS = userApiKeys.API_KEY_PROVIDERS;

export const apiKeysRepo = {
  listUserApiKeys: (...args: Parameters<typeof userApiKeys.listUserApiKeys>) =>
    userApiKeys.listUserApiKeys(...args),
  upsertUserApiKey: (
    ...args: Parameters<typeof userApiKeys.upsertUserApiKey>
  ) => userApiKeys.upsertUserApiKey(...args),
  deleteUserApiKey: (
    ...args: Parameters<typeof userApiKeys.deleteUserApiKey>
  ) => userApiKeys.deleteUserApiKey(...args),
};
