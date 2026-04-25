// Minimal Resend transactional API client for outreach sends. Uses the same
// Resend account as the rest of the system but expects a separate API key
// scoped to the outreach.unifyone.com domain (RESEND_OUTREACH_API_KEY) so a
// reputation hit on outreach can't take down transactional + marketing.

import { logger } from "../../lib/logger.js";

export interface ResendSendInput {
  apiKey: string;
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  // Threading: when sending follow-up step 1 / step 2, set inReplyTo to the
  // step-0 Message-ID so Gmail/Outlook thread the conversation.
  inReplyTo?: string;
  references?: string[];
  baseUrl?: string;
}

export interface ResendSendResult {
  ok: boolean;
  messageId?: string;
  status?: number;
  error?: string;
  retryable?: boolean;
}

interface ResendOkBody {
  id?: string;
}
interface ResendErrBody {
  message?: string;
  name?: string;
}

export async function resendSend({
  apiKey,
  from,
  to,
  replyTo,
  subject,
  text,
  html,
  inReplyTo,
  references,
  baseUrl = "https://api.resend.com",
}: ResendSendInput): Promise<ResendSendResult> {
  const headers: Record<string, string> = inReplyTo
    ? {
        "In-Reply-To": inReplyTo,
        ...(references && references.length > 0
          ? { References: references.join(" ") }
          : {}),
      }
    : {};

  const body: Record<string, unknown> = {
    from,
    to,
    subject,
    text,
  };
  if (html) body.html = html;
  if (replyTo) body.reply_to = replyTo;
  if (Object.keys(headers).length > 0) body.headers = headers;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/emails`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      retryable: true,
    };
  }

  if (res.ok) {
    const ok = (await res.json()) as ResendOkBody;
    return { ok: true, messageId: ok.id, status: res.status };
  }

  let err: ResendErrBody = {};
  try {
    err = (await res.json()) as ResendErrBody;
  } catch {
    /* no-op — non-JSON error body */
  }
  const retryable = res.status >= 500;
  logger.warn(
    {
      status: res.status,
      message: err.message,
      to,
      retryable,
    },
    "Resend outreach send failed"
  );
  return {
    ok: false,
    status: res.status,
    error: err.message ?? `http_${res.status}`,
    retryable,
  };
}
