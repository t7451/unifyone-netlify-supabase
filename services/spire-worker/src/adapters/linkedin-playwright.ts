import { chromium, type Browser, type BrowserContext } from "playwright";
import { createDecipheriv } from "node:crypto";
import { logger } from "../lib/logger.js";

// LinkedIn Articles publisher. Uses a persisted storage state captured
// once via `spire auth linkedin-syndication` (same pattern as directory
// auth). Runs on the Contabo worker — never on Netlify (Playwright
// won't fit in a 10s function budget).
//
// LinkedIn does NOT honor canonical headers on Articles. We set the
// "originally posted at" reference inline at the top of the body so
// the human-visible attribution is still there; the canonical SEO
// signal is partial. That's documented in the platforms.json
// supports_canonical=false flag.

export type LinkedInPublishInput = {
  storageStateEncryptedBase64: string;
  storageEncryptionKey: string;
  title: string;
  body: string;
  /** UnifyOne URL for the inline "Originally posted at" reference. */
  canonicalUrl: string;
  maxParagraphChars?: number;
};

export type LinkedInPublishResult = {
  success: boolean;
  externalUrl?: string;
  error?: string;
};

export async function publishLinkedInArticle(
  input: LinkedInPublishInput
): Promise<LinkedInPublishResult> {
  const maxPara = input.maxParagraphChars ?? 800;

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

    await page.goto("https://www.linkedin.com/article/new/");

    // Top-of-page title field. LinkedIn's selectors change occasionally;
    // we target by aria-label to be more durable than class names.
    await page.waitForSelector("[aria-label*='title' i]", { timeout: 30_000 });
    await page.fill("[aria-label*='title' i]", input.title);

    const editor = await page.waitForSelector(
      "[contenteditable='true'][role='textbox']",
      {
        timeout: 30_000,
      }
    );

    // LinkedIn rejects code blocks > ~500 chars and treats giant paragraphs
    // as spam. Break the body into shorter paragraph chunks before pasting.
    const bodyForLinkedIn = chunkParagraphs(
      formatForLinkedIn(input.body, input.canonicalUrl),
      maxPara
    );
    await editor.click();
    await page.keyboard.type(bodyForLinkedIn, { delay: 5 });

    // Click "Publish" — labeled "Publish" or "Next" depending on UI rev.
    const publishBtn =
      (await page.$("button:has-text('Publish')")) ??
      (await page.$("button:has-text('Next')"));
    if (!publishBtn) {
      return {
        success: false,
        error: "Publish button not found in LinkedIn editor",
      };
    }
    await publishBtn.click();

    // Some flows show a confirmation dialog with another "Publish" button.
    const confirm = await page
      .waitForSelector("button:has-text('Publish')", {
        timeout: 5_000,
        state: "visible",
      })
      .catch(() => null);
    if (confirm) await confirm.click();

    // Wait for navigation to the published article.
    await page.waitForURL(/linkedin\.com\/pulse\//, { timeout: 60_000 });
    const externalUrl = page.url();
    return { success: true, externalUrl };
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "LinkedIn publish crashed"
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

function formatForLinkedIn(markdown: string, canonicalUrl: string): string {
  // Strip Markdown that LinkedIn doesn't handle natively. Keep paragraphs,
  // strip code fences (LinkedIn renders them as flat text anyway), strip
  // image links (LinkedIn requires native image upload, not Markdown).
  const stripped = markdown
    .replace(/```[a-z0-9_-]*\n[\s\S]*?\n```/g, "[code omitted — see original]")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/^#+\s*/gm, ""); // LinkedIn auto-styles, headings just become bold-ish

  return `Originally posted at ${canonicalUrl}\n\n${stripped}`;
}

function chunkParagraphs(text: string, maxChars: number): string {
  // LinkedIn flags walls of text as spam; break long paragraphs into
  // smaller ones at sentence boundaries.
  const paras = text.split(/\n\n+/);
  const out: string[] = [];
  for (const p of paras) {
    if (p.length <= maxChars) {
      out.push(p);
      continue;
    }
    const sentences = p.match(/[^.!?]+[.!?]+/g) ?? [p];
    let buf = "";
    for (const s of sentences) {
      if ((buf + s).length > maxChars) {
        if (buf) out.push(buf.trim());
        buf = s;
      } else {
        buf += s;
      }
    }
    if (buf) out.push(buf.trim());
  }
  return out.join("\n\n");
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
