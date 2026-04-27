export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Returns the UnifyOne login page path.
 */
export const getLoginUrl = (_returnPath?: string): string => {
  return "/login";
};

/**
 * Returns the UnifyOne sign-up page path.
 * - `planSlug` redirects to `/checkout?plan=<slug>` after registration.
 * - `next` overrides the post-registration redirect with an arbitrary path.
 */
export const getSignupUrl = (planSlug?: string, next?: string): string => {
  if (next) return `/signup?next=${encodeURIComponent(next)}`;
  if (planSlug) return `/signup?plan=${encodeURIComponent(planSlug)}`;
  return "/signup";
};
