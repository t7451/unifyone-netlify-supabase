import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./logger", () => ({
  logger: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  },
}));

import {
  EMBEDDING_DIM,
  _clearVoyageCache,
  deterministicEmbedding,
  voyageEmbed,
  voyageEmbedOne,
} from "./voyage";

function makeFakeVector(seed: number, dim = 1024): number[] {
  const out: number[] = new Array(dim);
  let s = seed || 1;
  for (let i = 0; i < dim; i++) {
    s = (s * 9301 + 49297) % 233280;
    out[i] = (s / 233280) * 2 - 1;
  }
  return out;
}

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function voyagePayload(n: number, dim = 1024) {
  return {
    object: "list",
    data: Array.from({ length: n }, (_, i) => ({
      object: "embedding",
      embedding: makeFakeVector(i + 1, dim),
      index: i,
    })),
    model: "voyage-3-large",
    usage: { total_tokens: n * 10 },
  };
}

beforeEach(() => {
  _clearVoyageCache();
  delete process.env.VOYAGE_API_KEY;
});

afterEach(() => {
  delete process.env.VOYAGE_API_KEY;
});

describe("deterministicEmbedding", () => {
  it("returns a vector of exactly the requested dimension", () => {
    const v = deterministicEmbedding("hello world", 1536);
    expect(v).toHaveLength(1536);
    expect(v.every(n => typeof n === "number")).toBe(true);
  });

  it("is deterministic - same input -> same vector", () => {
    const a = deterministicEmbedding("the quick brown fox", 64);
    const b = deterministicEmbedding("the quick brown fox", 64);
    expect(a).toEqual(b);
  });

  it("different input -> different vector", () => {
    const a = deterministicEmbedding("apple", 64);
    const b = deterministicEmbedding("banana", 64);
    expect(a).not.toEqual(b);
  });
});

describe("voyageEmbed - fallback (no API key)", () => {
  it("falls back to deterministic when VOYAGE_API_KEY is unset", async () => {
    const fetchSpy = vi.fn();
    const [vec] = await voyageEmbed(["hello"], { fetchImpl: fetchSpy as any });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(vec).toHaveLength(EMBEDDING_DIM);
    expect(vec).toEqual(deterministicEmbedding("hello", EMBEDDING_DIM));
  });

  it("returns one vector per input", async () => {
    const out = await voyageEmbed(["a", "b", "c"]);
    expect(out).toHaveLength(3);
    out.forEach(v => expect(v).toHaveLength(EMBEDDING_DIM));
  });

  it("returns [] for empty input list", async () => {
    const out = await voyageEmbed([]);
    expect(out).toEqual([]);
  });
});

