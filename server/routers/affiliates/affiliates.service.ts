import { TRPCError } from "@trpc/server";
import * as repo from "./affiliates.repo";

const DB_UNAVAILABLE = new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "DB unavailable",
});

export interface CreateProgramInput {
  name: string;
  category?: string;
  platform?: string;
  commissionRate: number;
  commissionType: "percentage" | "flat" | "recurring";
  cookieDuration: number;
  affiliateLink?: string;
  monthlyEarnings: number;
  pendingPayout: number;
  instantPayout: boolean;
  active: boolean;
  notes?: string;
}

export interface UpdateProgramInput {
  id: number;
  name?: string;
  category?: string;
  platform?: string;
  commissionRate?: number;
  commissionType?: "percentage" | "flat" | "recurring";
  cookieDuration?: number;
  affiliateLink?: string;
  monthlyEarnings?: number;
  pendingPayout?: number;
  instantPayout?: boolean;
  active?: boolean;
  notes?: string;
}

export async function listPrograms(userId: number) {
  const programs = await repo.listPrograms(userId);
  if (programs === null) return [];
  return programs;
}

export async function createProgram(userId: number, input: CreateProgramInput) {
  const ok = await repo.insertProgram({
    userId,
    name: input.name,
    category: input.category ?? null,
    platform: input.platform ?? null,
    commissionRate: String(input.commissionRate),
    commissionType: input.commissionType,
    cookieDuration: input.cookieDuration,
    affiliateLink: input.affiliateLink || null,
    monthlyEarnings: String(input.monthlyEarnings),
    pendingPayout: String(input.pendingPayout),
    instantPayout: input.instantPayout,
    active: input.active,
    notes: input.notes ?? null,
  });
  if (!ok) throw DB_UNAVAILABLE;

  return { success: true };
}

export async function updateProgram(userId: number, input: UpdateProgramInput) {
  const { id, ...rest } = input;
  const updateData: Record<string, unknown> = {};
  if (rest.name !== undefined) updateData.name = rest.name;
  if (rest.category !== undefined) updateData.category = rest.category;
  if (rest.platform !== undefined) updateData.platform = rest.platform;
  if (rest.commissionRate !== undefined)
    updateData.commissionRate = String(rest.commissionRate);
  if (rest.commissionType !== undefined)
    updateData.commissionType = rest.commissionType;
  if (rest.cookieDuration !== undefined)
    updateData.cookieDuration = rest.cookieDuration;
  if (rest.affiliateLink !== undefined)
    updateData.affiliateLink = rest.affiliateLink || null;
  if (rest.monthlyEarnings !== undefined)
    updateData.monthlyEarnings = String(rest.monthlyEarnings);
  if (rest.pendingPayout !== undefined)
    updateData.pendingPayout = String(rest.pendingPayout);
  if (rest.instantPayout !== undefined)
    updateData.instantPayout = rest.instantPayout;
  if (rest.active !== undefined) updateData.active = rest.active;
  if (rest.notes !== undefined) updateData.notes = rest.notes;

  const ok = await repo.updateProgram(id, userId, updateData);
  if (!ok) throw DB_UNAVAILABLE;

  return { success: true };
}

export async function deleteProgram(userId: number, id: number) {
  const ok = await repo.deleteProgram(id, userId);
  if (!ok) throw DB_UNAVAILABLE;

  return { success: true };
}

export async function getSummary(userId: number) {
  const programs = await repo.listProgramsForSummary(userId);
  if (programs === null)
    return {
      totalMonthly: 0,
      totalPending: 0,
      activeCount: 0,
      instantPayoutCount: 0,
    };

  const active = programs.filter(p => p.active);
  const totalMonthly = active.reduce(
    (s, p) => s + parseFloat(String(p.monthlyEarnings)),
    0
  );
  const totalPending = active.reduce(
    (s, p) => s + parseFloat(String(p.pendingPayout)),
    0
  );
  const instantPayoutCount = active.filter(p => p.instantPayout).length;

  return {
    totalMonthly,
    totalPending,
    activeCount: active.length,
    totalCount: programs.length,
    instantPayoutCount,
  };
}
