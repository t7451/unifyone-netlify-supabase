import { describe, it, expect } from "vitest";
import { clipStorageKey } from "./lib/clipperWorker";

// ── clipStorageKey helper ─────────────────────────────────────────────────────

describe("clipStorageKey", () => {
  it("produces the expected storage path pattern", () => {
    expect(clipStorageKey(42, 7, 0)).toBe("clips/42/7/clip_01.mp4");
    expect(clipStorageKey(42, 7, 1)).toBe("clips/42/7/clip_02.mp4");
    expect(clipStorageKey(1, 100, 9)).toBe("clips/1/100/clip_10.mp4");
  });

  it("zero-pads the clip index to 2 digits", () => {
    expect(clipStorageKey(1, 1, 0)).toMatch(/clip_01\.mp4$/);
    expect(clipStorageKey(1, 1, 8)).toMatch(/clip_09\.mp4$/);
    expect(clipStorageKey(1, 1, 11)).toMatch(/clip_12\.mp4$/);
  });

  it("includes tenantId and jobId in the path", () => {
    const key = clipStorageKey(99, 123, 3);
    expect(key).toContain("99");
    expect(key).toContain("123");
  });
});

// ── Clip duration calculation ─────────────────────────────────────────────────

function calcDuration(start: number, end: number): number {
  return Math.max(0, Math.round(end - start));
}

describe("clip duration calculation", () => {
  it("rounds float seconds to integers", () => {
    expect(calcDuration(0.4, 45.6)).toBe(45);
    expect(calcDuration(10.1, 55.9)).toBe(46);
  });

  it("clamps negative durations to zero", () => {
    expect(calcDuration(50, 30)).toBe(0);
    expect(calcDuration(10, 10)).toBe(0);
  });

  it("handles exact integer boundaries", () => {
    expect(calcDuration(0, 45)).toBe(45);
    expect(calcDuration(60, 105)).toBe(45);
  });
});

// ── Engine output parsing ─────────────────────────────────────────────────────

interface RawClip {
  start: number;
  end: number;
  score: number;
  title_suggestion: string;
  caption: string;
  output_path: string;
}

function parseEngineOutput(raw: string): RawClip[] {
  const parsed = JSON.parse(raw) as { clips?: RawClip[] };
  return parsed.clips ?? [];
}

describe("engine JSON output parsing", () => {
  it("parses a valid engine response", () => {
    const payload = JSON.stringify({
      clips: [
        {
          start: 0,
          end: 45,
          score: 0.93,
          title_suggestion: "Clip 1",
          caption: "A great moment",
          output_path: "/tmp/clip_01.mp4",
        },
      ],
    });
    const clips = parseEngineOutput(payload);
    expect(clips).toHaveLength(1);
    expect(clips[0].score).toBe(0.93);
    expect(clips[0].title_suggestion).toBe("Clip 1");
  });

  it("returns an empty array when clips key is missing", () => {
    expect(parseEngineOutput(JSON.stringify({}))).toEqual([]);
  });

  it("returns an empty array for an empty clips list", () => {
    expect(parseEngineOutput(JSON.stringify({ clips: [] }))).toEqual([]);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseEngineOutput("not-json")).toThrow();
  });
});

// ── Storage key uniqueness ────────────────────────────────────────────────────

describe("storage key uniqueness across jobs and tenants", () => {
  it("produces distinct keys for different jobs", () => {
    expect(clipStorageKey(1, 1, 0)).not.toBe(clipStorageKey(1, 2, 0));
  });

  it("produces distinct keys for different tenants", () => {
    expect(clipStorageKey(1, 1, 0)).not.toBe(clipStorageKey(2, 1, 0));
  });

  it("produces distinct keys for different clip indices", () => {
    expect(clipStorageKey(1, 1, 0)).not.toBe(clipStorageKey(1, 1, 1));
  });
});
