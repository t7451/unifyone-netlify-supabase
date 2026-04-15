import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for authentication."
  );
}

// createClient throws if the URL is an empty string. Fall back to a
// syntactically-valid placeholder so that the module always initialises
// successfully — auth will simply fail gracefully when the env vars are
// absent (e.g. preview deployments without Supabase configured).
const _supabaseUrl = supabaseUrl || "https://placeholder.supabase.co";
const _supabaseAnonKey = supabaseAnonKey || "placeholder-anon-key";

export const supabase = createClient(_supabaseUrl, _supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
