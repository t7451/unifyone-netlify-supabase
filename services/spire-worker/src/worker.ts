import { eq } from "drizzle-orm";
import { schema } from "@1commerce/spire";
import {
  ApiMethodConfigSchema,
  EmailMethodConfigSchema,
  FormMethodConfigSchema,
  ManualMethodConfigSchema,
  type SubmissionPayload,
} from "@1commerce/spire";
import { loadBusinessProfile, toFormFillerTokens } from "@1commerce/spire";
import { connect } from "./lib/db.js";
import { logger } from "./lib/logger.js";
import { claimAndProcess, markFailedOrRetry, markSent } from "./lib/queue.js";
import { submitViaForm } from "./submitters/form.js";
import { submitViaApi } from "./submitters/api.js";
import { submitViaEmail } from "./submitters/email.js";
import { submitViaBrightLocal } from "./submitters/brightlocal.js";
import type { Tx } from "./types.js";

// Main worker loop. Runs forever; one submission per tick; sleeps
// WORKER_SLEEP_SECONDS between polls when the queue is empty.
//
// Each tick is a single transaction — the FOR UPDATE SKIP LOCKED claim is
// held for the lifetime of the handler. That means ONE worker can safely
// scale horizontally on Contabo: `docker compose scale spire-worker=3`
// and each container picks different rows.

const SLEEP_SECONDS = Math.max(
  5,
  Math.min(600, Number(process.env.WORKER_SLEEP_SECONDS ?? 60))
);
const STORAGE_STATE_ENCRYPTION_KEY = process.env.STORAGE_STATE_ENCRYPTION_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? "submissions@reach.unifyone.com";

async function main(): Promise<void> {
  logger.info({ sleepSeconds: SLEEP_SECONDS }, "Spire worker started");

  // Signal handling: SIGTERM from docker compose down should exit the loop
  // cleanly after the current tick finishes (not mid-submission).
  let shuttingDown = false;
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received; will exit after current tick");
    shuttingDown = true;
  });
  process.on("SIGINT", () => {
    logger.info("SIGINT received; will exit after current tick");
    shuttingDown = true;
  });

  const { sql: raw, db } = connect();
  try {
    while (!shuttingDown) {
      let didWork = false;
      try {
        const claimed = await claimAndProcess(
          db,
          async ({ tx, submissionId, attempt }) => {
            didWork = true;
            await handleSubmission(tx, submissionId, attempt);
          }
        );
        if (!claimed) {
          // Queue empty — nothing to do.
        }
      } catch (err) {
        logger.error(
          { err: err instanceof Error ? err.message : String(err) },
          "Worker tick crashed"
        );
      }

      if (!didWork && !shuttingDown) {
        await sleep(SLEEP_SECONDS * 1000);
      }
    }
  } finally {
    await raw.end({ timeout: 5 });
    logger.info("Spire worker exited");
  }
}

