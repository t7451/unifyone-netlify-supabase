import { eq } from "drizzle-orm";
import { connectNeon, loadEnv, logger, schema } from "@1commerce/spire";

// `spire auth <directory-slug>` — opens a Playwright browser so the operator
// can log into a directory that requires an authenticated session (Product
// Hunt, G2, Crunchbase, etc). The captured storage state is encrypted and
// persisted in spire_directories.method_config.storage_state_encrypted;
// the worker loads + decrypts it at submission time.
//
// Playwright is an optional dep of this app. We import it lazily so running
// other commands doesn't require Playwright to be installed locally.

export async function authDirectoryCommand(
  directorySlug: string
): Promise<void> {
  // Lazy import — Playwright is installed in the spire-worker Docker image
  // and on the operator's laptop if they run `spire auth` locally, but it's
  // not a runtime dep of the admin app itself (netlify functions don't need it).
  const playwright = await importPlaywrightOrExplain();

  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const storageEncryptionKey = process.env.STORAGE_STATE_ENCRYPTION_KEY;
  if (!storageEncryptionKey || storageEncryptionKey.length < 32) {
    throw new Error(
      "STORAGE_STATE_ENCRYPTION_KEY must be a 32-byte hex string. Generate with: openssl rand -hex 32"
    );
  }

  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const [dir] = await db
      .select()
      .from(schema.directories)
      .where(eq(schema.directories.slug, directorySlug))
      .limit(1);
    if (!dir) throw new Error(`Directory ${directorySlug} not found`);
    if (dir.method !== "form") {
      throw new Error(
        `Directory ${directorySlug} uses method=${dir.method}; auth capture only applies to form submissions`
      );
    }

    logger.info(
      { slug: dir.slug, url: dir.url },
      "Opening browser — log in, then close the tab"
    );

    const browser = await playwright.chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(dir.url);

    // Wait until the operator closes the browser window.
    await new Promise<void>(resolve => {
      browser.on("disconnected", () => resolve());
    });

    const state = await context.storageState();
    await browser.close();

    // Encrypt storage state at rest. AES-256-GCM via node:crypto.
    const encrypted = await encryptStorageState(
      JSON.stringify(state),
      storageEncryptionKey
    );

    const mergedMethodConfig = {
      ...(typeof dir.methodConfig === "object" && dir.methodConfig !== null
        ? (dir.methodConfig as Record<string, unknown>)
        : {}),
      storage_state_encrypted: encrypted,
      storage_state_captured_at: new Date().toISOString(),
    };

    await db
      .update(schema.directories)
      .set({ methodConfig: mergedMethodConfig })
      .where(eq(schema.directories.id, dir.id));

    logger.info(
      { slug: dir.slug, bytes: encrypted.length },
      "Auth state stored"
    );
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}

// Minimal shape of the bits of Playwright we use — avoids compile-time
// dependency on the `playwright` types so spire-admin can build cleanly
// without Playwright installed. At runtime the dynamic import below loads
// the real module (installed via spire-worker or an ad-hoc local install).
type PlaywrightLike = {
  chromium: {
    launch(opts: { headless: boolean }): Promise<{
      on(event: "disconnected", handler: () => void): void;
      newContext(): Promise<{
        newPage(): Promise<{ goto(url: string): Promise<unknown> }>;
        storageState(): Promise<unknown>;
      }>;
      close(): Promise<void>;
    }>;
  };
};

async function importPlaywrightOrExplain(): Promise<PlaywrightLike> {
  try {
    // @ts-expect-error — playwright is an optional runtime dep; not
    //   installed by default in apps/spire-admin. The error message below
    //   tells the operator how to fix.
    const pw = (await import("playwright")) as PlaywrightLike;
    return pw;
  } catch {
    throw new Error(
      "playwright is not installed. For local capture, run:\n" +
        "  cd apps/spire-admin && pnpm add -D playwright && pnpm exec playwright install chromium\n" +
        "For Contabo worker capture, use the spire-worker Docker image (Playwright already installed)."
    );
  }
}

async function encryptStorageState(
  plaintext: string,
  hexKey: string
): Promise<string> {
  const { createCipheriv, randomBytes } = await import("node:crypto");
  const key = Buffer.from(hexKey, "hex");
  if (key.length !== 32) {
    throw new Error(
      "STORAGE_STATE_ENCRYPTION_KEY must decode to exactly 32 bytes"
    );
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Encoded as base64(iv || tag || ciphertext) so the consumer can split
  // it back without JSON overhead.
  return Buffer.concat([iv, tag, enc]).toString("base64");
}
