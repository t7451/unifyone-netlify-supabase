import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const envMock = vi.hoisted(() => ({
  braveSearchApiKey: "",
  firecrawlApiKey: "",
  browserlessApiKey: "",
  browserlessUrl: "https://chrome.browserless.io",
  linearApiKey: "",
  githubToken: "",
}));
vi.mock("../_core/env", () => ({ ENV: envMock }));
vi.mock("@netlify/blobs", () => ({
  getStore: vi.fn(() => ({
    set: vi.fn(),
    get: vi.fn(),
    list: vi.fn().mockResolvedValue({ blobs: [] }),
    delete: vi.fn(),
  })),
}));

import {
  executeNativeTool,
  htmlToMarkdown,
  isNativeTool,
  listNativeToolNames,
} from "./kaiNativeTools";

const ctx = { user: { id: 7, tenantId: 44 } };

describe("kaiNativeTools registry", () => {
  beforeEach(() => {
    envMock.braveSearchApiKey = "";
    envMock.browserlessApiKey = "";
    envMock.linearApiKey = "";
  });

  it("hides key-gated tools when keys are missing", () => {
    const names = listNativeToolNames();
    expect(names).not.toContain("web_search");
    expect(names).not.toContain("browser_screenshot");
    expect(names).not.toContain("linear_create_issue");
    // Keyless tools are always advertised.
    expect(names).toContain("fetch_page");
    expect(names).toContain("read_github");
    expect(names).toContain("fs_write");
  });

  it("advertises key-gated tools once configured", () => {
    envMock.braveSearchApiKey = "brave-key";
    envMock.browserlessApiKey = "bl-key";
    const names = listNativeToolNames();
    expect(names).toContain("web_search");
    expect(names).toContain("browser_screenshot");
    expect(names).toContain("browser_get_content");
  });

  it("refuses to execute unconfigured tools with a clear message", async () => {
    await expect(
      executeNativeTool("web_search", { query: "x" }, ctx)
    ).rejects.toThrow(/not configured/);
  });

  it("recognizes native tool names", () => {
    expect(isNativeTool("fetch_page")).toBe(true);
    expect(isNativeTool("oc_list_stores")).toBe(false);
  });
});

describe("SSRF guard (fetch_page)", () => {
  for (const bad of [
    "http://localhost:3000/admin",
    "http://127.0.0.1/secrets",
    "http://internal.service.local/x",
    "ftp://example.com/file",
  ]) {
    it(`rejects ${bad}`, async () => {
      await expect(
        executeNativeTool("fetch_page", { url: bad }, ctx)
      ).rejects.toThrow(/not allowed|Only http/);
    });
  }
});

describe("workspace path scoping", () => {
  it("rejects path traversal", async () => {
    await expect(
      executeNativeTool(
        "fs_write",
        { path: "../t45/steal.txt", content: "x" },
        ctx
      )
    ).rejects.toThrow(/Invalid workspace path/);
  });
});

describe("htmlToMarkdown fallback", () => {
  it("converts headings, links, and strips scripts", () => {
    const md = htmlToMarkdown(
      '<html><script>alert(1)</script><h1>Title</h1><p>Hello <a href="https://x.com">link</a></p><li>item</li></html>'
    );
    expect(md).toContain("# Title");
    expect(md).toContain("[link](https://x.com)");
    expect(md).toContain("- item");
    expect(md).not.toContain("alert");
  });
});

describe("network tools (mocked fetch)", () => {
  let fetchSpy: any;
  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch" as any);
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("web_search hits Brave with the subscription token", async () => {
    envMock.braveSearchApiKey = "brave-key";
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [
            { title: "T", url: "https://r.example", description: "snippet" },
          ],
        },
      }),
    });
    const out = await executeNativeTool("web_search", { query: "kai" }, ctx);
    expect(out).toEqual([
      { title: "T", url: "https://r.example", snippet: "snippet" },
    ]);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("api.search.brave.com");
    expect(fetchSpy.mock.calls[0][1].headers["X-Subscription-Token"]).toBe(
      "brave-key"
    );
  });

  it("fetch_page falls back to native conversion without Firecrawl", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      text: async () => "<h1>Docs</h1><p>Body</p>",
    });
    const out = (await executeNativeTool(
      "fetch_page",
      { url: "https://docs.example.com/page" },
      ctx
    )) as { source: string; markdown: string };
    expect(out.source).toBe("native");
    expect(out.markdown).toContain("# Docs");
  });

  it("read_github validates the repo format", async () => {
    await expect(
      executeNativeTool("read_github", { repo: "not a repo!" }, ctx)
    ).rejects.toThrow(/owner\/name/);
  });
});
