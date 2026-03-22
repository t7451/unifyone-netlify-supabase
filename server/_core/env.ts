export const ENV = {
  appId: process.env.VITE_APP_ID ?? process.env.OAUTH_CLIENT_ID ?? "",
  appBaseUrl:
    process.env.PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.URL ??
    process.env.DEPLOY_PRIME_URL ??
    process.env.DEPLOY_URL ??
    "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  oauthClientId: process.env.OAUTH_CLIENT_ID ?? process.env.VITE_APP_ID ?? "",
  oauthClientSecret: process.env.OAUTH_CLIENT_SECRET ?? "",
  oauthAuthorizeUrl: process.env.OAUTH_AUTHORIZE_URL ?? "",
  oauthTokenUrl: process.env.OAUTH_TOKEN_URL ?? "",
  oauthUserInfoUrl: process.env.OAUTH_USERINFO_URL ?? "",
  oauthIssuer: process.env.OAUTH_ISSUER ?? "",
  oauthJwksUrl: process.env.OAUTH_JWKS_URL ?? "",
  oauthScope: process.env.OAUTH_SCOPE ?? "openid profile email",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  squareAccessToken: process.env.SQUARE_ACCESS_TOKEN ?? "",
  squareLocationId: process.env.SQUARE_LOCATION_ID ?? "",
  squareWebhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? "",
  squareEnvironment: (process.env.SQUARE_ENVIRONMENT ?? "production") as "sandbox" | "production",
};
