import { and, eq, sql } from "drizzle-orm";
import {
  buildCanSpamFooter,
  checkDeliverabilityGate,
  loadBusinessProfile,
  recordSent,
  resendSend,
  schema,
} from "@1commerce/spire";
import { logger } from "../lib/logger.js";
import type { Tx } from "../types.js";

const RESEND_OUTREACH_API_KEY = process.env.RESEND_OUTREACH_API_KEY;
const SUPPRESSION_HMAC_SECRET = process.env.OUTREACH_SUPPRESSION_HMAC_SECRET;
const UNSUBSCRIBE_BASE_URL =
  process.env.OUTREACH_UNSUBSCRIBE_BASE_URL ?? "https://1commerce.online";
const BUSINESS_PROFILE_PATH = process.env.BUSINESS_PROFILE_PATH ?? "";

// Polls spire_outreach_messages for status='ready_to_send', sends one per tick
// via Resend, increments volume counter, and writes back state. Jittered
// sleep between sends so cadence doesn't look like a bot.

export interface ProcessNextResult {
  worked: boolean;
  messageId?: string;
  reason?: string;
}

export async function processNextOutreachMessage(
  tx: Tx
): Promise<ProcessNextResult> {
  if (!RESEND_OUTREACH_API_KEY) {
    return { worked: false, reason: "missing_resend_key" };
  }
  if (!SUPPRESSION_HMAC_SECRET) {
    return { worked: false, reason: "missing_hmac_secret" };
  }

  // Atomic claim — FOR UPDATE SKIP LOCKED, one row.
  const claimed = await tx.execute(sql`
    select m.id as message_id,
           m.sequence_id,
           m.step,
           m.subject,
           m.body_text,
           m.attempts,
           m.resend_message_id as own_message_id,
           s.campaign_id,
           s.prospect_id,
           c.from_name,
           c.from_email,
           c.reply_to_email,
           c.daily_send_cap,
           p.prospect_contact_email as recipient_email,
           p.domain as recipient_domain,
           prev.resend_message_id as prev_resend_id,
           prev.subject as prev_subject
      from spire_outreach_messages m
      join spire_outreach_sequences s on s.id = m.sequence_id
      join spire_outreach_campaigns c on c.id = s.campaign_id
      join spire_outreach_prospects p on p.id = s.prospect_id
      left join spire_outreach_messages prev
        on prev.sequence_id = m.sequence_id
       and prev.step = m.step - 1
       and prev.status = 'sent'
     where m.status = 'ready_to_send'
     order by m.scheduled_for asc
     limit 1
       for update of m skip locked
  `);

  const rows = (claimed as unknown as { rows?: Array<Record<string, unknown>> })
    .rows as Array<Record<string, unknown>> | undefined;
  if (!rows || rows.length === 0) return { worked: false };

  const row = rows[0]!;
  const messageId = row.message_id as string;
  const recipientEmail = (row.recipient_email as string | null) ?? "";
  const recipientDomain = (row.recipient_domain as string) ?? "";
  const campaignId = row.campaign_id as string;
  const attempts = (row.attempts as number) ?? 0;

  // Re-run the gate inside the transaction (race-safe).
  const gate = await checkDeliverabilityGate({
    db: tx as never,
    campaignId,
    recipientEmail,
    recipientDomain,
  });
  if (!gate.ok) {
    await tx
      .update(schema.outreachMessages)
      .set({
        status: gate.reason === "cap_exceeded" ? "scheduled" : "suppressed",
        error: `gate:${gate.reason}`,
      })
      .where(eq(schema.outreachMessages.id, messageId));
    return { worked: true, messageId, reason: gate.reason };
  }

  if (!BUSINESS_PROFILE_PATH) {
    return { worked: false, reason: "missing_business_profile_path" };
  }
  const profile = loadBusinessProfile(BUSINESS_PROFILE_PATH);
  const footer = buildCanSpamFooter({
    profile,
    recipientEmail,
    hmacSecret: SUPPRESSION_HMAC_SECRET,
    unsubscribeBaseUrl: UNSUBSCRIBE_BASE_URL,
  });

  const subject = row.subject as string;
  const bodyWithFooter = `${row.body_text as string}${footer}`;

  const prevResendId = row.prev_resend_id as string | null;

  const sendRes = await resendSend({
    apiKey: RESEND_OUTREACH_API_KEY,
    from: `${row.from_name as string} <${row.from_email as string}>`,
    to: recipientEmail,
    replyTo: row.reply_to_email as string,
    subject,
    text: bodyWithFooter,
    inReplyTo: prevResendId ?? undefined,
    references: prevResendId ? [prevResendId] : undefined,
  });

  if (sendRes.ok && sendRes.messageId) {
    await tx
      .update(schema.outreachMessages)
      .set({
        status: "sent",
        sentAt: new Date(),
        resendMessageId: sendRes.messageId,
        error: null,
      })
      .where(eq(schema.outreachMessages.id, messageId));
    await recordSent(tx as never, campaignId);
    logger.info(
      { messageId, recipientDomain, campaignId },
      "Outreach send: sent"
    );
    return { worked: true, messageId };
  }

  if (sendRes.retryable) {
    await tx
      .update(schema.outreachMessages)
      .set({
        attempts: attempts + 1,
        error: sendRes.error ?? "send_failed_retryable",
      })
      .where(eq(schema.outreachMessages.id, messageId));
    logger.warn(
      { messageId, error: sendRes.error, attempts: attempts + 1 },
      "Outreach send: retryable error"
    );
    return { worked: true, messageId, reason: "retry" };
  }

  await tx
    .update(schema.outreachMessages)
    .set({
      status: "failed",
      error: sendRes.error ?? "send_failed",
    })
    .where(eq(schema.outreachMessages.id, messageId));
  logger.error(
    { messageId, error: sendRes.error, status: sendRes.status },
    "Outreach send: permanent failure"
  );
  return { worked: true, messageId, reason: "failed" };
}

type DbWithTx = {
  transaction: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
};
type RawSql = { end: (opts?: { timeout?: number }) => Promise<void> };

export async function senderLoop(
  connect: () => { sql: RawSql; db: DbWithTx },
  shouldExit: () => boolean
): Promise<void> {
  const { sql: raw, db } = connect();
  try {
    while (!shouldExit()) {
      let didWork = false;
      try {
        await db.transaction(async tx => {
          const out = await processNextOutreachMessage(tx);
          didWork = out.worked;
        });
      } catch (err) {
        logger.error(
          { err: err instanceof Error ? err.message : String(err) },
          "Outreach sender tick failed"
        );
      }
      // Jittered cadence: 90-180s between sends. Constant cadence looks like
      // a bot to mailbox providers and to humans glancing at message timing.
      const sleepSec = didWork ? 90 + Math.floor(Math.random() * 91) : 60;
      await new Promise(r => setTimeout(r, sleepSec * 1000));
    }
  } finally {
    await raw.end({ timeout: 5 });
  }
}

void and;
