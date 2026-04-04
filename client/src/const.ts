export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Returns the UnifyOne login page path.
 */
export const getLoginUrl = (_returnPath?: string): string => {
  return "/login";
};
