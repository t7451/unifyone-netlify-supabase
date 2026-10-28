import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../../../drizzle/schema";

const mocks = vi.hoisted(() => ({
  getTenantById: vi.fn(),
  getStripe: vi.fn(),
  list: vi.fn(),
}));
vi.mock("./subscription.repo", () => ({ getTenantById: mocks.getTenantById }));
vi.mock("../../_core/stripeClient", () => ({ getStripe: mocks.getStripe }));
import { getInvoices } from "./subscription.service";

const user = { id: 7, tenantId: 1 } as User;
describe("invoice history recovery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getTenantById.mockResolvedValue({
      id: 1,
      stripeCustomerId: "cus_owned",
    });
    mocks.getStripe.mockReturnValue({ invoices: { list: mocks.list } });
  });
  it("returns an empty history when there is no active tenant without invoking Stripe", async () => {
    await expect(getInvoices({ ...user, tenantId: null })).resolves.toEqual([]);
    expect(mocks.getTenantById).not.toHaveBeenCalled();
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });
  it("returns an empty history when the workspace has no billing customer", async () => {
    mocks.getTenantById.mockResolvedValue({ id: 1, stripeCustomerId: null });
    await expect(getInvoices(user)).resolves.toEqual([]);
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });
  it("does not call a missing workspace an empty invoice history", async () => {
    mocks.getTenantById.mockResolvedValue(undefined);
    await expect(getInvoices(user)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("reports unavailable Stripe configuration as retryable failure", async () => {
    mocks.getStripe.mockReturnValue(null);
    await expect(getInvoices(user)).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("reports failed invoice lookup without returning a false empty history or exposing provider details", async () => {
    mocks.list.mockRejectedValue(new Error("secret provider details"));
    await expect(getInvoices(user)).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message: "Invoice history is temporarily unavailable. Please try again.",
    });
  });
  it("returns genuine invoice data and only asks for the active workspace customer", async () => {
    const invoices = [{ id: "in_owned", amount_paid: 499, currency: "usd" }];
    mocks.list.mockResolvedValue({ data: invoices });
    await expect(getInvoices(user)).resolves.toEqual(invoices);
    expect(mocks.list).toHaveBeenCalledWith({
      customer: "cus_owned",
      limit: 20,
    });
  });
});
