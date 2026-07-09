/**
 * Cathedral Blueprint lead-magnet email
 *
 * Sent immediately when someone submits the landing-page "Get the Cathedral
 * Blueprint" form (server/routers/leads.ts → submit, source ===
 * "landing_page_blueprint").
 *
 * Delivery options (in order of preference):
 *  1. If BLUEPRINT_DOWNLOAD_URL is set, the email links to that URL (use this
 *     when the PDF is hosted on a CDN / S3 so you don't have to redeploy to
 *     update the file).
 *  2. Otherwise the email attaches the PDF at server/assets/cathedral-blueprint.pdf.
 *
 * Resend is required (RESEND_API_KEY). When the key is absent the function
 * returns { success: false } so the caller can log it without throwing.
 */

import { Resend } from "resend";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getAppUrl } from "./env";

const FROM = "UnifyOne <hello@1commerce.online>";
const SUBJECT = "Your Cathedral Blueprint is inside";

// Note: do NOT name this `__dirname`. When esbuild bundles this module into
// the Netlify function as ESM, it injects its own `const __dirname` shim for
// CommonJS interop; a same-named top-level declaration here collides with it
// ("Identifier '__dirname' has already been declared"), crashing the entire
// /api/* function at load.
const moduleDir = dirname(fileURLToPath(import.meta.url));
const PDF_PATH = resolve(moduleDir, "..", "assets", "cathedral-blueprint.pdf");

function html(downloadUrl: string | null): string {
  const cta = downloadUrl
    ? `<a href="${downloadUrl}" style="display:inline-block;background:#D4A843;color:#020202;padding:14px 36px;text-decoration:none;font-family:'Cinzel',sans-serif;font-size:14px;letter-spacing:0.1em;font-weight:600;">DOWNLOAD THE BLUEPRINT</a>`
    : `<p style="margin:24px 0;font-size:14px;color:#9A9A9A;">The PDF is attached to this email.</p>`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Your Cathedral Blueprint</title>
  </head>
  <body style="margin:0;padding:0;background:#020202;color:#F0E8D0;font-family:'Crimson Pro',Georgia,serif;line-height:1.6;">
    <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
      <div style="text-align:center;margin-bottom:32px;border-bottom:1px solid rgba(212,168,67,0.2);padding-bottom:24px;">
        <h1 style="font-family:'Cinzel',serif;font-size:30px;margin:0;color:#D4A843;letter-spacing:0.05em;">CATHEDRAL BLUEPRINT</h1>
        <p style="margin:8px 0 0;font-size:12px;letter-spacing:0.12em;color:#9A9A9A;">UNIFYONE ARCHITECTURE GUIDE</p>
      </div>
      <p style="font-size:16px;">Thanks for grabbing the blueprint.</p>
      <p style="font-size:16px;">Inside the PDF you'll find the full architecture behind UnifyOne — the system built to give gig and 1099 workers earnings clarity and tax confidence:</p>
      <ul style="font-size:15px;padding-left:20px;">
        <li>Gig income intelligence layer (GigIQ, Tax Autopilot, Money Manager)</li>
        <li>AI routing via Vercel AI Gateway &amp; Kai, your earnings copilot</li>
        <li>Sequential construction (the Six Pillars)</li>
        <li>Multi-tenant data model &amp; isolation guarantees (optional commerce add-on)</li>
        <li>Webhook-first integrations (Stripe, Shopify, PayPal, Square)</li>
      </ul>
      <div style="text-align:center;margin:36px 0;">${cta}</div>
      <p style="font-size:14px;color:#9A9A9A;">When you're ready to see it running, <a href="${getAppUrl()}/begin" style="color:#D4A843;text-decoration:none;">start your free tenant</a> — the first tenant is free forever.</p>
      <div style="margin-top:48px;padding-top:20px;border-top:1px solid rgba(212,168,67,0.1);font-size:12px;color:#7A7A7A;text-align:center;">
        <p style="margin:4px 0;">© PNW Enterprises / 1Commerce LLC</p>
        <p style="margin:4px 0;"><a href="${getAppUrl()}/unsubscribe" style="color:#7A7A7A;text-decoration:none;">Unsubscribe</a></p>
      </div>
    </div>
  </body>
</html>`;
}

function text(downloadUrl: string | null): string {
  const link = downloadUrl
    ? `Download: ${downloadUrl}`
    : "Your PDF is attached to this email.";
  return [
    "Thanks for grabbing the Cathedral Blueprint.",
    "",
    "Inside the PDF you'll find the full architecture behind UnifyOne — the",
    "system built to give gig and 1099 workers earnings clarity and tax",
    "confidence:",
    "",
    "  • Gig income intelligence layer (GigIQ, Tax Autopilot, Money Manager)",
    "  • AI routing via Vercel AI Gateway & Kai, your earnings copilot",
    "  • Sequential construction (the Six Pillars)",
    "  • Multi-tenant data model & isolation (optional commerce add-on)",
    "  • Webhook-first integrations (Stripe, Shopify, PayPal, Square)",
    "",
    link,
    "",
    `Start your free tenant: ${getAppUrl()}/begin`,
    "",
    "— UnifyOne",
  ].join("\n");
}

export async function sendBlueprintEmail(
  to: string
): Promise<{ success: boolean; error?: string; emailId?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "Blueprint email disabled: RESEND_API_KEY is not configured",
    };
  }

  const resend = new Resend(apiKey);
  const externalUrl = process.env.BLUEPRINT_DOWNLOAD_URL?.trim() || null;

  // Build attachments only when we don't have an external URL
  let attachments: Array<{ filename: string; content: string }> | undefined;
  if (!externalUrl) {
    try {
      const buf = await readFile(PDF_PATH);
      attachments = [
        {
          filename: "UnifyOne-Cathedral-Blueprint.pdf",
          content: buf.toString("base64"),
        },
      ];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[Blueprint] Could not read PDF at ${PDF_PATH}: ${msg}. Sending email without attachment.`
      );
    }
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to,
      subject: SUBJECT,
      html: html(externalUrl),
      text: text(externalUrl),
      ...(attachments ? { attachments } : {}),
    });

    if (result.error) {
      console.error(`[Blueprint] Resend error for ${to}:`, result.error);
      return { success: false, error: result.error.message };
    }
    console.log(`[Blueprint] Sent to ${to} (id=${result.data?.id ?? "n/a"})`);
    return { success: true, emailId: result.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Blueprint] Unexpected error for ${to}:`, msg);
    return { success: false, error: msg };
  }
}
