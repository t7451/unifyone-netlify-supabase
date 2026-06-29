import { Car, Store, type LucideIcon } from "lucide-react";

/**
 * A workspace's primary product / experience. Mirrors the Postgres
 * `primary_product` enum (drizzle/schema.ts) and the `tenants.primaryProduct`
 * column. "gig" is the default operator-first experience; "commerce" is the
 * storefront-first experience.
 */
export type PrimaryProduct = "gig" | "commerce";

/**
 * Shared option metadata for the gig-vs-commerce picker, used by both the
 * onboarding flow (TenantSetup) and Settings so the two never drift.
 */
export const PRODUCT_OPTIONS: {
  id: PrimaryProduct;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "gig",
    label: "Gig operator",
    description: "Track shifts, mileage, earnings & taxes across gig apps.",
    icon: Car,
  },
  {
    id: "commerce",
    label: "Commerce seller",
    description: "Run a storefront with products, orders & customers.",
    icon: Store,
  },
];
