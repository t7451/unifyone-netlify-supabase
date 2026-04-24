import { chromium, type Browser, type BrowserContext } from "playwright";
import { createDecipheriv } from "node:crypto";
import type {
  FormMethodConfig,
  FormStep,
  SubmissionPayload,
} from "@1commerce/spire";
import { logger } from "../lib/logger.js";

// Playwright runner. Iterates method_config.steps, substitutes {placeholder}
// tokens against the payload, screenshots on failure, always closes the
// browser. Returns `{ success, liveUrl?, screenshotBase64? }`.

export type FormSubmitResult = {
  success: boolean;
  liveUrl?: string;
  screenshotBase64?: string;
  error?: string;
};

export async function submitViaForm(input: {
  config: FormMethodConfig;
  payload: SubmissionPayload;
  storageEncryptionKey: string | undefined;
  directoryUrl: string;
}): Promise<FormSubmitResult> {
  const { config, payload, storageEncryptionKey, directoryUrl } = input;

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      // Needed in Docker (mcr.microsoft.com/playwright ships with sandbox deps,
      // but running as non-root inside the container still requires this).
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // Load saved auth state if the directory needs it.
    if (config.requires_auth) {
      if (!config.storage_state_encrypted) {
        return {
          success: false,
          error: `Directory requires auth but no storage state captured. Run: spire auth <slug>`,
        };
      }
      if (!storageEncryptionKey) {
        return {
          success: false,
          error:
            "STORAGE_STATE_ENCRYPTION_KEY not set on worker — cannot decrypt auth state",
        };
      }
      const storageState = decryptStorageState(
        config.storage_state_encrypted,
        storageEncryptionKey
      );
      context = await browser.newContext({
        storageState: JSON.parse(storageState),
      });
    } else {
      context = await browser.newContext();
    }

    const page = await context.newPage();

    for (const step of config.steps) {
      try {
        await runStep(step, {
          page,
          payload,
          fallbackUrl: config.steps.some(s => s.type === "navigate")
            ? undefined
            : directoryUrl,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const screenshotBuf = await page
          .screenshot({ fullPage: false })
          .catch(() => Buffer.alloc(0));
        const screenshotBase64 =
          screenshotBuf.length > 0 && screenshotBuf.length < 100 * 1024
            ? screenshotBuf.toString("base64")
            : undefined;
        return {
          success: false,
          error: `step ${step.type} failed: ${message}`,
          screenshotBase64,
        };
      }
    }

    // Success check: if a success_selector is configured, verify it's visible.
    // Otherwise assume the final click closed the form.
    if (config.success_selector) {
      try {
        await page.waitForSelector(config.success_selector, {
          timeout: 10_000,
        });
      } catch {
        return {
          success: false,
          error: `success_selector "${config.success_selector}" not found within 10s`,
        };
      }
    }

    // Capture the URL we landed on as the "live URL" stand-in; some
    // directories redirect to the submitted listing.
    const liveUrl = page.url();

    return { success: true, liveUrl };
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "Form submitter crashed"
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

async function runStep(
  step: FormStep,
  ctx: {
    page: import("playwright").Page;
    payload: SubmissionPayload;
    fallbackUrl?: string;
  }
): Promise<void> {
  const { page, payload } = ctx;
  switch (step.type) {
    case "navigate":
      await page.goto(substitute(step.url, payload));
      break;
    case "wait_for_selector":
      await page.waitForSelector(step.selector, {
        timeout: step.timeoutMs ?? 15_000,
      });
      break;
    case "fill":
      await page.fill(step.selector, substitute(step.value, payload));
      break;
    case "click":
      await page.click(step.selector);
      break;
    case "select":
      await page.selectOption(step.selector, substitute(step.value, payload));
      break;
    case "upload":
      await page.setInputFiles(step.selector, step.filePath);
      break;
    case "screenshot":
      await page.screenshot({
        path: step.path ?? "/app/storage-state/last.png",
      });
      break;
    case "wait_ms":
      await new Promise(resolve => setTimeout(resolve, step.ms));
      break;
    default: {
      const exhaustive: never = step;
      throw new Error(`Unknown step type: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function substitute(template: string, payload: SubmissionPayload): string {
  // {placeholder} → payload.placeholder. Unknown placeholders pass through
  // unchanged (leaving the literal `{foo}` in the form field surfaces the
  // bug to the operator on their first review).
  return template.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (match, key: string) => {
    const value = (payload as unknown as Record<string, unknown>)[key];
    if (value === undefined) return match;
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  });
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
