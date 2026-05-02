/**
 * server/adminOps.ts
 *
 * Admin-key-gated operational endpoints for things that need to talk to
 * external services (Resend, Cloudflare) using server-side credentials
 * that we don't want sitting on the client.
 *
 * All routes require header:  x-admin-key: $ADMIN_API_KEY
 *
 *   POST /api/admin/resend/setup-domain        — add 1commerce.online to Resend
 *   POST /api/admin/resend/get-domain          — get current Resend status + DNS recs
 *   POST /api/admin/resend/verify-domain       — trigger Resend's DNS verification poll
 *   POST /api/admin/resend/test-send           — send a one-off test email
 *   POST /api/admin/cloudflare/zone-info       — look up zone id for 1commerce.online
 *   POST /api/admin/cloudflare/upsert-resend-dns
 *      — given Resend DNS records, idempotently upsert them in Cloudflare
 *
 * The Cloudflare routes read CLOUDFLARE_API_TOKEN from env. If missing,
 * they return 412 with instructions for the user to set it.
 */
import { errMsg } from "./_core/errors";

type ResendDomain = {
  id: string;
  name: string;
  status: string;
  region?: string;
  created_at?: string;
  records?: Array<{
    record: string;
    name: string;
    type: string;
    ttl?: string | number;
    status?: string;
    value: string;
    priority?: number;
  }>;
};

type CfDnsRecord = {
  id?: string;
  type: string;
  name: string;
  content: string;
  ttl?: number;
  priority?: number;
  proxied?: boolean;
  comment?: string;
};

const DEFAULT_DOMAIN = "1commerce.online";
const RESEND_BASE = "https://api.resend.com";
const CF_BASE = "https://api.cloudflare.com/client/v4";

