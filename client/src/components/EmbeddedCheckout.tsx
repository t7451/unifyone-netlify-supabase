import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";

/**
 * Stripe Embedded Checkout — renders Stripe's hosted payment form
 * inside an iframe. Card data never touches our server (SAQ-A PCI).
 *
 * Usage:
 *   <EmbeddedCheckoutForm priceId="price_xxx" />
 *
 * The component calls /api/stripe/create-embedded-checkout to get a
 * client_secret, then renders the Stripe-hosted checkout UI.
 */
export function EmbeddedCheckoutForm({
  priceId,
  userEmail,
  userId,
  tenantId,
}: {
  priceId: string;
  userEmail?: string;
  userId?: string;
  tenantId?: string;
}) {
  const fetchClientSecret = async () => {
    const res = await fetch("/api/stripe/create-embedded-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId, userEmail, userId, tenantId }),
    });
    const data = await res.json();
    if (!data.clientSecret) {
      throw new Error(data.error || "Failed to create checkout session");
    }
    return data.clientSecret as string;
  };

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ fetchClientSecret }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
