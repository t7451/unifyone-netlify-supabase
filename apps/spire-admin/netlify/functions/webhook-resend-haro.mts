import type { Config } from "@netlify/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  classifyHaroQuery,
  connectNeon,
  createAnthropic,
  detectHaroSource,
  draftHaroResponse,
  logger,
  parseHaroEmail,
  schema,
} from "@1commerce/spire";

// Resend inbound webhook. Resend posts the parsed email body as JSON
// with a Svix-format signature header (Resend uses Svix under the hood
// for inbound delivery). We verify with RESEND_INBOUND_WEBHOOK_SECRET,
// parse the email body into N HARO query records, classify each, draft
// responses for high-score matches, and persist.

export const config: Config = {
  path: "/api/webhooks/resend-haro",
};

type ResendInboundPayload = {
  type?: string;
  data?: {
    from?: { email?: string; name?: string };
    to?: Array<{ email?: string; name?: string }>;
    subject?: string;
    "message-id"?: string;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
  };
};

export default async (req: Request) => {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("RESEND_INBOUND_WEBHOOK_SECRET not set", { status: 500 });
  }
  const neonUrl = process.env.NEON_DATABASE_URL;
  if (!neonUrl) return new Response("NEON_DATABASE_URL not set", { status: 500 });

  const body = await req.text();
  if (!verifySvixSignature(req.headers, body, secret)) {
    logger.warn("Unauthorized HARO webhook (signature mismatch)");
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let payload: ResendInboundPayload;
  try {
    payload = JSON.parse(body) as ResendInboundPayload;
  } catch {
    return new Response("invalid JSON", { status: 400 });
  }

  const data = payload.data ?? {};
  const senderEmail = data.from?.email ?? "";
  const subject = data.subject ?? "";
  const messageId = data["message-id"] ?? data.headers?.["Message-ID"] ?? data.headers?.["message-id"] ?? null;
  const emailText = data.text ?? data.html ?? "";

  const source = detectHaroSource(senderEmail, subject);
  if (source === "manual") {
    logger.warn({ senderEmail, subject }, "Inbound email did not match a known HARO/SourceBottle/Qwoted pattern; skipping");
    return new Response(JSON.stringify({ ok: true, skipped: "unknown source" }), {
      headers: { "content-type": "application/json" },
    });
  }

  const queries = parseHaroEmail(emailText);
  if (queries.length === 0) {
    logger.warn({ senderEmail, subject }, "Parser found 0 queries in HARO email; storing raw body for manual review");
  }

  const { sql: raw, db } = connectNeon(neonUrl);
  let inserted = 0;
  let drafted = 0;
  let skippedDup = 0;

  // Need an Anthropic client for classify + draft. If the key is missing,
  // we still ingest opportunities but skip classification — the row is
  // useful even without a score.
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const anthropic = anthropicKey ? createAnthropic(anthropicKey) : null;
  const model = process.env.SPIRE_MODEL ?? "claude-opus-4-7";
  const siteSlug = process.env.HARO_SITE_SLUG ?? "unifyone";

  try {
    for (const q of queries) {
      // Build a per-query message id so multiple queries from the same
      // email each get a unique uniqueness key.
      const perQueryId = `${messageId ?? "no-msg-id"}#${q.index}`;

      let classification: { matched_clusters: string[]; match_score: number; rationale: string } = {
        matched_clusters: [],
        match_score: 0,
        rationale: "Classifier unavailable (ANTHROPIC_API_KEY not set on this function).",
      };
      if (anthropic) {
        try {
          classification = await classifyHaroQuery({
            db,
            anthropic,
            model,
            query: q,
            siteSlug,
          });
        } catch (err) {
          logger.warn(
            { err: err instanceof Error ? err.message : String(err) },
            "HARO classify failed; recording opportunity with score=0"
          );
        }
      }

      let drafts: unknown = null;
      if (anthropic && classification.match_score >= 60) {
        try {
          const result = await draftHaroResponse({
            db,
            anthropic,
            model,
            query: q,
            siteSlug,
            matchedClusters: classification.matched_clusters,
          });
          drafts = result;
          if (result) drafted += 1;
        } catch (err) {
          logger.warn(
            { err: err instanceof Error ? err.message : String(err) },
            "HARO draft failed; saving opportunity without drafts"
          );
        }
      }

      try {
        await db
          .insert(schema.prOpportunities)
          .values({
            source,
            sourceMessageId: perQueryId,
            outlet: q.outlet,
            reporterName: q.reporter_name,
            reporterEmail: q.reporter_email,
            querySubject: q.subject,
            queryBody: q.query_body,
            deadline: q.deadline_iso ? new Date(q.deadline_iso) : null,
            matchedClusters: classification.matched_clusters,
            matchScore: classification.match_score,
            matchRationale: classification.rationale,
            draftedResponses: drafts as Record<string, unknown> | null,
            status: classification.match_score >= 60 ? "qualified" : "new",
          });
        inserted += 1;
      } catch (err) {
        // Most likely the unique (source, source_message_id) violation —
        // we've already ingested this query in a prior delivery.
        skippedDup += 1;
        logger.debug(
          {
            perQueryId,
            err: err instanceof Error ? err.message : String(err),
          },
          "HARO opportunity skipped (likely duplicate)"
        );
      }
    }
  } finally {
    await raw.end({ timeout: 5 });
  }

  logger.info(
    { source, queries: queries.length, inserted, drafted, skippedDup },
    "HARO inbound processed"
  );
  return new Response(
    JSON.stringify({ ok: true, source, queries: queries.length, inserted, drafted, skippedDup }),
    { headers: { "content-type": "application/json" } }
  );
};

// --- Svix signature verification ---
// Resend inbound uses Svix-style headers: svix-id, svix-timestamp,
// svix-signature. The signature is HMAC-SHA256 of `${id}.${timestamp}.${body}`
// keyed with the secret, base64-encoded, prefixed with `v1,`.

function verifySvixSignature(headers: Headers, body: string, secret: string): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const sigHeader = headers.get("svix-signature");
  if (!id || !timestamp || !sigHeader) return false;

  // Reject very old/fragile signatures (more than 5 min skew suggests replay).
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    return false;
  }

  const decodedSecret = secret.startsWith("whsec_")
    ? Buffer.from(secret.replace(/^whsec_/, ""), "base64")
    : Buffer.from(secret, "utf8");

  const message = `${id}.${timestamp}.${body}`;
  const computed = createHmac("sha256", decodedSecret).update(message).digest("base64");

  // Header may carry multiple sigs space-separated; any match passes.
  for (const part of sigHeader.split(" ")) {
    const [, sig] = part.split(",");
    if (!sig) continue;
    try {
      if (timingSafeEqual(Buffer.from(sig), Buffer.from(computed))) return true;
    } catch {
      continue;
    }
  }
  return false;
}
