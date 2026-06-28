/**
 * server/creditMeter.ts — thin re-export shim.
 *
 * The implementation now lives in server/creditBilling/ (see meter.ts).
 * This shim preserves the original import path `./creditMeter` for all
 * existing callers. See docs/DATABASE_ARCHITECTURE.md / CLAUDE.md for why
 * the Supabase consume_credits_with_meter RPC + overage queue are
 * load-bearing.
 */
export type {
  CreditSource,
  MeterCreditsInput,
  MeterCreditsResult,
} from "./creditBilling/meter";
export {
  CREDIT_COST_MODEL,
  tokensToCredits,
  meterCredits,
  flushUserOverages,
  flushAllOverages,
  withCreditMeter,
} from "./creditBilling/meter";
