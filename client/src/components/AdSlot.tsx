import { cn } from "@/lib/utils";

const AD_ENABLED = import.meta.env.VITE_ADS_ENABLED === "true";
const AD_NETWORK = import.meta.env.VITE_AD_NETWORK || ""; // "ezoic" | "mediavine" | "adsense" | ...

interface AdSlotProps {
  /**
   * Stable slot id. For Ezoic this is the placeholder number (e.g. "101");
   * their script replaces the matching <div id="ezoic-pub-ad-placeholder-101">.
   * For other networks it is used as the element id/data attribute.
   */
  slotId: string;
  /** Human label for the slot (helps when reading the DOM). */
  label?: string;
  className?: string;
}

/**
 * AdSlot -- display-ad placeholder for the free tools and content pages.
 *
 * Renders an ad container ONLY when VITE_ADS_ENABLED === "true". Until you are
 * approved by an ad network and set the env vars, this is a no-op (returns
 * null) so nothing ugly ships. The actual ad markup is intentionally minimal:
 * ad networks (Ezoic, Mediavine, AdSense) inject creative into the container by
 * id/class after their site-wide script loads, so we only provide the mount
 * point here. See docs/MONETIZATION.md for the exact wiring per network.
 *
 * Placement guidance: these pages have long session times and repeat traffic,
 * which is where display ads earn best. Put one slot after the calculator
 * result and (optionally) one lower in the page. Never between a form field
 * and its submit button.
 */
export default function AdSlot({ slotId, label, className }: AdSlotProps) {
  if (!AD_ENABLED) return null;

  // Ezoic: their script targets #ezoic-pub-ad-placeholder-<id>.
  const id =
    AD_NETWORK === "ezoic"
      ? `ezoic-pub-ad-placeholder-${slotId}`
      : `ad-slot-${slotId}`;

  return (
    <div
      className={cn(
        "my-8 flex min-h-[90px] w-full items-center justify-center",
        className
      )}
      aria-label={label ?? "Advertisement"}
      data-ad-network={AD_NETWORK || undefined}
    >
      <div id={id} data-ad-slot={slotId} className="w-full" />
    </div>
  );
}
