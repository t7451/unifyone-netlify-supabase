import { TRPCError } from "@trpc/server";
import * as repo from "./revenueStreams.repo";

export type StreamType =
  | "affiliate"
  | "saas"
  | "consulting"
  | "physical"
  | "digital"
  | "passive";
export type StreamStatus = "active" | "pending" | "inactive" | "broken";

export interface CreateStreamInput {
  name: string;
  type: StreamType;
  platform?: string;
  monthlyValue: number;
  commissionRate?: number;
  status: StreamStatus;
  affiliateLink?: string;
  cookieDuration?: number;
  notes?: string;
}

export interface UpdateStreamInput {
  id: number;
  name?: string;
  type?: StreamType;
  platform?: string;
  monthlyValue?: number;
  commissionRate?: number;
  status?: StreamStatus;
  affiliateLink?: string;
  cookieDuration?: number;
  notes?: string;
}

export async function listStreams(userId: number) {
  const result = await repo.listStreamsByUser(userId);
  if (result === null) return [];
  return result;
}

export async function createStream(userId: number, input: CreateStreamInput) {
  const result = await repo.insertStream({
    userId,
    name: input.name,
    type: input.type,
    platform: input.platform ?? null,
    monthlyValue: String(input.monthlyValue),
    commissionRate:
      input.commissionRate != null ? String(input.commissionRate) : null,
    status: input.status,
    affiliateLink: input.affiliateLink || null,
    cookieDuration: input.cookieDuration ?? null,
    notes: input.notes ?? null,
  });
  if (result === null)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });
  return result;
}

export async function updateStreamRecord(
  userId: number,
  input: UpdateStreamInput
) {
  const { id, ...rest } = input;
  const updateData: Record<string, unknown> = {};
  if (rest.name !== undefined) updateData.name = rest.name;
  if (rest.type !== undefined) updateData.type = rest.type;
  if (rest.platform !== undefined) updateData.platform = rest.platform;
  if (rest.monthlyValue !== undefined)
    updateData.monthlyValue = String(rest.monthlyValue);
  if (rest.commissionRate !== undefined)
    updateData.commissionRate = String(rest.commissionRate);
  if (rest.status !== undefined) updateData.status = rest.status;
  if (rest.affiliateLink !== undefined)
    updateData.affiliateLink = rest.affiliateLink || null;
  if (rest.cookieDuration !== undefined)
    updateData.cookieDuration = rest.cookieDuration;
  if (rest.notes !== undefined) updateData.notes = rest.notes;

  const result = await repo.updateStream(id, userId, updateData);
  if (result === null)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });
  return result;
}

export async function deleteStreamRecord(userId: number, id: number) {
  const result = await repo.deleteStream(id, userId);
  if (result === null)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });
  return result;
}

export async function getStreamSummary(userId: number) {
  const streams = await repo.selectStreamsForSummary(userId);
  if (streams === null)
    return { totalMonthly: 0, activeCount: 0, brokenCount: 0, byType: {} };

  const active = streams.filter(s => s.status === "active");
  const broken = streams.filter(s => s.status === "broken");
  const totalMonthly = active.reduce(
    (sum, s) => sum + parseFloat(String(s.monthlyValue)),
    0
  );

  const byType: Record<string, number> = {};
  for (const s of active) {
    byType[s.type] = (byType[s.type] ?? 0) + parseFloat(String(s.monthlyValue));
  }

  return {
    totalMonthly,
    activeCount: active.length,
    brokenCount: broken.length,
    totalCount: streams.length,
    byType,
  };
}
