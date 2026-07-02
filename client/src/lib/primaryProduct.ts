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
/**
 * The post-auth landing path for a workspace's primary product. Gig-operators
 * land on the gig home ("/overview"); commerce-first tenants on the commerce
 * dashboard ("/dashboard"). Defaults to the gig-first home when the product is
 * unknown (e.g. pre-auth or on a lookup failure), mirroring the operator-first
 * default of the `tenants.primaryProduct` column.
 */
export function landingPathForProduct(
  product?: string | null,
): "/overview" | "/dashboard" {
  return product === "commerce" ? "/dashboard" : "/overview";
}
