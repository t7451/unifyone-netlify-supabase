export const COOKIE_NAME = "app_session_id";
export const REFRESH_COOKIE_NAME = "app_refresh_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
/** Lifetime for access JWTs issued on login/signup (7 days). */
export const ACCESS_TOKEN_LIFETIME_MS = 1000 * 60 * 60 * 24 * 7;
/** Lifetime for opaque refresh token cookies (30 days). */
export const REFRESH_TOKEN_LIFETIME_MS = 1000 * 60 * 60 * 24 * 30;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
