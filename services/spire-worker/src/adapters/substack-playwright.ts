import { chromium, type Browser, type BrowserContext } from "playwright";
import { createDecipheriv } from "node:crypto";
import { logger } from "../lib/logger.js";

// Substack publisher. Like LinkedIn, no API; runs via Playwright on the
// Contabo worker. Substack DOES expose a canonical_url field in the SEO
// settings panel (renders as a meta tag, not a true rel=canonical on the
// page <head>), but we still fill it — partial signal is better than none.

export type SubstackPublishInput = {
  storageStateEncryptedBase64: string;
  storageEncryptionKey: string;
  publicationSubdomain: string; // e.g. "unifyone" → unifyone.substack.com
  title: string;
  /** Subtitle is optional; falls back to the brief description. */
  subtitle: string;
  bodyMarkdown: string;
  canonicalUrl: string;
};

export type SubstackPublishResult = {
  success: boolean;
  externalUrl?: string;
  error?: string;
};

export async function publishSubstackPost(
  input: SubstackPublishInput
): Promise<SubstackPublishResult> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const storageState = decryptStorageState(
      input.storageStateEncryptedBase64,
      input.storageEncryptionKey
    );
    context = await browser.newContext({
      storageState: JSON.parse(storageState),
    });
    const page = await context.newPage();

    await page.goto(
      `https://${input.publicationSubdomain}.substack.com/publish/post`
    );

    // Title + subtitle. Substack uses contenteditable divs, addressed by
    // their unique placeholder text; this is more stable than class names.
    await page.waitForSelector(
      "textarea[placeholder*='title' i], [data-placeholder*='title' i]",
      {
        timeout: 30_000,
      }
    );
    await page
      .fill("textarea[placeholder*='title' i]", input.title)
      .catch(async () => {
        const el = await page.$("[data-placeholder*='title' i]");
        if (el) {
          await el.click();
          await page.keyboard.type(input.title);
        }
      });
    if (input.subtitle) {
      const subtitleEl = await page.$("[data-placeholder*='subtitle' i]");
      if (subtitleEl) {
        await subtitleEl.click();
        await page.keyboard.type(input.subtitle);
      }
    }

    // Body — Substack's editor is a Slate-derived rich text field. We type
    // raw Markdown; Substack auto-converts headings, lists, and links
    // when you press Enter / space after the syntax. Code fences end up
    // as plain text but readable.
    const editor = await page.waitForSelector(
      "[data-test='editor-content'] [contenteditable]",
      {
        timeout: 30_000,
      }
    );
    await editor.click();
    // Strip frontmatter; type slowly enough that Markdown auto-conversion fires.
    const body = `Originally posted at ${input.canonicalUrl}\n\n${input.bodyMarkdown}`;
    await page.keyboard.type(body, { delay: 4 });

    // SEO panel — set canonical_url. Substack hides this behind a "Settings"
    // button; clicking opens a side panel with the SEO section.
    const settingsBtn = await page.$("button:has-text('Settings')");
    if (settingsBtn) {
      await settingsBtn.click();
      const canonicalInput = await page
        .waitForSelector(
          "input[placeholder*='canonical' i], input[name*='canonical' i]",
          { timeout: 10_000 }
        )
        .catch(() => null);
      if (canonicalInput) await canonicalInput.fill(input.canonicalUrl);
      // Close the side panel.
      const closeBtn = await page.$("button[aria-label='Close']");
      await closeBtn?.click();
    }

    // Continue → Send → Publish flow. Labels rotate; do best-effort sequence.
    for (const label of [
      "Continue",
      "Send",
      "Publish",
      "Send to everyone now",
    ]) {
      const btn = await page.$(`button:has-text('${label}')`).catch(() => null);
      if (btn) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }

    // Wait for the post URL to appear (Substack redirects to the published post).
    await page.waitForURL(/\/p\//, { timeout: 60_000 });
    const externalUrl = page.url();
    return { success: true, externalUrl };
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "Substack publish crashed"
    );
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
  }
}

function decryptStorageState(encryptedBase64: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  if (key.length !== 32)
    throw new Error("STORAGE_STATE_ENCRYPTION_KEY must decode to 32 bytes");
  const blob = Buffer.from(encryptedBase64, "base64");
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}