describe("voyageEmbed - live (mocked fetch)", () => {
  it("returns one vector of EMBEDDING_DIM length per input on 200", async () => {
    process.env.VOYAGE_API_KEY = "vy-test";
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse(voyagePayload(2)));
    const out = await voyageEmbed(["foo", "bar"], {
      fetchImpl: fetchImpl as any,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.voyageai.com/v1/embeddings");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer vy-test");
    const body = JSON.parse(init.body);
    expect(body.input).toEqual(["foo", "bar"]);
    expect(body.input_type).toBe("document");
    expect(body.model).toBe("voyage-3-large");
    expect(out).toHaveLength(2);
    out.forEach(v => expect(v).toHaveLength(EMBEDDING_DIM));
  });

  it("passes mode=query when requested", async () => {
    process.env.VOYAGE_API_KEY = "vy-test";
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse(voyagePayload(1)));
    await voyageEmbedOne("hi", { mode: "query", fetchImpl: fetchImpl as any });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.input_type).toBe("query");
  });

  it("retries on 429 then succeeds (2 fetch calls)", async () => {
    process.env.VOYAGE_API_KEY = "vy-test";
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse({ error: "rate limited" }, 429))
      .mockResolvedValueOnce(makeJsonResponse(voyagePayload(1)));
    const out = await voyageEmbed(["hello"], { fetchImpl: fetchImpl as any });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(out).toHaveLength(1);
    expect(out[0]).toHaveLength(EMBEDDING_DIM);
  });

  it("retries on 500 then succeeds", async () => {
    process.env.VOYAGE_API_KEY = "vy-test";
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse({ error: "server" }, 500))
      .mockResolvedValueOnce(makeJsonResponse(voyagePayload(1)));
    const out = await voyageEmbed(["hello"], { fetchImpl: fetchImpl as any });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(out[0]).toHaveLength(EMBEDDING_DIM);
  });

  it("falls back to hash on persistent 500s after exhausting retries", async () => {
    process.env.VOYAGE_API_KEY = "vy-test";
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(makeJsonResponse({ error: "down" }, 500));
    const [vec] = await voyageEmbed(["hello"], { fetchImpl: fetchImpl as any });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(vec).toEqual(deterministicEmbedding("hello", EMBEDDING_DIM));
  });

  it("does NOT retry on non-retriable 400", async () => {
    process.env.VOYAGE_API_KEY = "vy-test";
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(makeJsonResponse({ error: "bad" }, 400));
    const [vec] = await voyageEmbed(["hello"], { fetchImpl: fetchImpl as any });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(vec).toEqual(deterministicEmbedding("hello", EMBEDDING_DIM));
  });

  it("does not re-call fetch when result is cached", async () => {
    process.env.VOYAGE_API_KEY = "vy-test";
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse(voyagePayload(1)));
    const [v1] = await voyageEmbed(["cache-me"], {
      fetchImpl: fetchImpl as any,
    });
    const [v2] = await voyageEmbed(["cache-me"], {
      fetchImpl: fetchImpl as any,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(v1).toEqual(v2);
  });

  it("splits >128-input requests into multiple batches", async () => {
    process.env.VOYAGE_API_KEY = "vy-test";
    const fetchImpl = vi
      .fn()
      .mockImplementation(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(init.body as string);
        return makeJsonResponse(voyagePayload(body.input.length));
      });
    const inputs = Array.from({ length: 200 }, (_, i) => `chunk-${i}`);
    const out = await voyageEmbed(inputs, { fetchImpl: fetchImpl as any });
    expect(out).toHaveLength(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("truncates oversized vectors to EMBEDDING_DIM", async () => {
    process.env.VOYAGE_API_KEY = "vy-test";
    const oversized = {
      object: "list",
      data: [
        { object: "embedding", embedding: makeFakeVector(1, 2048), index: 0 },
      ],
      model: "voyage-3-large",
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse(oversized));
    const [vec] = await voyageEmbed(["x"], { fetchImpl: fetchImpl as any });
    expect(vec).toHaveLength(EMBEDDING_DIM);
  });

  it("zero-pads undersized vectors to EMBEDDING_DIM", async () => {
    process.env.VOYAGE_API_KEY = "vy-test";
    const undersized = {
      object: "list",
      data: [
        { object: "embedding", embedding: makeFakeVector(1, 256), index: 0 },
      ],
      model: "voyage-3-large",
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse(undersized));
    const [vec] = await voyageEmbed(["x"], { fetchImpl: fetchImpl as any });
    expect(vec).toHaveLength(EMBEDDING_DIM);
    expect(vec.slice(256).every(n => n === 0)).toBe(true);
  });
});

describe("documentChat round-trip semantics (fallback mode)", () => {
  it("identical text -> identical vector regardless of mode (fallback)", async () => {
    const queryVec = await voyageEmbedOne("foo", { mode: "query" });
    const docVec = await voyageEmbedOne("foo", { mode: "document" });
    expect(queryVec).toEqual(docVec);
  });

  it("cosine of identical fallback vectors approaches 1.0", async () => {
    const a = await voyageEmbedOne("the cathedral framework", {
      mode: "document",
    });
    const b = await voyageEmbedOne("the cathedral framework", {
      mode: "query",
    });
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const cos = dot / (Math.sqrt(magA) * Math.sqrt(magB));
    expect(cos).toBeCloseTo(1, 5);
  });
});
