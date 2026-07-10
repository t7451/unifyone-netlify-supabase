import { cn } from "@/lib/utils";
import { trackOutboundClick } from "@/lib/behaviorTracking";
import {
  AFFILIATE_DISCLOSURE,
  offersForCategories,
  offersForTool,
  type OfferCategory,
  type PartnerOffer,
} from "@/content/partnerOffers";

interface PartnerOffersProps {
  /** Resolve offers from a tool slug (uses TOOL_OFFER_CATEGORIES). */
  toolSlug?: string;
  /** Or pass explicit categories (used by comparison/guide pages). */
  categories?: OfferCategory[];
  /** Max offers to show. */
  limit?: number;
  /** Section heading. */
  heading?: string;
  className?: string;
}

/**
 * PartnerOffers -- contextual, disclosed affiliate/partner cards.
 *
 * Renders nothing when no offers match, so it is safe to drop anywhere.
 * Every outbound link is rel="sponsored nofollow noopener" and fires the
 * existing first-party outbound-click tracker so conversions can be attributed
 * without a third-party pixel.
 */
export default function PartnerOffers({
  toolSlug,
  categories,
  limit = 2,
  heading = "Recommended tools for gig workers",
  className,
}: PartnerOffersProps) {
  const offers: PartnerOffer[] = toolSlug
    ? offersForTool(toolSlug, limit)
    : categories
      ? offersForCategories(categories, limit)
      : [];

  if (offers.length === 0) return null;

  return (
    <section
      className={cn("mt-12 border-t pt-8", className)}
      aria-label="Recommended partner tools"
    >
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {heading}
        </h2>
        <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground/70">
          Partner offers
        </span>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {offers.map(o => (
          <li key={o.id}>
            <a
              href={o.url}
              target="_blank"
              rel="sponsored nofollow noopener"
              onClick={() => trackOutboundClick(o.url)}
              className="flex h-full flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary"
            >
              <span className="text-sm font-semibold text-foreground">
                {o.name}
              </span>
              <span className="mt-1 flex-1 text-sm text-muted-foreground">
                {o.blurb}
              </span>
              <span className="mt-3 text-sm font-medium text-primary">
                {o.cta} &rarr;
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground/80">
        {AFFILIATE_DISCLOSURE}
      </p>
    </section>
  );
}
