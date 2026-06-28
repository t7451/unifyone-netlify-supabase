import { TRPCError } from "@trpc/server";
import { getAppUrl } from "../../_core/env";
import * as repo from "./rewards.repo";

/**
 * Use-case / business-logic layer for the rewards router. Orchestrates the repo
 * data-access functions and preserves the exact side-effect order, validation,
 * and error semantics of the original router.
 */

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function dbUnavailable(): TRPCError {
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "DB unavailable",
  });
}

export async function getBalance(userId: number): Promise<{ balance: number }> {
  if (!(await repo.isDbAvailable())) return { balance: 0 };
  const balance = await repo.getUserCreditBalance(userId);
  return { balance: balance ?? 0 };
}

export async function listOpportunities(userId: number) {
  const opportunities = await repo.listActiveOpportunities();
  if (opportunities === null) return [];

  const userClaims = await repo.getCompletedClaimCountsByOpportunity(userId);

  const claimMap = new Map(
    userClaims.map(c => [c.opportunityId, Number(c.count)])
  );

  return opportunities.map(opp => ({
    ...opp,
    userClaimCount: claimMap.get(opp.id) ?? 0,
    canClaim:
      (claimMap.get(opp.id) ?? 0) < opp.maxClaimsPerUser &&
      (opp.totalMaxClaims === null || opp.claimCount < opp.totalMaxClaims) &&
      (!opp.expiresAt || new Date(opp.expiresAt) > new Date()),
  }));
}

export async function claimOpportunity(
  user: { id: number; email?: string | null },
  opportunityId: number
) {
  if (!(await repo.isDbAvailable())) throw dbUnavailable();

  const opp = await repo.getOpportunityById(opportunityId);

  if (!opp || !opp.active) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Opportunity not found or inactive",
    });
  }

  if (opp.expiresAt && new Date(opp.expiresAt) <= new Date()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This opportunity has expired",
    });
  }

  if (opp.totalMaxClaims !== null && opp.claimCount >= opp.totalMaxClaims) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This opportunity has reached its claim limit",
    });
  }

  const completedCount = await repo.getCompletedClaimCountForUserOpportunity(
    user.id,
    opportunityId
  );

  if (completedCount >= opp.maxClaimsPerUser) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You have already claimed this reward",
    });
  }

  const metaEventId = generateEventId();

  await repo.insertRewardClaim({
    userId: user.id,
    opportunityId,
    credits: opp.credits,
    status: "completed",
    metaEventId,
  });

  await repo.incrementOpportunityClaimCount(opportunityId);

  const currentBalance = await repo.getUserCreditBalance(user.id);

  const newBalance = (currentBalance ?? 0) + opp.credits;

  await repo.setUserCreditBalance(user.id, newBalance);

  await repo.insertCreditTransaction({
    userId: user.id,
    amount: opp.credits,
    type: "earned",
    source: "bonus",
    description: `Reward: ${opp.title}`,
    balanceAfter: newBalance,
  });

  // Fire Meta CAPI CompleteRegistration event for reward key claim (non-blocking).
  // Intentionally skips DB logging — fire-and-forget so CAPI failures never block the claim flow.
  try {
    const { capi } = await import("../../meta/capi");
    await capi.completeRegistration(
      metaEventId,
      {
        externalId: String(user.id),
        email: user.email ?? undefined,
      },
      `${getAppUrl()}/rewards`
    );
  } catch {
    /* CAPI failure is non-critical */
  }

  return {
    success: true,
    credits: opp.credits,
    newBalance,
    metaEventId,
    opportunityTitle: opp.title,
  };
}

export async function getHistory(userId: number, limit: number) {
  const history = await repo.getRewardClaimHistory(userId, limit);
  return history ?? [];
}

export async function getCreditHistory(userId: number, limit: number) {
  const history = await repo.getCreditTransactionHistory(userId, limit);
  return history ?? [];
}

export async function adminListOpportunities() {
  const opportunities = await repo.adminListAllOpportunities();
  return opportunities ?? [];
}

export async function adminCreateOpportunity(input: {
  title: string;
  description?: string;
  credits: number;
  category:
    | "signup"
    | "referral"
    | "purchase"
    | "engagement"
    | "milestone"
    | "promotion";
  maxClaimsPerUser: number;
  totalMaxClaims?: number;
  expiresAt?: string;
}) {
  const created = await repo.insertOpportunity({
    title: input.title,
    description: input.description,
    credits: input.credits,
    category: input.category,
    maxClaimsPerUser: input.maxClaimsPerUser,
    totalMaxClaims: input.totalMaxClaims ?? null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
  });
  if (!created) throw dbUnavailable();

  return { success: true };
}

export async function adminToggleOpportunity(id: number, active: boolean) {
  const updated = await repo.setOpportunityActive(id, active);
  if (!updated) throw dbUnavailable();

  return { success: true };
}

export async function adminGetStats() {
  const stats = await repo.getAdminStats();
  if (stats === null) {
    return {
      totalClaims: 0,
      totalCreditsIssued: 0,
      activeOpportunities: 0,
      claimsLast7Days: 0,
    };
  }

  return {
    totalClaims: Number(stats.totalClaims?.count ?? 0),
    totalCreditsIssued: Number(stats.totalCreditsIssued?.total ?? 0),
    activeOpportunities: Number(stats.activeOpps?.count ?? 0),
    claimsLast7Days: Number(stats.recentClaims?.count ?? 0),
  };
}
