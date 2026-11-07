import { describe, expect, it } from "vitest";
import { FINANCE_GUIDES } from "../client/src/content/geo/financeGuides";
import { CHIME_PLACEMENT } from "../client/src/content/geo/chimePlacement";
import { ROUTE_SEO } from "../client/src/content/routeSeo";

describe("Drew's sponsored emergency-fund placement", () => {
  it("keeps exactly one placement in its agreed section, with no links", () => {
    const guide = FINANCE_GUIDES.find(
      g => g.slug === "gig-worker-emergency-fund"
    )!;
    const sections = guide.sections.filter(s => s.sponsoredMention);
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe(
      "How to build it without a steady paycheck"
    );
    expect(sections[0].sponsoredMention).toEqual(CHIME_PLACEMENT);
    expect(CHIME_PLACEMENT.label).toBe("Sponsored mention");
    expect(CHIME_PLACEMENT.source).toBe("Chime.com | Sourced on Oct-23, 2026");
    expect(CHIME_PLACEMENT.paragraphs).toHaveLength(2);
    expect(CHIME_PLACEMENT.paragraphs.join(" ")).not.toMatch(
      /https?:|<a\b|\]\(/i
    );
  });

  it("includes each sponsored paragraph once and in order in the static summary", () => {
    const routes = ROUTE_SEO.filter(
      route => route.path === "/gig-worker-emergency-fund"
    );
    expect(routes).toHaveLength(1);
    const body = routes[0].body!;
    const placement = [
      CHIME_PLACEMENT.label,
      ...CHIME_PLACEMENT.paragraphs,
      CHIME_PLACEMENT.source,
    ];
    const index = body.indexOf(CHIME_PLACEMENT.label);
    expect(index).toBeGreaterThan(0);
    expect(body.slice(index, index + placement.length)).toEqual(placement);
    for (const paragraph of placement)
      expect(body.filter(p => p === paragraph)).toHaveLength(1);
  });
});
