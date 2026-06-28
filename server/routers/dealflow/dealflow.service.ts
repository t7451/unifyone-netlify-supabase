/**
 * server/routers/dealflow/dealflow.service.ts
 *
 * Use-case layer for DealFlow. Resolves the authoritative tenant id and
 * translates repo/MCP failures into the INTERNAL_SERVER_ERROR shape the
 * transport layer previously produced inline.
 */

import { TRPCError } from "@trpc/server";
import { dealflowRepo } from "./dealflow.repo";

export function requireTenantId(ctx: {
  user: { tenantId: number | null };
}): number {
  const tenantId = ctx.user.tenantId;
  if (tenantId == null) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });
  }
  return tenantId;
}

/** Run a repo call, mapping any thrown error to INTERNAL_SERVER_ERROR. */
async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
  }
}

export const dealflowService = {
  listDeals(
    tenantId: number,
    input: {
      category?: string;
      difficulty?: "easy" | "medium" | "hard";
      search?: string;
      limit?: number;
    }
  ) {
    return run(() => dealflowRepo.listDeals(input, tenantId));
  },

  getDeal(tenantId: number, dealId: string) {
    return run(() => dealflowRepo.getDeal(dealId, tenantId));
  },

  searchDeals(tenantId: number, input: { query: string; limit?: number }) {
    return run(() => dealflowRepo.searchDeals(input, tenantId));
  },

  getRecommendations(
    tenantId: number,
    input: { userId: string; limit?: number }
  ) {
    return run(() => dealflowRepo.getRecommendations(input, tenantId));
  },

  manageWishlist(
    tenantId: number,
    input: {
      userId: string;
      dealId?: string;
      action: "add" | "remove" | "list";
    }
  ) {
    return run(() => dealflowRepo.manageWishlist(input, tenantId));
  },

  trackConversion(
    tenantId: number,
    input: {
      dealId: string;
      userId?: string;
      eventType: "click" | "conversion";
      value?: number;
    }
  ) {
    return run(() => dealflowRepo.trackConversion(input, tenantId));
  },

  generateContent(
    tenantId: number,
    input: {
      dealId: string;
      contentType: "blog_post" | "landing_page" | "description";
    }
  ) {
    return run(() => dealflowRepo.generateContent(input, tenantId));
  },

  getFeatureFlags(tenantId: number) {
    return run(() => dealflowRepo.getFeatureFlags(tenantId));
  },

  setFeatureFlag(
    tenantId: number,
    input: { flagId: string; enabled: boolean; rolloutPercentage?: number }
  ) {
    return run(() => dealflowRepo.setFeatureFlag(input, tenantId));
  },
};
