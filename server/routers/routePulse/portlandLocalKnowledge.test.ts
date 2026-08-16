import { describe, it, expect } from "vitest";
import {
  matchLocalKnowledge,
  localKnowledgePenalties,
  isPortlandMetro,
  activeEventsOn,
  formatLocalKnowledgeForPrompt,
} from "./portlandLocalKnowledge";

describe("portlandLocalKnowledge", () => {
  it("detects Portland metro bounds", () => {
    expect(isPortlandMetro(45.52, -122.68)).toBe(true);
    expect(isPortlandMetro(47.6, -122.3)).toBe(false); // Seattle
  });

  it("matches Rose Quarter corridor from road names", () => {
    const hits = matchLocalKnowledge(
      {
        maneuvers: [
          { roadName: "I-5 South" },
          { roadName: "Weidler Street" },
        ],
        geometry: {
          coordinates: [
            [-122.68, 45.53],
            [-122.67, 45.525],
          ],
        },
      },
      "peak"
    );
    expect(hits.some(h => h.id === "i5-rose-quarter")).toBe(true);
    expect(hits[0]!.stressPenalty).toBeGreaterThan(10);
  });

  it("matches Central Eastside train trap", () => {
    const hits = matchLocalKnowledge({
      maneuvers: [{ roadName: "SE 11th Avenue" }],
      geometry: { coordinates: [[-122.655, 45.51]] },
    });
    expect(hits.some(h => h.id === "central-eastside-trains")).toBe(true);
  });

  it("caps combined penalties", () => {
    const hits = matchLocalKnowledge(
      {
        maneuvers: [
          { roadName: "I-5" },
          { roadName: "Powell Boulevard" },
          { roadName: "82nd Avenue" },
          { roadName: "US 26" },
        ],
        geometry: {
          coordinates: [
            [-122.68, 45.53],
            [-122.7, 45.51],
            [-122.56, 45.5],
          ],
        },
      },
      "peak"
    );
    const pen = localKnowledgePenalties(hits);
    expect(pen.stress).toBeLessThanOrEqual(38);
    expect(pen.bottleneck).toBeLessThanOrEqual(45);
  });

  it("formats prompt block when hits exist", () => {
    const hits = matchLocalKnowledge({
      maneuvers: [{ roadName: "Powell Boulevard" }],
    });
    const block = formatLocalKnowledgeForPrompt(hits);
    expect(block).toContain("Powell");
    expect(block).toContain("local-driver knowledge");
  });

  it("includes Rose Quarter event in September 2026 window", () => {
    const events = activeEventsOn(new Date("2026-09-15T12:00:00Z"));
    expect(events.some(e => e.id === "i5-sb-rose-quarter-2026-09")).toBe(true);
    const none = activeEventsOn(new Date("2026-08-01T12:00:00Z"));
    expect(none.some(e => e.id === "i5-sb-rose-quarter-2026-09")).toBe(false);
  });
});
