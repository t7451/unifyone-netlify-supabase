/**
 * netlify/functions/_lib/supabase.ts
 *
 * Supabase client helpers for Netlify Functions.
 * - userClient(): honors the caller's JWT so RLS applies as that user
 * - serviceClient(): secret-key bypass for trusted server writes
 * - requireUser(): 401 short-circuit for unauthenticated requests
 *
 * Key resolution supports the new Supabase API key format
 * (sb_publishable_… / sb_secret_…) with the legacy anon / service_role
 * JWT keys as fallbacks.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

function publishableKey(): string {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? ""
  );
}

function secretKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ""
  );
}

export function userClient(authHeader: string | undefined): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, publishableKey(), {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
    auth: { persistSession: false },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, secretKey(), {
    auth: { persistSession: false },
  });
}

export async function requireUser(req: Request) {
  const auth = req.headers.get("authorization") ?? undefined;
  const sb = userClient(auth);
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) {
    return { error: new Response("unauthorized", { status: 401 }) } as const;
  }
  return { user: data.user, sb } as const;
}
