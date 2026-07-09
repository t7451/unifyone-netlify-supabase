/**
 * partnerOffers.ts -- registry of contextual affiliate / partner offers shown
 * on the free tool pages and comparison content.
 *
 * MONETIZATION MODEL
 * Each offer's outbound URL is resolved from a build-time env var (VITE_AFF_*)
 * so the real affiliate/referral link (with your tracking ID) is injected at
 * deploy time and never committed to the repo. Until an env var is set, the
 * offer falls back to the partner's plain homepage -- the CTA still works and
 * is honest, it simply isn't monetized yet. That means this ships safely today
 * and starts earning the moment you paste your links into Netlify env vars.
 *
 * Vite statically replaces `import.meta.env.VITE_*` only for literal member
 * access, so each URL is referenced directly (no dynamic bracket lookup).
 *
 * COMPLIANCE
 * The rendering component (PartnerOffers.tsx) marks every link
 * rel="sponsored nofollow noopener" and shows an FTC affiliate disclosure.
 * Keep blurbs truthful and non-guaranteeing -- this is YMYL content.
 */

const env = import.meta.env;

export type OfferCategory =
  | "tax-software"
  | "mileage"
  | "banking"
  | "gas"
  | "insurance";

export interface PartnerOffer {
  id: string;
  name: string;
  category: OfferCategory;
  /** One-line, benefit-led, truthful description. No guarantees. */
  blurb: string;
  /** Button label. */
  cta: string;
  /** Resolved outbound URL (affiliate link if env set, else homepage). */
  url: string;
  /** True when a real affiliate link is configured (drives internal QA only). */
  monetized: boolean;
}

/** Small helper to keep each entry readable. */
function offer(
  o: Omit<PartnerOffer, "monetized" | "url"> & {
    affUrl?: string;
    homepage: string;
  }
): PartnerOffer {
  const url = o.affUrl && o.affUrl.trim() ? o.affUrl : o.homepage;
  return {
    id: o.id,
    name: o.name,
    category: o.category,
    blurb: o.blurb,
    cta: o.cta,
    url,
    monetized: Boolean(o.affUrl && o.affUrl.trim()),
  };
}

export const PARTNER_OFFERS: PartnerOffer[] = [
  // --- Tax software -------------------------------------------------------
  offer({
    id: "turbotax-se",
    name: "TurboTax Self-Employed",
    category: "tax-software",
    blurb:
      "Guided 1099 filing that imports gig income and finds self-employment deductions.",
    cta: "File with TurboTax",
    affUrl: env.VITE_AFF_TURBOTAX,
    homepage: "https://turbotax.intuit.com/personal-taxes/self-employment-taxes/",
  }),
  offer({
    id: "hrblock-se",
    name: "H&R Block Self-Employed",
    category: "tax-software",
    blurb:
      "1099 and Schedule C filing with an option to add a tax pro if you get stuck.",
    cta: "File with H&R Block",
    affUrl: env.VITE_AFF_HRBLOCK,
    homepage: "https://www.hrblock.com/online-tax-filing/self-employed-online-tax-filing/",
  }),

  // --- Mileage / expense tracking ----------------------------------------
  offer({
    id: "everlance",
    name: "Everlance",
    category: "mileage",
    blurb:
      "Automatic GPS mileage tracking and expense logging built for gig drivers.",
    cta: "Try Everlance free",
    affUrl: env.VITE_AFF_EVERLANCE,
    homepage: "https://www.everlance.com/",
  }),
  offer({
    id: "stride",
    name: "Stride",
    category: "mileage",
    blurb:
      "Free mileage and expense tracker that flags common 1099 tax write-offs.",
    cta: "Get Stride free",
    affUrl: env.VITE_AFF_STRIDE,
    homepage: "https://www.stridehealth.com/tax",
  }),

  // --- Business banking for 1099 workers ---------------------------------
  offer({
    id: "found",
    name: "Found",
    category: "banking",
    blurb:
      "Business banking for the self-employed with built-in tax set-aside and bookkeeping.",
    cta: "Open a Found account",
    affUrl: env.VITE_AFF_FOUND,
    homepage: "https://found.com/",
  }),
  offer({
    id: "novo",
    name: "Novo",
    category: "banking",
    blurb:
      "Fee-free business checking with invoicing and accounting integrations.",
    cta: "Open a Novo account",
    affUrl: env.VITE_AFF_NOVO,
    homepage: "https://www.novo.co/",
  }),

  // --- Gas / cashback -----------------------------------------------------
  offer({
    id: "upside",
    name: "Upside",
    category: "gas",
    blurb: "Cash back on gas and food -- useful when fuel is your biggest cost.",
    cta: "Get cash back on gas",
    affUrl: env.VITE_AFF_UPSIDE,
    homepage: "https://www.upside.com/",
  }),

  // --- Insurance ----------------------------------------------------------
  offer({
    id: "stride-health",
    name: "Stride Health",
    category: "insurance",
    blurb:
      "Compare health, dental, and vision plans priced for self-employed workers.",
    cta: "Compare health plans",
    affUrl: env.VITE_AFF_STRIDE_HEALTH,
    homepage: "https://www.stridehealth.com/",
  }),
];

/**
 * Which offer categories are relevant to each free tool, in priority order.
 * The tool's own slug maps here; PartnerOffers renders the top N.
 */
export const TOOL_OFFER_CATEGORIES: Record<string, OfferCategory[]> = {
  "mileage-deduction-calculator": ["mileage", "tax-software"],
  "quarterly-tax-estimator": ["tax-software", "banking"],
  "earnings-consolidator": ["banking", "mileage"],
  "reseller-break-even": ["banking", "tax-software"],
  "cashflow-tracker": ["banking", "gas"],
  "se-tax-calculator": ["tax-software", "banking"],
  "gig-hourly-rate": ["gas", "mileage"],
  "tax-set-aside": ["banking", "tax-software"],
};

/** Return up to `limit` offers matching the given categories, in order. */
export function offersForCategories(
  categories: OfferCategory[],
  limit = 2
): PartnerOffer[] {
  const picked: PartnerOffer[] = [];
  for (const cat of categories) {
    const match = PARTNER_OFFERS.find(
      o => o.category === cat && !picked.includes(o)
    );
    if (match) picked.push(match);
    if (picked.length >= limit) break;
  }
  return picked;
}

/** Convenience: offers for a given tool slug. */
export function offersForTool(slug: string, limit = 2): PartnerOffer[] {
  const cats = TOOL_OFFER_CATEGORIES[slug];
  return cats ? offersForCategories(cats, limit) : [];
}

/** FTC affiliate disclosure shown wherever offers appear. */
export const AFFILIATE_DISCLOSURE =
  "Some links above are partner/affiliate links. If you sign up we may earn a commission at no extra cost to you. We only list tools relevant to gig and 1099 workers. This is educational information, not financial or tax advice.";
