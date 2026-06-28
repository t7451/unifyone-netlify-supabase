import { notifyOwner } from "../../_core/notification";
import { getAppUrl } from "../../_core/env";
import { fireAutomations } from "../../lib/automationDispatch";
import { sendBlueprintEmail } from "../../_core/blueprintEmail";
import * as repo from "./leads.repo";

type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

export interface SubmitLeadInput {
  companyName?: string;
  contactName?: string;
  email: string;
  phone?: string;
  website?: string;
  plan?: string;
  platforms?: string[];
  branding?: string;
  monthlyRevenue?: string;
  teamSize?: string;
  message?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export async function submitLead(input: SubmitLeadInput) {
  const db = await repo.requireDb();

  // Persist lead to database
  const inserted = await repo.insertLead(db, {
    ...input,
    source: input.source ?? "landing_page",
    status: "new",
  });

  const leadId = inserted.id;

  // Fire owner notification with full lead summary
  const platformList = input.platforms?.join(", ") ?? "Not specified";
  const notifContent = [
    `**New Lead Submitted** — ${new Date().toLocaleString()}`,
    ``,
    `**Company:** ${input.companyName ?? "N/A"}`,
    `**Contact:** ${input.contactName ?? "N/A"}`,
    `**Email:** ${input.email}`,
    `**Phone:** ${input.phone ?? "N/A"}`,
    `**Website:** ${input.website ?? "N/A"}`,
    ``,
    `**Plan Interest:** ${input.plan ?? "Not specified"}`,
    `**Platforms:** ${platformList}`,
    `**Branding:** ${input.branding ?? "N/A"}`,
    `**Monthly Revenue:** ${input.monthlyRevenue ?? "N/A"}`,
    `**Team Size:** ${input.teamSize ?? "N/A"}`,
    ``,
    `**Message:** ${input.message ?? "None"}`,
    ``,
    `**Source:** ${input.source ?? "landing_page"} | UTM: ${input.utmSource ?? "-"}/${input.utmMedium ?? "-"}/${input.utmCampaign ?? "-"}`,
    `**Lead ID:** #${leadId}`,
  ].join("\n");

  let notificationSent = false;
  try {
    notificationSent = await notifyOwner({
      title: `🎯 New Lead: ${input.companyName ?? input.email} — ${input.plan ?? "Unknown Plan"}`,
      content: notifContent,
    });
  } catch {
    // Non-blocking
  }

  // Fire automation webhooks (n8n + Zapier)
  const automationPayload = {
    leadId,
    email: input.email,
    companyName: input.companyName,
    contactName: input.contactName,
    plan: input.plan,
    platforms: input.platforms,
    source: input.source,
  };

  const autoResults = await fireAutomations(
    null,
    "lead.submitted",
    automationPayload
  );

  // Fire Meta CAPI Lead event (non-blocking — deduplication via eventId)
  try {
    const { capi } = await import("../../meta/capi");
    const eventId = `lead-${leadId}-${Date.now()}`;
    await capi.lead(eventId, { email: input.email }, getAppUrl());
  } catch {
    /* CAPI failure is non-critical */
  }

  // Send the Cathedral Blueprint lead-magnet email when the lead came from
  // the landing-page blueprint form. Non-blocking — log on failure so the
  // mutation still succeeds and the lead is preserved.
  let blueprintEmailSent = false;
  if (input.source === "landing_page_blueprint") {
    const result = await sendBlueprintEmail(input.email);
    blueprintEmailSent = result.success;
    if (!result.success) {
      console.warn(
        `[leads.submit] Blueprint email not sent to ${input.email}: ${result.error}`
      );
    }
  }

  // Update automation tracking flags
  if (notificationSent || autoResults.n8n || autoResults.zapier) {
    try {
      await repo.updateLeadTrackingFlags(db, leadId, {
        notificationSent,
        n8nTriggered: autoResults.n8n,
        zapierTriggered: autoResults.zapier,
      });
    } catch {
      // Non-blocking
    }
  }

  return {
    success: true,
    leadId,
    notificationSent,
    automations: autoResults,
    blueprintEmailSent,
  };
}

export async function listLeads(status?: LeadStatus) {
  const db = await repo.requireDb();
  return repo.listLeads(db, status);
}

export async function updateStatus(id: number, status: LeadStatus) {
  const db = await repo.requireDb();
  await repo.updateStatus(db, id, status);

  // Fire automation on status change
  await fireAutomations(null, `lead.status.${status}`, {
    leadId: id,
    status,
  });

  return { success: true };
}

export async function addNote(id: number, note: string) {
  const db = await repo.requireDb();
  const existingNotes = await repo.getNotes(db, id);
  const timestamp = new Date().toLocaleString();
  const updatedNotes = existingNotes
    ? `${existingNotes}\n\n[${timestamp}] ${note}`
    : `[${timestamp}] ${note}`;
  await repo.setNotes(db, id, updatedNotes);
  return { success: true };
}

export async function getStats() {
  const db = await repo.requireDb();
  const allLeads = await repo.listStatuses(db);
  const counts = {
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
    total: allLeads.length,
  };
  for (const l of allLeads) {
    counts[l.status] = (counts[l.status] ?? 0) + 1;
  }
  return counts;
}
