import { sendCAPIEvent, type CAPIUserData } from "../../meta/capi";
import { listCapiEvents, saveCapiEvent } from "./capi.repo";

/**
 * Meta CAPI use-cases: fire a server-side conversion event, then persist a log
 * record (best-effort, fire-and-forget) — preserving the original
 * send-then-`void saveCapiEvent(...)` ordering exactly.
 */

export type CapiActor = { tenantId: number | null; id: number };

export type FireResult = { success: boolean; eventId: string };

async function fireAndLog(opts: {
  actor: CapiActor;
  eventName: string;
  eventSourceUrl: string;
  userData?: CAPIUserData;
  customData?: Record<string, unknown>;
  errorLabel: string;
}): Promise<FireResult> {
  const eventId = crypto.randomUUID();
  try {
    const result = await sendCAPIEvent({
      eventName: opts.eventName,
      eventId,
      eventSourceUrl: opts.eventSourceUrl,
      userData: opts.userData,
      customData: opts.customData,
    });
    void saveCapiEvent({
      tenantId: opts.actor.tenantId ?? null,
      userId: opts.actor.id,
      eventName: opts.eventName,
      eventId,
      eventSourceUrl: opts.eventSourceUrl,
      userData: opts.userData,
      customData: opts.customData,
      responseCode: result.events_received,
      responseBody: JSON.stringify(result),
    });
    return { success: true, eventId };
  } catch (err) {
    console.error(opts.errorLabel, err);
    return { success: false, eventId };
  }
}

export async function fireLead(
  actor: CapiActor,
  input: {
    eventSourceUrl: string;
    userData?: CAPIUserData;
    contentName?: string;
  }
): Promise<FireResult> {
  return fireAndLog({
    actor,
    eventName: "Lead",
    eventSourceUrl: input.eventSourceUrl,
    userData: input.userData,
    customData: input.contentName
      ? { content_name: input.contentName }
      : undefined,
    errorLabel: "[CAPI] fireLead error:",
  });
}

export async function firePurchase(
  actor: CapiActor,
  input: {
    eventSourceUrl: string;
    userData?: CAPIUserData;
    value: number;
    currency: string;
  }
): Promise<FireResult> {
  return fireAndLog({
    actor,
    eventName: "Purchase",
    eventSourceUrl: input.eventSourceUrl,
    userData: input.userData,
    customData: { value: input.value, currency: input.currency },
    errorLabel: "[CAPI] firePurchase error:",
  });
}

export async function fireCompleteRegistration(
  actor: CapiActor,
  input: { eventSourceUrl: string; userData?: CAPIUserData }
): Promise<FireResult> {
  return fireAndLog({
    actor,
    eventName: "CompleteRegistration",
    eventSourceUrl: input.eventSourceUrl,
    userData: input.userData,
    customData: { status: "registered" },
    errorLabel: "[CAPI] fireCompleteRegistration error:",
  });
}

export async function fireCustomEvent(
  actor: CapiActor,
  input: {
    eventName: string;
    eventSourceUrl: string;
    userData?: CAPIUserData;
    customData?: Record<string, unknown>;
  }
): Promise<FireResult> {
  return fireAndLog({
    actor,
    eventName: input.eventName,
    eventSourceUrl: input.eventSourceUrl,
    userData: input.userData,
    customData: input.customData,
    errorLabel: "[CAPI] fireCustomEvent error:",
  });
}

export async function listEvents() {
  return listCapiEvents();
}