async function handleSubmission(
  tx: Tx,
  submissionId: string,
  attempt: number
): Promise<void> {
  // Load the full submission + directory + site inside the tx so the
  // method_config we process is the same one the claim locked.
  const [row] = await tx
    .select({
      submission: schema.submissions,
      directory: schema.directories,
    })
    .from(schema.submissions)
    .innerJoin(
      schema.directories,
      eq(schema.directories.id, schema.submissions.directoryId)
    )
    .where(eq(schema.submissions.id, submissionId))
    .limit(1);
  if (!row) {
    logger.warn({ submissionId }, "Claimed submission vanished mid-tx");
    return;
  }
  const { submission, directory } = row;
  const payload = submission.payload as SubmissionPayload;

  // Load the business profile once per submission. Fails loudly here if the
  // file is missing or inconsistent — cheaper than finding out after a
  // BrightLocal order goes out with a bad ZIP.
  const businessProfilePath = process.env.BUSINESS_PROFILE_PATH;
  const profile = businessProfilePath
    ? loadBusinessProfile(businessProfilePath)
    : null;
  const napTokens = profile ? toFormFillerTokens(profile) : {};

  logger.info(
    {
      submissionId,
      directory: directory.slug,
      method: directory.method,
      attempt,
    },
    "Processing submission"
  );

  try {
    switch (directory.method) {
      case "form": {
        const cfg = FormMethodConfigSchema.parse(directory.methodConfig);
        const result = await submitViaForm({
          config: cfg,
          payload,
          napTokens,
          storageEncryptionKey: STORAGE_STATE_ENCRYPTION_KEY,
          directoryUrl: directory.submitUrl ?? directory.url,
        });
        if (result.success) {
          await markSent(tx, submissionId, {
            liveUrl: result.liveUrl,
            response: { method: "form" },
          });
        } else {
          await markFailedOrRetry(tx, submissionId, {
            error: result.error ?? "form submission failed",
            attempt,
            retryable: !/(auth|selector|storage_state)/i.test(
              result.error ?? ""
            ),
            response: result.screenshotBase64
              ? { screenshot_base64: result.screenshotBase64 }
              : null,
          });
        }
        break;
      }
      case "api": {
        const cfg = ApiMethodConfigSchema.parse(directory.methodConfig);
        const result = await submitViaApi({ config: cfg, payload });
        if (result.success) {
          await markSent(tx, submissionId, {
            liveUrl: result.liveUrl,
            response: result.response,
          });
        } else {
          await markFailedOrRetry(tx, submissionId, {
            error: result.error ?? "api submission failed",
            attempt,
            retryable: result.retryable !== false,
            response: result.response,
          });
        }
        break;
      }
      case "email": {
        const cfg = EmailMethodConfigSchema.parse(directory.methodConfig);
        if (!RESEND_API_KEY) {
          await markFailedOrRetry(tx, submissionId, {
            error: "RESEND_API_KEY not set on worker",
            attempt,
            retryable: false,
          });
          break;
        }
        const result = await submitViaEmail({
          config: cfg,
          payload,
          resendApiKey: RESEND_API_KEY,
          fromAddress: RESEND_FROM,
        });
        if (result.success) {
          await markSent(tx, submissionId, {
            response: { resend_id: result.resendId },
          });
        } else {
          await markFailedOrRetry(tx, submissionId, {
            error: result.error ?? "email submission failed",
            attempt,
            retryable: true,
          });
        }
        break;
      }
      case "manual": {
        // Manual directories don't auto-submit. Generate the draft and mark
        // the submission as rejected (operator must post it themselves);
        // the payload + rendered draft live in spire_submissions.response
        // for the digest to surface. If a `runbook` field is present on
        // method_config (tier-1 NAP entries), pass it through so the digest
        // can render the operator checklist.
        const cfg = ManualMethodConfigSchema.parse(directory.methodConfig);
        const methodCfgRaw = directory.methodConfig as Record<string, unknown>;
        const runbook =
          typeof methodCfgRaw.runbook === "string"
            ? methodCfgRaw.runbook
            : null;
        const draft = {
          venue: cfg.venue,
          title: substituteTemplate(cfg.title_template, payload, napTokens),
          body: substituteTemplate(cfg.body_template, payload, napTokens),
          guidance: cfg.guidance,
          ...(runbook ? { runbook } : {}),
        };
        await tx
          .update(schema.submissions)
          .set({
            status: "rejected",
            error: "method=manual; operator must post from their own account",
            response: { manual_draft: draft },
            updatedAt: new Date(),
          })
          .where(eq(schema.submissions.id, submissionId));
        break;
      }
      case "brightlocal": {
        if (!profile) {
          await markFailedOrRetry(tx, submissionId, {
            error:
              "BUSINESS_PROFILE_PATH not set — brightlocal requires the NAP source of truth",
            attempt,
            retryable: false,
          });
          break;
        }
        const result = await submitViaBrightLocal({
          tx,
          submissionId,
          directory,
          profile,
        });
        if (result.success) {
          // Parent row stays in "sent" status once BrightLocal accepts the
          // order; per-citation completion lands via webhook into
          // spire_submission_citations. live_url stays null — citations
          // surface individually, not as a single parent URL.
          await markSent(tx, submissionId, {
            liveUrl: null,
            response: result.response,
          });
        } else {
          await markFailedOrRetry(tx, submissionId, {
            error: result.error ?? "brightlocal submission failed",
            attempt,
            retryable: result.retryable !== false,
            response: result.response,
          });
        }
        break;
      }
      default: {
        await markFailedOrRetry(tx, submissionId, {
          error: `unknown directory method: ${directory.method}`,
          attempt,
          retryable: false,
        });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailedOrRetry(tx, submissionId, {
      error: `handler threw: ${message}`,
      attempt,
      retryable: true,
    });
  }
}

function substituteTemplate(
  template: string,
  payload: SubmissionPayload,
  napTokens: Record<string, string> = {}
): string {
  return template.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (m, key: string) => {
    // NAP tokens win when the key collides — the business profile is the
    // source of truth for address/phone/legal name, even if a site renderer
    // also happens to set the same key.
    const napValue = napTokens[key];
    if (napValue !== undefined) return napValue;
    const v = (payload as unknown as Record<string, unknown>)[key];
    if (v === undefined) return m;
    if (Array.isArray(v)) return v.join(", ");
    return String(v);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  logger.fatal(
    { err: err instanceof Error ? err.message : String(err) },
    "Worker crashed at top level"
  );
  process.exit(1);
});
