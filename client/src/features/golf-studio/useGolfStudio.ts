/**
 * useGolfStudio.ts — Client API hook for the 3D golf club configurator.
 *
 * Wraps the /api/golf/* Netlify functions with Supabase session auth.
 */
import { supabase } from "@/lib/supabaseClient";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface GolfConfigInput {
  engravingText?: string;
  engravingFont?: string;
  components?: Record<string, unknown>;
  leatherFinish?: "standard" | "premium" | "exotic";
  logoPath?: string;
  tabState?: Record<string, unknown>;
}

export async function saveConfig(
  cfg: GolfConfigInput
): Promise<{ configId: string }> {
  const r = await fetch("/api/golf/config", {
    method: "POST",
    headers: { "content-type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(cfg),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function loadConfig(id: string) {
  const r = await fetch(`/api/golf/config?id=${encodeURIComponent(id)}`, {
    headers: { ...(await authHeader()) },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function uploadLogo(file: File): Promise<{ path: string }> {
  const r = await fetch("/api/golf/logo-url", {
    method: "POST",
    headers: { "content-type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  });
  if (!r.ok) throw new Error(await r.text());
  const { path, uploadUrl, token } = await r.json();

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "x-upsert": "true",
      authorization: `Bearer ${token}`,
      "content-type": file.type,
    },
    body: file,
  });
  if (!put.ok) throw new Error(`upload failed: ${put.status} ${await put.text()}`);
  return { path };
}

function readImpactRef(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)im_ref=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export interface GolfOrderResponse {
  orderId: string;
  clientSecret: string;
  total: number;
  items: Array<{ sku: string; label: string; cents: number }>;
}

export async function createOrder(
  configId: string
): Promise<GolfOrderResponse> {
  const r = await fetch("/api/golf/order", {
    method: "POST",
    headers: { "content-type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ configId, impactClickId: readImpactRef() }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
