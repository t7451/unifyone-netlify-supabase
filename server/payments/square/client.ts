/**
 * server/payments/square/client.ts
 *
 * Square SDK initialization + configuration predicates.
 * Extracted from server/square.ts (no behavior change).
 */
import { SquareClient, SquareEnvironment } from "square";

// ─── Lazy Square client (null until configured) ────────────────────────────
export function getSquareClient(): SquareClient | null {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) return null;
  return new SquareClient({
    token,
    environment:
      process.env.SQUARE_ENVIRONMENT === "sandbox"
        ? SquareEnvironment.Sandbox
        : SquareEnvironment.Production,
  });
}

export function squareConfigured(): boolean {
  return !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}
