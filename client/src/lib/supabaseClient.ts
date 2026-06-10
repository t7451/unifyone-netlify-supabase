import { createClient } from "@supabase/supabase-js";

// Supabase is NOT the app's primary auth or database — sign-in uses custom
// JWT auth against Neon. This client powers optional Realtime features and
// Supabase OAuth flows for external integrations (see docs/OAUTH.md and
// docs/DATABASE_ARCHITECTURE.md).
//
// New Supabase API key format (sb_publishable_…) is preferred; the legacy
// anon JWT key is still accepted as a fallback.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) are not set — Realtime features are disabled (polling mode)."
  );
}

// createClient throws if the URL is an empty string. Fall back to a
// syntactically-valid placeholder so that the module always initialises
// successfully — Realtime simply stays disabled when the env vars are
// absent (e.g. preview deployments without Supabase configured).
const _supabaseUrl = supabaseUrl || "https://placeholder.supabase.co";
const _supabaseKey = supabasePublishableKey || "placeholder-publishable-key";

export const supabase = createClient(_supabaseUrl, _supabaseKey, {
  auth: {
    flowType: "pkce",
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
