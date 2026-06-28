import { notifyOwner } from "../../_core/notification";
import {
  countWaitlist,
  findWaitlistByEmail,
  insertWaitlistEntry,
  listWaitlistEntries,
  updateWaitlistStatus,
} from "./sovereign.repo";

type WaitlistStatus =
  | "pending"
  | "contacted"
  | "qualified"
  | "converted"
  | "rejected";

type JoinWaitlistInput = {
  email: string;
  name?: string;
  company?: string;
  currentStack?: string;
  monthlyRevenue?:
    | "pre_revenue"
    | "under_5k"
    | "5k_25k"
    | "25k_100k"
    | "over_100k";
  biggestChallenge?: string;
  referralSource?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

export async function joinWaitlist(input: JoinWaitlistInput) {
  // Check if already on waitlist
  const existing = await findWaitlistByEmail(input.email);

  if (existing.length > 0) {
    return {
      success: true,
      alreadyJoined: true,
      position: existing[0].position,
      message: "You're already on the waitlist!",
    };
  }

  // Get current count for position
  const total = await countWaitlist();
  const position = (total || 0) + 1;

  await insertWaitlistEntry({
    ...input,
    position,
    status: "pending",
  });

  // Notify owner
  await notifyOwner({
    title: `🎯 New Sovereign Stack Waitlist Signup #${position}`,
    content: `**${input.name || input.email}** (${input.company || "No company"}) joined the Sovereign Stack waitlist.\n\nRevenue tier: ${input.monthlyRevenue || "not specified"}\nBiggest challenge: ${input.biggestChallenge || "not specified"}\nSource: ${input.utmSource || input.referralSource || "direct"}`,
  });

  return {
    success: true,
    alreadyJoined: false,
    position,
    message: `You're #${position} on the waitlist. We'll be in touch.`,
  };
}

export async function getWaitlistCount() {
  const total = await countWaitlist();
  return { count: total || 0 };
}

export async function listWaitlist(input: { limit: number; offset: number }) {
  const result = await listWaitlistEntries(input);
  if (!result) return { entries: [], total: 0 };
  return result;
}

export async function updateStatus(input: {
  id: number;
  status: WaitlistStatus;
  notes?: string;
}) {
  await updateWaitlistStatus(input);
  return { success: true };
}
