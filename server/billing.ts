/**
 * server/billing.ts — thin re-export shim.
 *
 * The implementation now lives in server/creditBilling/ (checkout.ts +
 * routes.ts). This shim preserves the original import path `./billing` /
 * `../billing` for all existing callers.
 */
export { CREDIT_PACKAGES } from "./creditBilling/checkout";
export {
  registerBillingRoutes,
  registerBillingFetchRoutes,
} from "./creditBilling/routes";
