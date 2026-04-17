/**
 * netlify/functions/_lib/supabase.ts
 *
 * Supabase client helpers for Netlify Functions.
 * - userClient(): honors the caller's JWT so RLS applies as that user
 * - serviceClient(): service-role bypass for trusted server writes
 * - requireUser(): 401 short-circuit for unauthenticated requests
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function userClient(authHeader: string | undefined): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
      auth: { persistSession: false },
    }
  );
}

export function serviceClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
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
