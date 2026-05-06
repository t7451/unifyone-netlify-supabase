import { describe, it, expect } from "vitest";
import { parseSseChunks } from "./nlwebClient";

describe("parseSseChunks", () => {
  it("extracts the `response` field from a Workers AI SSE event", () => {
    const out = parseSseChunks('data: {"response":"hello"}');
    expect(out).toEqual(["hello"]);
  });

  it("concatenates multiple events in order", () => {
    const raw = [
      'data: {"response":"hel"}',
      'data: {"response":"lo "}',
      'data: {"response":"world"}',
    ].join("\n");
    expect(parseSseChunks(raw).join("")).toBe("hello world");
  });

  it("ignores the [DONE] sentinel and blank lines", () => {
    const raw = ['data: {"response":"hi"}', "", "data: [DONE]"].join("\n");
    expect(parseSseChunks(raw)).toEqual(["hi"]);
  });

  it("ignores non-data lines and malformed JSON", () => {
    const raw = [
      ": keepalive comment",
      "event: ping",
      "data: not-json",
      'data: {"response":"ok"}',
    ].join("\n");
    expect(parseSseChunks(raw)).toEqual(["ok"]);
  });

  it("skips events without a response field", () => {
    expect(parseSseChunks('data: {"other":"x"}')).toEqual([]);
  });
});
