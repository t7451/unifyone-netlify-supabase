import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

// Provide a JWT_SECRET so the token helpers can sign during tests.
process.env.JWT_SECRET =
  process.env.JWT_SECRET ||
  "test-secret-test-secret-test-secret-test-secret"; // >= 32 chars

const checkoutCreate = vi.fn();
const sessionRetrieve = vi.fn();

vi.mock("../../_core/stripeClient", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: checkoutCreate,
        retrieve: sessionRetrieve,
      },
    },
  }),
}));

import { clipsToolkitRouter } from "../clipsToolkit";
import { verifyClipsDownloadToken } from "../../clipsToolkit";

function makeCtx() {
  return {
    user: null,
    req: { headers: {}, ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } },
    res: undefined,
  } as unknown as Parameters<
    ReturnType<typeof clipsToolkitRouter.createCaller>
  >;
}

describe("clipsToolkit router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_JWT_SECRET === undefined) {
      // keep our test value
    } else {
      process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    }
  });

  it("getProduct returns product metadata with metrics", async () => {
    const caller = clipsToolkitRouter.createCaller(makeCtx() as never);
    const result = await caller.getProduct();
    expect(result.name).toMatch(/Gen AI Research Toolkit/);
    expect(result.priceCents).toBeGreaterThan(0);
    expect(result.metrics).toEqual({
      companies: 41,
      fundingUsd: 10_100_000_000,
      startYear: 2022,
      endYear: 2025,
    });
  });

  it("createCheckout rejects disallowed origins", async () => {
    const caller = clipsToolkitRouter.createCaller(makeCtx() as never);
    await expect(
      caller.createCheckout({ origin: "https://evil.example.com" })
    ).rejects.toThrowError(/Origin not allowed/);
    expect(checkoutCreate).not.toHaveBeenCalled();
  });

  it("createCheckout rejects malformed origins", async () => {
    const caller = clipsToolkitRouter.createCaller(makeCtx() as never);
    await expect(
      caller.createCheckout({ origin: "not-a-url" })
    ).rejects.toThrowError(/Invalid origin/);
    expect(checkoutCreate).not.toHaveBeenCalled();
  });

  it("createCheckout returns Stripe URL for an allowed origin", async () => {
    checkoutCreate.mockResolvedValueOnce({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
    const caller = clipsToolkitRouter.createCaller(makeCtx() as never);
    const result = await caller.createCheckout({
      origin: "https://clips.1commerce.online",
    });
    expect(result.url).toContain("checkout.stripe.com");
    expect(result.sessionId).toBe("cs_test_123");
    expect(checkoutCreate).toHaveBeenCalledTimes(1);
    const args = checkoutCreate.mock.calls[0][0];
    expect(args.success_url).toMatch(
      /^https:\/\/clips\.1commerce\.online\/clips\/success\?session_id=/
    );
    expect(args.cancel_url).toBe(
      "https://clips.1commerce.online/clips?checkout=cancelled"
    );
    expect(args.metadata.product).toBe("clips-toolkit");
  });

  it("getDownload rejects unpaid sessions", async () => {
    sessionRetrieve.mockResolvedValueOnce({
      id: "cs_test_unpaid",
      payment_status: "unpaid",
      metadata: { product: "clips-toolkit" },
    });
    const caller = clipsToolkitRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getDownload({ sessionId: "cs_test_unpaid" })
    ).rejects.toThrowError(/Payment not completed/);
  });

  it("getDownload rejects sessions for other products", async () => {
    sessionRetrieve.mockResolvedValueOnce({
      id: "cs_test_other",
      payment_status: "paid",
      metadata: { product: "something-else" },
    });
    const caller = clipsToolkitRouter.createCaller(makeCtx() as never);
    await expect(
      caller.getDownload({ sessionId: "cs_test_other" })
    ).rejects.toThrowError(/not for the clips toolkit/);
  });

  it("getDownload returns a verifiable signed download URL for paid sessions", async () => {
    sessionRetrieve.mockResolvedValueOnce({
      id: "cs_test_paid",
      payment_status: "paid",
      metadata: { product: "clips-toolkit" },
      customer_details: { email: "buyer@example.com" },
      customer_email: null,
    });
    const caller = clipsToolkitRouter.createCaller(makeCtx() as never);
    const result = await caller.getDownload({ sessionId: "cs_test_paid" });

    expect(result.email).toBe("buyer@example.com");
    expect(result.filename).toMatch(/\.xlsx$/);
    expect(result.downloadUrl).toMatch(
      /^\/api\/clips-toolkit\/download\?token=/
    );

    const token = decodeURIComponent(
      result.downloadUrl.split("token=")[1] ?? ""
    );
    const decoded = await verifyClipsDownloadToken(token);
    expect(decoded.sub).toBe("cs_test_paid");
    expect(decoded.email).toBe("buyer@example.com");
  });
});
