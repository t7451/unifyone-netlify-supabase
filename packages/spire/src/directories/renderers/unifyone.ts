import type { SiteRenderer } from "./index.js";

// UnifyOne submission copy. Kept here (not in spire_sites) so marketing can
// iterate the product tagline in code review without a DB migration.

export const unifyoneRenderer: SiteRenderer = ({ site }) => {
  const domain = site.domain.startsWith("http")
    ? site.domain
    : `https://${site.domain.replace(/\/$/, "")}`;
  return {
    product_name: "UnifyOne",
    tagline: "Your money. Your AI. One platform.",
    description:
      "UnifyOne is contextual financial AI for people who actually work for their money. " +
      "Gig drivers, freelancers, and small-business operators connect their real income sources — " +
      "Uber, DoorDash, Stripe, Shopify, Square — and get answers grounded in their own numbers, " +
      "not a stock dataset. Developers can build on the same Kai engine via the UnifyAI router: " +
      "one API, every model, zero lock-in.",
    url: domain,
    pricing_url: `${domain}/pricing`,
    demo_url: `${domain}/gig-workers`,
    logo_url: `${domain}/favicon.svg`,
    categories: ["saas", "ai", "fintech", "gig-economy", "developer-tools"],
    tags: [
      "ai",
      "fintech",
      "gig-economy",
      "freelance",
      "mileage-tracking",
      "llm-api",
      "mcp",
      "small-business",
    ],
    contact_email: "keith@1commerce.online",
  };
};
