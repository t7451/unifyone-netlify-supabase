import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = {
  insertResult: [{ id: 1 }] as Array<{ id: number }>,
};

const { sendWelcomeEmail } = vi.hoisted(() => ({
  sendWelcomeEmail: vi.fn(() => Promise.resolve()),
}));

const mockReturning = vi.fn(() => Promise.resolve(mockState.insertResult));
const mockOnConflictDoNothing = vi.fn(() => ({ returning: mockReturning }));
const mockValues = vi.fn(() => ({
  onConflictDoNothing: mockOnConflictDoNothing,
}));
const mockInsert = vi.fn(() => ({ values: mockValues }));

const mockDb = {
  insert: mockInsert,
};

vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock("./_core/dripScheduler", () => ({
  sendWelcomeEmail,
}));

import { emailRouter } from "./routers/email";

describe("emailRouter.capture", () => {
  beforeEach(() => {
    mockState.insertResult = [{ id: 1 }];
    mockReturning.mockClear();
    mockOnConflictDoNothing.mockClear();
    mockValues.mockClear();
    mockInsert.mockClear();
    sendWelcomeEmail.mockClear();
  });

  it("returns success and sends the welcome email for a new subscriber", async () => {
    const caller = emailRouter.createCaller(
      {} as Parameters<typeof emailRouter.createCaller>[0]
    );

    const result = await caller.capture({
      email: "new@example.com",
      source: "landing_page",
    });

    expect(result).toMatchObject({
      success: true,
      subscriberId: 1,
    });
    expect(sendWelcomeEmail).toHaveBeenCalledWith("new@example.com");
    expect(mockOnConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it("returns the existing duplicate response shape when the email already exists", async () => {
    mockState.insertResult = [];
    const caller = emailRouter.createCaller(
      {} as Parameters<typeof emailRouter.createCaller>[0]
    );

    const result = await caller.capture({
      email: "existing@example.com",
      source: "landing_page",
    });

    expect(result).toEqual({
      success: false,
      message: "Email already subscribed",
      alreadySubscribed: true,
    });
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
  });
});
