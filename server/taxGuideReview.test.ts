import { describe, expect, it } from "vitest";
import { STATE_TAX_GUIDES } from "../client/src/content/geo/stateTaxGuides";
import { CITY_TAX_GUIDES } from "../client/src/content/geo/cityTaxGuides";
import { PLATFORM_TAX_GUIDES } from "../client/src/content/geo/platformTaxGuides";
import { ROUTE_SEO } from "../client/src/content/routeSeo";
import { REVIEWED_RESOURCE_SLUGS } from "../client/src/content/resourceReview";

const guides = [
  ...STATE_TAX_GUIDES,
  ...CITY_TAX_GUIDES,
  ...PLATFORM_TAX_GUIDES,
];

describe("Reviewed state, city and platform tax guides", () => {
  it("covers every existing tax route without duplicate crawler summaries", () => {
    expect(STATE_TAX_GUIDES).toHaveLength(51);
    expect(CITY_TAX_GUIDES).toHaveLength(5);
    expect(PLATFORM_TAX_GUIDES).toHaveLength(24);
    expect(new Set(guides.map(g => g.slug)).size).toBe(80);
    for (const guide of guides) {
      expect(REVIEWED_RESOURCE_SLUGS).toContain(guide.slug);
      const summaries = ROUTE_SEO.filter(r => r.path === `/${guide.slug}`);
      expect(summaries, guide.slug).toHaveLength(1);
      expect(summaries[0].description).toBe(guide.metaDescription);
      expect(guide.metaDescription.length, guide.slug).toBeLessThanOrEqual(158);
      const body =
        "stateBody" in guide
          ? guide.stateBody
          : "localBody" in guide
            ? guide.localBody
            : guide.formsBody;
      for (const paragraph of body)
        expect(summaries[0].body).toContain(paragraph);
      // FAQ answers are also emitted by the live page's FAQPage schema.
      for (const faq of guide.faqs) expect(summaries[0].body).toContain(faq.a);
      const sources =
        "stateResources" in guide
          ? guide.stateResources
          : "localResources" in guide
            ? guide.localResources
            : guide.resources;
      for (const source of sources ?? [])
        expect(summaries[0].externalLinks).toContainEqual({
          label: source.label,
          url: source.href,
        });
    }
  });

  it("does not regress the jurisdiction-specific exceptions", () => {
    const state = (name: string) =>
      STATE_TAX_GUIDES.find(g => g.state === name)!.stateBody.join(" ");
    expect(state("Idaho")).toContain("does not require individuals");
    expect(state("Utah")).toContain("no quarterly individual");
    expect(state("Virginia")).toContain("May 1");
    expect(state("California")).toContain("30%, 40%, 0% and 30%");
    expect(state("Washington")).toContain("gross business receipts");
    expect(state("New Hampshire")).toContain("Business Profits Tax");
    expect(state("Oregon")).toContain("transit self-employment taxes");
    expect(state("New York")).toContain("$150,000");
    const philly = CITY_TAX_GUIDES.find(g => g.city === "Philadelphia")!;
    expect(philly.localBody.join(" ")).toContain(
      "exemption ended beginning with tax year 2025"
    );
    const portland = CITY_TAX_GUIDES.find(g => g.city === "Portland")!;
    expect(portland.localBody.join(" ")).toContain("$128,000");
    expect(portland.localBody.join(" ")).toContain("$75,000");
  });

  it("retains confirmed form distinctions and source limitations", () => {
    const form = (slug: string) =>
      PLATFORM_TAX_GUIDES.find(g => g.slug === slug)!.formsBody.join(" ");
    expect(form("favor-taxes")).toContain(
      "does not issue Runner Forms 1099-NEC"
    );
    expect(form("goshare-taxes")).toContain("Form 1099-K, not 1099-NEC");
    expect(form("dolly-taxes")).toContain("rebranded as Taskrabbit Delivery");
    expect(form("amazon-flex-taxes")).toContain("not independently confirmed");
    expect(form("veho-taxes")).toContain("does not specify");
    for (const guide of PLATFORM_TAX_GUIDES.filter(g => g.sellerFraming)) {
      expect(guide.formsBody.join(" ")).toContain(
        "personal loss is not deductible"
      );
      expect(guide.formsBody.join(" ")).toContain("taxable capital gain");
    }
  });
});