function checkAdmin(req: Request): Response | null {
  const adminKey = req.headers.get("x-admin-key") || "";
  if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function resendFetch(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 412,
      body: { error: "RESEND_API_KEY not set in env" },
    };
  }
  const res = await fetch(`${RESEND_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

async function cfFetch(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken) {
    return {
      ok: false,
      status: 412,
      body: {
        error: "CLOUDFLARE_API_TOKEN not set",
        hint: "Generate at https://dash.cloudflare.com/profile/api-tokens with Zone:DNS:Edit on 1commerce.online, then set on Netlify (production scope, functions+runtime, secret).",
      },
    };
  }
  const res = await fetch(`${CF_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

async function findResendDomain(
  domainName: string
): Promise<ResendDomain | null> {
  const list = await resendFetch("/domains", { method: "GET" });
  if (!list.ok) return null;
  const data = (list.body as { data?: ResendDomain[] }).data ?? [];
  return data.find(d => d.name === domainName) ?? null;
}

export async function registerAdminOpsFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  if (!path.startsWith("/api/admin/")) return null;

  // ── Resend ──────────────────────────────────────────────────────────
  if (path === "/api/admin/resend/setup-domain" && method === "POST") {
    const unauthorized = checkAdmin(req);
    if (unauthorized) return unauthorized;
    try {
      const body = (await req.json().catch(() => ({}))) as {
        domain?: string;
        region?: string;
      };
      const domain = body.domain || DEFAULT_DOMAIN;
      // If already exists, return the existing record + DNS records.
      const existing = await findResendDomain(domain);
      if (existing) {
        // Refresh to get records
        const detail = await resendFetch(`/domains/${existing.id}`, {
          method: "GET",
        });
        return Response.json({
          status: "already_exists",
          domain: detail.body,
        });
      }
      const created = await resendFetch("/domains", {
        method: "POST",
        body: JSON.stringify({
          name: domain,
          region: body.region || "us-east-1",
        }),
      });
      return Response.json(
        { status: created.ok ? "created" : "error", domain: created.body },
        { status: created.ok ? 200 : created.status }
      );
    } catch (err: unknown) {
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  if (path === "/api/admin/resend/get-domain" && method === "POST") {
    const unauthorized = checkAdmin(req);
    if (unauthorized) return unauthorized;
    try {
      const body = (await req.json().catch(() => ({}))) as { domain?: string };
      const domain = body.domain || DEFAULT_DOMAIN;
      const found = await findResendDomain(domain);
      if (!found) {
        return Response.json(
          { error: `Domain ${domain} not found in Resend account` },
          { status: 404 }
        );
      }
      const detail = await resendFetch(`/domains/${found.id}`, {
        method: "GET",
      });
      return Response.json(detail.body);
    } catch (err: unknown) {
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  if (path === "/api/admin/resend/verify-domain" && method === "POST") {
    const unauthorized = checkAdmin(req);
    if (unauthorized) return unauthorized;
    try {
      const body = (await req.json().catch(() => ({}))) as { domain?: string };
      const domain = body.domain || DEFAULT_DOMAIN;
      const found = await findResendDomain(domain);
      if (!found) {
        return Response.json(
          { error: `Domain ${domain} not found in Resend` },
          { status: 404 }
        );
      }
      const verify = await resendFetch(`/domains/${found.id}/verify`, {
        method: "POST",
      });
      return Response.json(verify.body, {
        status: verify.ok ? 200 : verify.status,
      });
    } catch (err: unknown) {
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  if (path === "/api/admin/resend/test-send" && method === "POST") {
    const unauthorized = checkAdmin(req);
    if (unauthorized) return unauthorized;
    try {
      const body = (await req.json().catch(() => ({}))) as {
        to?: string;
        from?: string;
        subject?: string;
        text?: string;
      };
      if (!body.to) {
        return Response.json({ error: "to is required" }, { status: 400 });
      }
      const send = await resendFetch("/emails", {
        method: "POST",
        body: JSON.stringify({
          from: body.from || `UnifyOne <hello@${DEFAULT_DOMAIN}>`,
          to: body.to,
          subject: body.subject || "UnifyOne Resend test",
          text:
            body.text ||
            `Test email from UnifyOne / 1commerce.online sent at ${new Date().toISOString()}.`,
        }),
      });
      return Response.json(send.body, {
        status: send.ok ? 200 : send.status,
      });
    } catch (err: unknown) {
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // ── Cloudflare ──────────────────────────────────────────────────────
  if (path === "/api/admin/cloudflare/zone-info" && method === "POST") {
    const unauthorized = checkAdmin(req);
    if (unauthorized) return unauthorized;
    try {
      const body = (await req.json().catch(() => ({}))) as { zone?: string };
      const zoneName = body.zone || DEFAULT_DOMAIN;
      const result = await cfFetch(
        `/zones?name=${encodeURIComponent(zoneName)}`,
        { method: "GET" }
      );
      return Response.json(result.body, {
        status: result.ok ? 200 : result.status,
      });
    } catch (err: unknown) {
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  if (path === "/api/admin/cloudflare/upsert-resend-dns" && method === "POST") {
    const unauthorized = checkAdmin(req);
    if (unauthorized) return unauthorized;
    try {
      const body = (await req.json().catch(() => ({}))) as { domain?: string };
      const domain = body.domain || DEFAULT_DOMAIN;

      // 1. Pull DNS records Resend wants.
      const found = await findResendDomain(domain);
      if (!found) {
        return Response.json(
          {
            error: `Domain ${domain} not found in Resend; call setup-domain first`,
          },
          { status: 404 }
        );
      }
      const detail = await resendFetch(`/domains/${found.id}`, {
        method: "GET",
      });
      const resendDomain = detail.body as ResendDomain;
      const desiredRecords = resendDomain.records || [];

      if (!desiredRecords.length) {
        return Response.json({
          message:
            "Resend returned no records for this domain (already verified?)",
          domain: resendDomain,
        });
      }

      // 2. Look up Cloudflare zone.
      const zoneRes = await cfFetch(
        `/zones?name=${encodeURIComponent(domain)}`,
        { method: "GET" }
      );
      if (!zoneRes.ok) {
        return Response.json(zoneRes.body, { status: zoneRes.status });
      }
      const zones =
        (zoneRes.body as { result?: Array<{ id: string; name: string }> })
          .result || [];
      if (!zones.length) {
        return Response.json(
          { error: `No Cloudflare zone for ${domain}` },
          { status: 404 }
        );
      }
      const zoneId = zones[0].id;

      // 3. List existing DNS records to dedupe.
      const existingRes = await cfFetch(
        `/zones/${zoneId}/dns_records?per_page=200`,
        { method: "GET" }
      );
      const existing =
        (existingRes.body as { result?: CfDnsRecord[] }).result || [];

      const actions: Array<Record<string, unknown>> = [];

      // 4. For each Resend record, upsert.
      for (const r of desiredRecords) {
        // Resend's "name" is e.g. "send.1commerce.online" or
        // "resend._domainkey" — normalize to fully-qualified.
        const fqName = r.name.includes(".")
          ? r.name.replace(
              new RegExp(`\\.${domain.replace(/\./g, "\\.")}$`),
              ""
            ) +
            "." +
            domain
          : `${r.name}.${domain}`;
        // Cloudflare wants the host portion at root or with full FQDN; both work.
        const targetName = fqName === `.${domain}` ? domain : fqName;

        const payload: CfDnsRecord = {
          type: r.type.toUpperCase(),
          name: targetName,
          content: r.value,
          ttl: typeof r.ttl === "number" ? r.ttl : 1, // 1 = auto
          comment:
            "Resend (UnifyOne) — managed by /api/admin/cloudflare/upsert-resend-dns",
        };
        if (r.type.toUpperCase() === "MX" && typeof r.priority === "number") {
          payload.priority = r.priority;
        }

        // Find an existing record with same type+name (and for TXT same content prefix).
        const match = existing.find(e => {
          const sameTypeName =
            e.type.toUpperCase() === payload.type &&
            (e.name === targetName ||
              e.name === targetName.replace(/\.$/, "") ||
              targetName.endsWith(e.name));
          if (!sameTypeName) return false;
          if (payload.type === "TXT") {
            // For TXT, only treat as same if content shares same prefix
            // (e.g. v=spf1 ... or v=DMARC1 ...)
            const ePrefix = (e.content || "").slice(0, 12);
            const pPrefix = payload.content.slice(0, 12);
            return ePrefix === pPrefix;
          }
          return true;
        });

        if (match && match.id) {
          if (
            match.type === payload.type &&
            match.name === payload.name &&
            match.content === payload.content
          ) {
            actions.push({
              action: "noop",
              type: payload.type,
              name: payload.name,
              id: match.id,
            });
            continue;
          }
          const upd = await cfFetch(
            `/zones/${zoneId}/dns_records/${match.id}`,
            {
              method: "PUT",
              body: JSON.stringify(payload),
            }
          );
          actions.push({
            action: "updated",
            type: payload.type,
            name: payload.name,
            id: match.id,
            ok: upd.ok,
            status: upd.status,
            body: upd.ok ? undefined : upd.body,
          });
        } else {
          const cre = await cfFetch(`/zones/${zoneId}/dns_records`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          actions.push({
            action: "created",
            type: payload.type,
            name: payload.name,
            ok: cre.ok,
            status: cre.status,
            body: cre.ok ? undefined : cre.body,
          });
        }
      }

      return Response.json({
        zone_id: zoneId,
        domain,
        actions,
      });
    } catch (err: unknown) {
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  return null;
}
