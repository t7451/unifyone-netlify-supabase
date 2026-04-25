import type { Config } from "@netlify/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq, sql as drizzleSql } from "drizzle-orm";
import {
  classifyReply,
  connectNeon,
  createAnthropic,
  dispositionReply,
  logger,
  schema,
} from "@1commerce/spire";

// Resend inbound webhook for outreach replies. Resolves which message the
// inbound is replying to (via In-Reply-To / References headers, falling back
// to From + Subject), inserts a reply row, runs classification + disposition.

export const config: Config = {
  path: "/api/webhooks/resend-replies",
};

interface ResendInboundPayload {
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
}

export default async (req: Request) => {
  const secret = process.env.RESEND_INBOUND_REPLIES_SECRET;
  if (!secret) {
    return new Response("RESEND_INBOUND_REPLIES_SECRET not set", {
      status: 500,
    });
  }
  const neonUrl = process.env.NEON_DATABASE_URL;
  if (!neonUrl) return new Response("NEON_DATABASE_URL not set", { status: 500 });

  const body = await req.text();
  if (!verifySvixSignature(req.headers, body, secret)) {
    logger.warn("Unauthorized outreach reply webhook (signature mismatch)");
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
  const fromEmail = (data.from?.email ?? "").toLowerCase().trim();
  const subject = data.subject ?? "";
  const replyText = data.text ?? data.html ?? "";
  const inReplyTo =
    data.headers?.["In-Reply-To"] ?? data.headers?.["in-reply-to"] ?? null;
  const references =
    data.headers?.["References"] ?? data.headers?.["references"] ?? "";
  const refIds = references
    .split(/\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  if (!fromEmail) {
    return new Response(
      JSON.stringify({ ok: false, error: "missing_from" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const { sql: raw, db } = connectNeon(neonUrl);

  try {
    // Resolve the originating message. Try In-Reply-To first, then any
    // References ID, then From + Subject heuristic.
    const candidateIds = [inReplyTo, ...refIds]
      .filter((s): s is string => Boolean(s))
      .map(s => s.replace(/^<|>$/g, ""));

    let messageRow:
      | {
          id: string;
          sequenceId: string;
          subject: string;
        }
      | undefined;

    for (const candidate of candidateIds) {
      const rows = await db
        .select({
          id: schema.outreachMessages.id,
          sequenceId: schema.outreachMessages.sequenceId,
          subject: schema.outreachMessages.subject,
        })
        .from(schema.outreachMessages)
        .where(eq(schema.outreachMessages.resendMessageId, candidate))
        .limit(1);
      if (rows.length > 0) {
        messageRow = rows[0]!;
        break;
      }
    }

    if (!messageRow) {
      // Fallback: From + Subject (strip Re:/Fwd:).
      const cleanSubj = subject.replace(/^(re:\s*|fw:\s*)+/i, "").trim();
      const rows = await db.execute(drizzleSql`
        select m.id as id, m.sequence_id as sequence_id, m.subject as subject
          from spire_outreach_messages m
          join spire_outreach_sequences s on s.id = m.sequence_id
          join spire_outreach_prospects p on p.id = s.prospect_id
         where p.prospect_contact_email = ${fromEmail}
           and m.status = 'sent'
           and (m.subject = ${cleanSubj} or m.subject = ${subject})
         order by m.sent_at desc
         limit 1
      `);
      const heur = (rows as unknown as { rows?: Array<Record<string, unknown>> })
        .rows;
      if (heur && heur.length > 0) {
        messageRow = {
          id: heur[0]!.id as string,
          sequenceId: heur[0]!.sequence_id as string,
          subject: heur[0]!.subject as string,
        };
      }
    }

    if (!messageRow) {
      logger.warn(
        { fromEmail, subject, candidateIds },
        "Outreach reply: no matching message; storing as orphan"
      );
      // Still insert the reply, but with null sequence_id won't satisfy the FK,
      // so we just skip — rare and a manual review case.
      return new Response(
        JSON.stringify({ ok: true, skipped: "no_match" }),
        { headers: { "content-type": "application/json" } }
      );
    }

    // Look up sequence → prospect for FK.
    const seqRow = await db
      .select()
      .from(schema.outreachSequences)
      .where(eq(schema.outreachSequences.id, messageRow.sequenceId))
      .limit(1);
    if (seqRow.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "sequence_missing" }),
        { headers: { "content-type": "application/json" } }
      );
    }

    // Truncate body for storage hygiene; keep classification + rationale full.
    const truncatedBody = replyText.slice(0, 16_000);

    let classification: {
      classification: string;
      confidence: number;
      rationale: string;
    } = {
      classification: "other",
      confidence: 0,
      rationale: "Classifier unavailable (ANTHROPIC_API_KEY not set).",
    };
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const anthropic = anthropicKey ? createAnthropic(anthropicKey) : null;
    const model = process.env.SPIRE_MODEL ?? "claude-opus-4-7";
    if (anthropic) {
      try {
        classification = await classifyReply({
          anthropic,
          model,
          fromEmail,
          subject,
          bodyText: truncatedBody,
        });
      } catch (err) {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          "classifyReply threw"
        );
      }
    }

    const inserted = await db
      .insert(schema.outreachReplies)
      .values({
        messageId: messageRow.id,
        sequenceId: messageRow.sequenceId,
        prospectId: seqRow[0]!.prospectId,
        fromEmail,
        inReplyTo,
        subject,
        bodyText: truncatedBody,
        classification: classification.classification,
        classificationConfidence: classification.confidence.toFixed(3),
        classificationRationale: classification.rationale,
      })
      .returning({ id: schema.outreachReplies.id });

    if (anthropic && inserted[0]) {
      try {
        await dispositionReply({
          db,
          anthropic,
          model,
          replyId: inserted[0].id,
        });
      } catch (err) {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          "dispositionReply threw"
        );
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        replyId: inserted[0]?.id,
        classification: classification.classification,
      }),
      { headers: { "content-type": "application/json" } }
    );
  } finally {
    await raw.end({ timeout: 5 });
  }
};

function verifySvixSignature(
  headers: Headers,
  body: string,
  secret: string
): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const sigHeader = headers.get("svix-signature");
  if (!id || !timestamp || !sigHeader) return false;

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    return false;
  }

  const decodedSecret = secret.startsWith("whsec_")
    ? Buffer.from(secret.replace(/^whsec_/, ""), "base64")
    : Buffer.from(secret, "utf8");

  const message = `${id}.${timestamp}.${body}`;
  const computed = createHmac("sha256", decodedSecret)
    .update(message)
    .digest("base64");

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
