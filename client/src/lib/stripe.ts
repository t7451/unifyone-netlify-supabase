import { loadStripe } from "@stripe/stripe-js";

// Singleton Stripe.js promise — loads once, reused everywhere
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
);
