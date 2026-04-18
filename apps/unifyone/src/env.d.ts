/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly NEON_DATABASE_URL: string;
  readonly CLERK_SECRET_KEY: string;
  readonly CLERK_WEBHOOK_SECRET: string;
  readonly PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly PUBLIC_SITE_URL: string;
  readonly WAITLIST_N8N_WEBHOOK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
