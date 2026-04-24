import type { SiteRenderer } from "./index.js";

// The Signal — practitioner editorial. Submission copy leans into the
// anti-guru operator voice. Placeholder until The Signal's site actually
// ships; current domain/URL values come from spire_sites.

export const theSignalRenderer: SiteRenderer = ({ site }) => {
  const domain = site.domain.startsWith("http")
    ? site.domain
    : `https://${site.domain.replace(/\/$/, "")}`;
  return {
    product_name: "The Signal",
    tagline: "Practitioner writing for people who build.",
    description:
      "The Signal is long-form editorial from operators — founders, engineers, and independent " +
      "practitioners writing about work they actually do. No listicles, no thought-leadership " +
      "sludge, no repurposed Twitter threads. Weekly essays, occasional deep dives, zero filler.",
    url: domain,
    demo_url: `${domain}/archive`,
    logo_url: `${domain}/favicon.svg`,
    categories: ["editorial", "newsletter", "writing", "practitioner"],
    tags: ["editorial", "practitioner", "long-form", "operator-writing"],
    contact_email: "keith@1commerce.online",
  };
};
