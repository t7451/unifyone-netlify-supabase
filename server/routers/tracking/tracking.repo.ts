import { trackBehaviorEvents, type BehaviorEventInput } from "../../db";

/**
 * Data access for behavioral tracking. Wraps the shared `trackBehaviorEvents`
 * helper from `../../db` so the transport/use-case layers don't import it
 * directly.
 */

export type { BehaviorEventInput };

/** Persist a batch of behavioral events for a tenant; returns count stored. */
export async function storeBehaviorEvents(
  tenantId: number,
  events: BehaviorEventInput[]
): Promise<number> {
  return trackBehaviorEvents(tenantId, events);
}
