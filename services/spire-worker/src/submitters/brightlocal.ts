import { eq } from "drizzle-orm";
import {
  schema,
  toBrightLocalPayload,
  type BusinessProfile,
} from "@1commerce/spire";
import { logger } from "../lib/logger.js";
import type { Tx } from "../types.js";

// BrightLocal v4 citation-builder submitter. One submission = one "order"
// that propagates to 30+ commodity directories over several days. Per-
// citation completion arrives via webhook-brightlocal.mts and lands in
// spire_submission_citations.

const BL_API_BASE =
  process.env.BRIGHTLOCAL_API_BASE ??
  "https://tools.brightlocal.com/seo-tools/api/v4";

export type BrightLocalSubmitInput = {
  tx: Tx;
  submissionId: string;
  directory: typeof schema.directories.$inferSelect;
  profile: BusinessProfile;
};

export type BrightLocalSubmitResult = {
  success: boolean;
  retryable?: boolean;
  error?: string;
  response?: Record<string, unknown>;
};

export async function submitViaBrightLocal(
  input: BrightLocalSubmitInput
): Promise<BrightLocalSubmitResult> {
  const { tx, submissionId, directory, profile } = input;
  const apiKey = process.env.BRIGHTLOCAL_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      retryable: false,
      error:
        "BRIGHTLOCAL_API_KEY not set on worker — directory is scaffolding-only until activated",
    };
  }

  const methodConfig = (directory.methodConfig ?? {}) as Record<
    string,
    unknown
  >;
  const bundle =
    typeof methodConfig.bundle === "string"
      ? methodConfig.bundle
      : "citation_builder_tier_1";
  const citationList =
    typeof methodConfig.citation_list === "string"
      ? methodConfig.citation_list
      : "us_local";
  const callbackUrl =
    typeof methodConfig.callback_url === "string"
      ? methodConfig.callback_url
      : (process.env.BRIGHTLOCAL_CALLBACK_URL ?? null);

  const business = toBrightLocalPayload(profile);

  const body = {
    business,
    bundle,
    citation_list: citationList,
    external_reference: submissionId,
    ...(callbackUrl ? { callback_url: callbackUrl } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`${BL_API_BASE}/citations/order`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      success: false,
      retryable: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      success: false,
      retryable: res.status >= 500 || res.status === 429,
      error: `BrightLocal HTTP ${res.status}: ${text.slice(0, 500)}`,
      response: { status: res.status },
    };
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const orderId =
    typeof data.order_id === "string" || typeof data.order_id === "number"
      ? String(data.order_id)
      : null;

  if (!orderId) {
    return {
      success: false,
      retryable: true,
      error: `BrightLocal accepted submission but returned no order_id: ${JSON.stringify(data).slice(0, 400)}`,
      response: data,
    };
  }

  // Seed pending per-citation rows so the digest/report can show progress
  // without waiting for the first webhook callback. BrightLocal returns a
  // `citations` preview array on some bundle types; when absent we just
  // create a single row representing the order until callbacks arrive.
  const citations = Array.isArray(data.citations)
    ? (data.citations as Array<Record<string, unknown>>)
    : [];
  if (citations.length > 0) {
    for (const c of citations) {
      const directoryName =
        typeof c.directory === "string"
          ? c.directory
          : typeof c.name === "string"
            ? c.name
            : "unknown";
      await tx.insert(schema.submissionCitations).values({
        submissionId,
        aggregator: "brightlocal",
        aggregatorRef: orderId,
        directoryName,
        liveUrl: typeof c.live_url === "string" ? c.live_url : null,
        status: "pending",
        rawPayload: c as Record<string, unknown>,
      });
    }
  } else {
    await tx.insert(schema.submissionCitations).values({
      submissionId,
      aggregator: "brightlocal",
      aggregatorRef: orderId,
      directoryName: `brightlocal_order:${orderId}`,
      status: "pending",
    });
  }

  logger.info(
    {
      submissionId,
      directory: directory.slug,
      orderId,
      bundle,
      citationCount: citations.length,
    },
    "BrightLocal order accepted"
  );

  return {
    success: true,
    response: {
      brightlocal_order_id: orderId,
      bundle,
      citation_list: citationList,
      status: "queued_for_propagation",
    },
  };
}

// Webhook callback handler — called from apps/spire-admin/netlify/functions/
// webhook-brightlocal.mts. Shared here so the logic lives next to the
// submitter that created the parent row.
export async function handleBrightLocalCallback(input: {
  tx: Tx;
  orderId: string;
  directoryName: string;
  liveUrl: string | null;
  status: "live" | "rejected" | "error";
  rawPayload: Record<string, unknown>;
}): Promise<void> {
  const { tx, orderId, directoryName, liveUrl, status, rawPayload } = input;

  // Find the matching pending row. If we seeded specific citations at order
  // time, match by (orderId, directoryName). Otherwise we created one
  // placeholder row — attach to that.
  const existing = await tx
    .select()
    .from(schema.submissionCitations)
    .where(eq(schema.submissionCitations.aggregatorRef, orderId));

  const match =
    existing.find(r => r.directoryName === directoryName) ??
    existing.find(r => r.directoryName.startsWith("brightlocal_order:"));

  if (!match) {
    logger.warn(
      { orderId, directoryName },
      "BrightLocal callback — no matching submission_citation row"
    );
    return;
  }

  await tx
    .update(schema.submissionCitations)
    .set({
      directoryName,
      liveUrl,
      status,
      propagatedAt: status === "live" ? new Date() : match.propagatedAt,
      rawPayload,
    })
    .where(eq(schema.submissionCitations.id, match.id));
}
