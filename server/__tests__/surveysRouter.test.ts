/**
 * surveys.submit — voice-of-customer microsurvey ingest
 *
 * Verifies tenant attribution (authed vs anonymous vs default-tenant env),
 * empty-dismissal no-op, schema rejection, and best-effort failure handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TrpcContext } from "../_core/context";

const { insertSurveyResponseMock } = vi.hoisted(() => ({
  insertSurveyResponseMock: vi.fn(async () => undefined),
}));

vi.mock("../db", () => ({
  insertSurveyResponse: insertSurveyResponseMock,
  getSurveyResults: vi.fn(async () => ({
    total: 0,
    byType: [],
    topAnswers: [],
    recent: [],
  })),
}));

vi.mock("../_core/rateLimiter", () => ({
  publicFormLimiter: {
    check: vi.fn(async () => ({ allowed: true, retryAfterMs: 0 })),
  },
}));

import { surveysRouter } from "../routers/surveys";

type UserLike = { id: number; tenantId: number | null };

function makeCtx(user: UserLike | null = null): TrpcContext {
  return {
    req: { ip: "127.0.0.1", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user: user as TrpcContext["user"],
  };
}

beforeEach(() => {
  insertSurveyResponseMock.mockClear();
  insertSurveyResponseMock.mockResolvedValue(undefined);
  delete process.env.ANALYTICS_DEFAULT_TENANT_ID;
});

afterEach(() => {
  delete process.env.ANALYTICS_DEFAULT_TENANT_ID;
});

describe("surveys.submit", () => {
  it("stores an authenticated user's response against their tenant", async () => {
    const caller = surveysRouter.createCaller(
      makeCtx({ id: 3, tenantId: 100 })
    );

    const res = await caller.submit({
      tenantId: 999, // ignored for authed users
      surveyType: "post_purchase",
      question: "What made you buy?",
      answer: "Best price",
    });

    expect(res).toEqual({ ok: true, stored: true });
    const [tenantId, input] = insertSurveyResponseMock.mock.calls[0] as [
      number,
      Record<string, unknown>,
    ];
    expect(tenantId).toBe(100);
    expect(input).toMatchObject({
      surveyType: "post_purchase",
      answer: "Best price",
      userId: 3,
    });
  });

  it("is a no-op for an anonymous caller with no default tenant", async () => {
    const caller = surveysRouter.createCaller(makeCtx(null));
    const res = await caller.submit({
      surveyType: "exit_intent",
      question: "Why leaving?",
      answer: "Too pricey",
    });
    expect(res).toEqual({ ok: true, stored: false });
    expect(insertSurveyResponseMock).not.toHaveBeenCalled();
  });

  it("attributes anonymous responses to ANALYTICS_DEFAULT_TENANT_ID", async () => {
    process.env.ANALYTICS_DEFAULT_TENANT_ID = "42";
    const caller = surveysRouter.createCaller(makeCtx(null));

    const res = await caller.submit({
      surveyType: "exit_intent",
      question: "Why leaving?",
      answer: "Just browsing",
    });

    expect(res).toEqual({ ok: true, stored: true });
    const [tenantId, input] = insertSurveyResponseMock.mock.calls[0] as [
      number,
      Record<string, unknown>,
    ];
    expect(tenantId).toBe(42);
    expect(input).toMatchObject({ userId: null, answer: "Just browsing" });
  });

  it("does not store an empty dismissal (no answer, no rating)", async () => {
    const caller = surveysRouter.createCaller(makeCtx({ id: 1, tenantId: 1 }));
    const res = await caller.submit({
      surveyType: "exit_intent",
      question: "Why leaving?",
    });
    expect(res).toEqual({ ok: true, stored: false });
    expect(insertSurveyResponseMock).not.toHaveBeenCalled();
  });

  it("rejects unknown survey types", async () => {
    const caller = surveysRouter.createCaller(makeCtx({ id: 1, tenantId: 1 }));
    await expect(
      caller.submit({
        // @ts-expect-error — exercise schema rejection
        surveyType: "not_a_survey",
        question: "Q",
        answer: "A",
      })
    ).rejects.toThrow();
    expect(insertSurveyResponseMock).not.toHaveBeenCalled();
  });

  it("swallows DB failures and reports ok:false", async () => {
    insertSurveyResponseMock.mockRejectedValueOnce(new Error("db down"));
    const caller = surveysRouter.createCaller(makeCtx({ id: 1, tenantId: 1 }));
    const res = await caller.submit({
      surveyType: "post_purchase",
      question: "Q",
      answer: "A",
    });
    expect(res).toEqual({ ok: false, stored: false });
  });
});
