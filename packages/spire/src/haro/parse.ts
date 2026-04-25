import { z } from "zod";

// HARO emails arrive in a stable text format with N "queries" per email
// (~30-60 in a typical Master daily). Each query block looks roughly:
//
//   1) Subject: <free text>
//   Name: <reporter name>
//   Category: <category>
//   Email: <anonymized@helpareporter.com>
//   Media Outlet: <outlet>
//   Deadline: <Day, Month DD, YYYY HH:MMam/pm EST>
//   Query:
//   <body, 1-30 lines>
//   Requirements:
//   <bullets>
//
// Numbering changes (e.g. "1)" vs "01)") and some headers go missing on
// older emails. The parser is permissive: regex blocks first, then for
// each block it tries to extract each header — anything unparseable falls
// through as raw `query_body` so the operator can still review.

export type ParsedHaroQuery = {
  index: number;
  subject: string;
  reporter_name: string | null;
  reporter_email: string | null;
  outlet: string | null;
  category: string | null;
  deadline_iso: string | null;
  query_body: string;
};

const ParsedHaroQuerySchema = z.object({
  index: z.number().int(),
  subject: z.string().min(1),
  reporter_name: z.string().nullable(),
  reporter_email: z.string().email().nullable().or(z.string().nullable()),
  outlet: z.string().nullable(),
  category: z.string().nullable(),
  deadline_iso: z.string().nullable(),
  query_body: z.string().min(1),
});

export function parseHaroEmail(rawBody: string): ParsedHaroQuery[] {
  // Normalize: collapse CRLF, strip leading footer/HTML wrapping if present.
  const text = rawBody
    .replace(/\r\n/g, "\n")
    // HARO sometimes sends multipart with HTML; strip basic tags so the
    // text parser sees a usable body. Not a full HTML→text — just enough.
    .replace(/<\/?[a-z][^>]*>/gi, " ")
    .replace(/&nbsp;/gi, " ");

  // Split on numbered query headers. Anchored to start of line:
  //   "1)" / "01)" / "1." / "01." with optional leading whitespace.
  const blocks = text.split(/\n\s*(?=\d{1,3}[).]\s+(?:Subject|SUBJECT)\s*:)/);

  const out: ParsedHaroQuery[] = [];
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    const idxMatch = block.match(/^(\d{1,3})[).]/);
    if (!idxMatch) continue;
    const index = Number(idxMatch[1]);

    const subject = pickHeader(block, "Subject");
    if (!subject) continue;

    const reporterName = pickHeader(block, "Name");
    const reporterEmail = pickEmail(pickHeader(block, "Email"));
    const outlet =
      pickHeader(block, "Media Outlet") ?? pickHeader(block, "Outlet");
    const category = pickHeader(block, "Category");
    const deadlineRaw = pickHeader(block, "Deadline");
    const deadlineIso = parseHaroDeadline(deadlineRaw);

    const queryBody = extractQueryBody(block);
    if (!queryBody) continue;

    const candidate: ParsedHaroQuery = {
      index,
      subject,
      reporter_name: reporterName,
      reporter_email: reporterEmail,
      outlet,
      category,
      deadline_iso: deadlineIso,
      query_body: queryBody,
    };
    const parsed = ParsedHaroQuerySchema.safeParse(candidate);
    if (parsed.success) out.push(parsed.data as ParsedHaroQuery);
  }

  return out;
}

function pickHeader(block: string, label: string): string | null {
  // Match: `<label>:` followed by the rest of the line (and optionally
  // continuation lines until the next header). HARO headers are one-line
  // except Query/Requirements which we extract separately.
  const re = new RegExp(`^\\s*${escapeRegex(label)}\\s*:\\s*([^\\n]+)`, "im");
  const m = block.match(re);
  return m ? m[1]!.trim() : null;
}

function pickEmail(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0] : s.trim() || null;
}

function extractQueryBody(block: string): string {
  // Body is everything between "Query:" and "Requirements:" (or end of block
  // if Requirements is absent). HARO sometimes uses "QUERY:" all-caps.
  const start = block.search(/^\s*Query\s*:\s*$|^\s*QUERY\s*:\s*$/m);
  if (start === -1) return "";
  const after = block.slice(start).split("\n").slice(1).join("\n");
  const reqIdx = after.search(/^\s*(Requirements|REQUIREMENTS)\s*:\s*$/m);
  const body = reqIdx === -1 ? after : after.slice(0, reqIdx);
  return body.trim();
}

function parseHaroDeadline(raw: string | null): string | null {
  if (!raw) return null;
  // Common HARO format: "Tuesday, May 6, 2026 5:00 PM EST"
  const cleaned = raw.replace(/ /g, " ").replace(/\s+/g, " ").trim();
  const date = new Date(cleaned);
  if (!Number.isNaN(date.getTime())) return date.toISOString();
  // Fallback: just the date portion.
  const dateOnly = cleaned.match(/(\w+,\s+\w+\s+\d{1,2},\s+\d{4})/);
  if (dateOnly) {
    const d = new Date(dateOnly[1]!);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Detect which inbound-email source a body came from. Source-specific
 * subject patterns; sender-domain patterns for SourceBottle / Qwoted.
 */
export function detectSource(
  senderEmail: string,
  subject: string
): "haro" | "sourcebottle" | "qwoted" | "manual" {
  const sender = senderEmail.toLowerCase();
  if (sender.includes("helpareporter.com") || /HARO/i.test(subject))
    return "haro";
  if (sender.includes("sourcebottle.com")) return "sourcebottle";
  if (sender.includes("qwoted.com")) return "qwoted";
  return "manual";
}
