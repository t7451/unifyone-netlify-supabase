import { describe, it, expect } from "vitest";
import {
  parseExploreForRelatedQueries,
  parseRelatedSearches,
  stripJsonPrefix,
} from "../lib/googleTrends";

describe("stripJsonPrefix", () => {
  it("strips the )]}', XSSI prefix and parses JSON", () => {
    const raw = ')]}\',\n{"a":1}';
    expect(stripJsonPrefix(raw)).toEqual({ a: 1 });
  });

  it("handles array payloads", () => {
    expect(stripJsonPrefix(")]}',[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("throws when there is no JSON", () => {
    expect(() => stripJsonPrefix(")]}',")).toThrow();
  });
});

describe("parseExploreForRelatedQueries", () => {
  it("finds the RELATED_QUERIES widget token + request", () => {
    const explore = {
      widgets: [
        { id: "TIMESERIES", token: "t0", request: { a: 1 } },
        { id: "RELATED_QUERIES", token: "tok123", request: { q: "x" } },
      ],
    };
    expect(parseExploreForRelatedQueries(explore)).toEqual({
      token: "tok123",
      request: { q: "x" },
    });
  });

  it("returns null when the widget or fields are missing", () => {
    expect(parseExploreForRelatedQueries({ widgets: [] })).toBeNull();
    expect(
      parseExploreForRelatedQueries({
        widgets: [{ id: "RELATED_QUERIES" }],
      })
    ).toBeNull();
    expect(parseExploreForRelatedQueries({})).toBeNull();
  });
});

describe("parseRelatedSearches", () => {
  it("maps top (list 0) and rising (list 1) ranked keywords", () => {
    const json = {
      default: {
        rankedList: [
          {
            rankedKeyword: [
              { query: "blue widget", value: 100 },
              { query: "widget pro", value: 80 },
            ],
          },
          {
            rankedKeyword: [{ query: "widget 2026", value: 250 }],
          },
        ],
      },
    };
    const out = parseRelatedSearches(json);
    expect(out.top).toEqual([
      { query: "blue widget", value: 100 },
      { query: "widget pro", value: 80 },
    ]);
    expect(out.rising).toEqual([{ query: "widget 2026", value: 250 }]);
  });

  it("returns empty arrays for an empty/malformed payload", () => {
    expect(parseRelatedSearches({})).toEqual({ top: [], rising: [] });
    expect(parseRelatedSearches({ default: { rankedList: [] } })).toEqual({
      top: [],
      rising: [],
    });
  });
});
