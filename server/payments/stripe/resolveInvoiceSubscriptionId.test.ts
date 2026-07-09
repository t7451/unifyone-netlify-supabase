import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { resolveInvoiceSubscriptionId } from "./webhooks";

// The repo pins STRIPE_API_VERSION="2026-02-25.clover" (Basil line), where the
// top-level invoice.subscription field was removed in favor of
// invoice.parent.subscription_details.subscription. These cover both shapes so
// renewal invoices resolve a subscription id and keep granting monthly credits.
function invoice(partial: Record<string, unknown>): Stripe.Invoice {
  return partial as unknown as Stripe.Invoice;
}

describe("resolveInvoiceSubscriptionId", () => {
  it("reads the Basil/clover invoice.parent.subscription_details.subscription", () => {
    expect(
      resolveInvoiceSubscriptionId(
        invoice({
          parent: { subscription_details: { subscription: "sub_new123" } },
        })
      )
    ).toBe("sub_new123");
  });

  it("normalizes an expanded subscription object in parent to its id", () => {
    expect(
      resolveInvoiceSubscriptionId(
        invoice({
          parent: {
            subscription_details: { subscription: { id: "sub_obj456" } },
          },
        })
      )
    ).toBe("sub_obj456");
  });

  it("falls back to the legacy top-level invoice.subscription", () => {
    expect(
      resolveInvoiceSubscriptionId(invoice({ subscription: "sub_legacy789" }))
    ).toBe("sub_legacy789");
  });

  it("prefers parent over the legacy field when both are present", () => {
    expect(
      resolveInvoiceSubscriptionId(
        invoice({
          parent: { subscription_details: { subscription: "sub_parent" } },
          subscription: "sub_legacy",
        })
      )
    ).toBe("sub_parent");
  });

  it("returns null for a one-off (non-subscription) invoice", () => {
    expect(resolveInvoiceSubscriptionId(invoice({ parent: null }))).toBeNull();
    expect(resolveInvoiceSubscriptionId(invoice({}))).toBeNull();
  });
});
