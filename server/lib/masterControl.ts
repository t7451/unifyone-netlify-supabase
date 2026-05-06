import type { User } from "../../drizzle/schema";

export const MASTER_CONTROL_ACCOUNT_ID =
  process.env.MASTER_CONTROL_OPEN_ID ?? "7878e6b683d9e665c9d2a296137dda20";

export const MASTER_CONTROL_USERNAME =
  process.env.MASTER_CONTROL_USERNAME ?? "master_control";

export function isMasterControlOpenId(openId: string | null | undefined) {
  return Boolean(openId && openId === MASTER_CONTROL_ACCOUNT_ID);
}

export function isMasterControlUser(
  user: Pick<User, "openId"> | null | undefined
) {
  return isMasterControlOpenId(user?.openId);
}
