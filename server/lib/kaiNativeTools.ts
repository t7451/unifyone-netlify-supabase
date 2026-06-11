/**
 * server/lib/kaiNativeTools.ts
 *
 * App-layer tool registry for Kai. These tools run inside the Netlify
 * function (not the Cloudflare MCP worker) and are merged into the agent
 * loop and the run_code sandbox alongside the worker's oc_* tools.
 *
 * Key-optional design: tools whose external API key is missing are simply
 * not advertised, so the model never sees a dead tool.
 *
 * Capability groups:
 *   web_search                 — Brave Search API
 *   fetch_page                 — Firecrawl when configured, else native
 *                                fetch + HTML→Markdown conversion
 *   read_github                — GitMCP-style repo/file/README reader
 *   fs_list/read/write/delete  — tenant-scoped virtual filesystem on
 *                                Netlify Blobs (no OS filesystem exists
 *                                in serverless)
 *   browser_screenshot /
 *   browser_get_content        — real-browser automation via Browserless
 *   linear_create_issue /
 *   linear_search_issues       — Linear issue tracking
 */
import { getStore } from "@netlify/blobs";
import { ENV } from "../_core/env";
import type { Tool } from "../_core/llm";

export interface NativeToolContext {
  user: { id: string | number; tenantId?: string | number | null };
}

interface NativeToolSpec {
  definition: Tool;
  /** Tool is advertised only when this returns true. */
  isEnabled: () => boolean;
  execute: (
    args: Record<string, unknown>,
    ctx: NativeToolContext
  ) => Promise<unknown>;
}

const FETCH_TIMEOUT_MS = 15_000;
const MAX_PAGE_CHARS = 40_000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function toolDef(
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[] = []
): Tool {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: { type: "object", properties, required },
    },
  };
}

function str(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  return typeof v === "string" ? v : "";
}

/**
 * SSRF guard for tools that fetch arbitrary URLs: only plain http(s) to
 * public-looking hosts. Blocks localhost, IP literals, and internal TLDs.
 */
function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed");
  }
  const host = url.hostname.toLowerCase();
  const blocked =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    host.includes(":"); // IPv6 literal
  if (blocked) {
    throw new Error("URL host is not allowed");
  }
  return url;
}

/** Minimal HTML → Markdown-ish text conversion (fallback when no Firecrawl). */
export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<(?:br|\/p|\/div|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

// ── Virtual filesystem (Netlify Blobs, tenant-scoped) ───────────────────────

function workspaceStore() {
  return getStore({ name: "kai-workspace", consistency: "strong" });
}

/** Tenant prefix + path traversal protection. */
function workspaceKey(ctx: NativeToolContext, path: string): string {
  const tenant = ctx.user.tenantId != null ? String(ctx.user.tenantId) : "u";
  const clean = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!clean || clean.includes("..") || clean.length > 300) {
    throw new Error(`Invalid workspace path: ${path}`);
  }
  return `t${tenant}/${clean}`;
}

// ── Tool registry ─────────────────────────────────────────────────────────────

const NATIVE_TOOLS: NativeToolSpec[] = [
  {
    definition: toolDef(
      "web_search",
      "Search the live web (Brave Search). Returns titles, URLs, and snippets. Use for anything beyond your knowledge cutoff or about current events, prices, competitors, or documentation.",
      {
        query: { type: "string", description: "Search query" },
        count: {
          type: "number",
          description: "Result count (1-10, default 5)",
        },
      },
      ["query"]
    ),
    isEnabled: () => Boolean(ENV.braveSearchApiKey),
    async execute(args) {
      const query = str(args, "query");
      const count = Math.min(Math.max(Number(args.count) || 5, 1), 10);
      const res = await timedFetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
        { headers: { "X-Subscription-Token": ENV.braveSearchApiKey } }
      );
      if (!res.ok) throw new Error(`Brave Search HTTP ${res.status}`);
      const data = (await res.json()) as {
        web?: { results?: Array<Record<string, unknown>> };
      };
      return (data.web?.results ?? []).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.description,
      }));
    },
  },
  {
    definition: toolDef(
      "fetch_page",
      "Fetch a public web page and return its content as clean Markdown (Firecrawl-powered when configured). Use to read documentation, competitor pages, or any URL from web_search.",
      { url: { type: "string", description: "Absolute http(s) URL" } },
      ["url"]
    ),
    isEnabled: () => true,
    async execute(args) {
      const url = assertPublicUrl(str(args, "url")).toString();
      if (ENV.firecrawlApiKey) {
        const res = await timedFetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${ENV.firecrawlApiKey}`,
          },
          body: JSON.stringify({ url, formats: ["markdown"] }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            data?: { markdown?: string; metadata?: { title?: string } };
          };
          if (data.data?.markdown) {
            return {
              source: "firecrawl",
              title: data.data.metadata?.title ?? null,
              markdown: data.data.markdown.slice(0, MAX_PAGE_CHARS),
            };
          }
        }
        // fall through to native on Firecrawl failure
      }
      const res = await timedFetch(url, {
        headers: { accept: "text/html,*/*", "user-agent": "UnifyOne-Kai/1.0" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
      const html = await res.text();
      return {
        source: "native",
        markdown: htmlToMarkdown(html).slice(0, MAX_PAGE_CHARS),
      };
    },
  },
  {
    definition: toolDef(
      "read_github",
      "Read a GitHub repository: with no path returns the README plus the file tree; with a path returns that file's contents. Use to study libraries, docs, or example code.",
      {
        repo: { type: "string", description: 'Repository as "owner/name"' },
        path: {
          type: "string",
          description: "Optional file path inside the repo",
        },
        ref: {
          type: "string",
          description: "Optional branch/tag (default: default branch)",
        },
      },
      ["repo"]
    ),
    isEnabled: () => true,
    async execute(args) {
      const repo = str(args, "repo").replace(/^https?:\/\/github\.com\//, "");
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
        throw new Error('repo must be "owner/name"');
      }
      const headers: Record<string, string> = {
        accept: "application/vnd.github.raw+json",
        "user-agent": "UnifyOne-Kai/1.0",
        ...(ENV.githubToken
          ? { authorization: `Bearer ${ENV.githubToken}` }
          : {}),
      };
      const ref = str(args, "ref");
      const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      const path = str(args, "path");
      if (path) {
        const res = await timedFetch(
          `https://api.github.com/repos/${repo}/contents/${path}${refQuery}`,
          { headers }
        );
        if (!res.ok)
          throw new Error(`GitHub HTTP ${res.status} for ${repo}/${path}`);
        return {
          repo,
          path,
          content: (await res.text()).slice(0, MAX_PAGE_CHARS),
        };
      }
      const [readmeRes, treeRes] = await Promise.all([
        timedFetch(`https://api.github.com/repos/${repo}/readme${refQuery}`, {
          headers,
        }),
        timedFetch(
          `https://api.github.com/repos/${repo}/git/trees/${ref || "HEAD"}?recursive=1`,
          { headers: { ...headers, accept: "application/vnd.github+json" } }
        ),
      ]);
      const readme = readmeRes.ok ? await readmeRes.text() : null;
      const tree = treeRes.ok
        ? ((await treeRes.json()) as {
            tree?: Array<{ path: string; type: string }>;
          })
        : null;
      return {
        repo,
        readme: readme?.slice(0, MAX_PAGE_CHARS / 2) ?? null,
        files: (tree?.tree ?? [])
          .filter(t => t.type === "blob")
          .map(t => t.path)
          .slice(0, 500),
      };
    },
  },
  {
    definition: toolDef(
      "fs_write",
      "Write a text file to the persistent workspace (survives between conversations). Use for reports, drafts, generated content, or saving data for later.",
      {
        path: {
          type: "string",
          description: 'Relative path, e.g. "reports/weekly.md"',
        },
        content: { type: "string", description: "File contents (text)" },
      },
      ["path", "content"]
    ),
    isEnabled: () => true,
    async execute(args, ctx) {
      const key = workspaceKey(ctx, str(args, "path"));
      await workspaceStore().set(key, str(args, "content"));
      return { written: str(args, "path"), bytes: str(args, "content").length };
    },
  },
  {
    definition: toolDef(
      "fs_read",
      "Read a text file from the persistent workspace.",
      { path: { type: "string", description: "Relative path" } },
      ["path"]
    ),
    isEnabled: () => true,
    async execute(args, ctx) {
      const key = workspaceKey(ctx, str(args, "path"));
      const content = await workspaceStore().get(key, { type: "text" });
      if (content === null)
        throw new Error(`File not found: ${str(args, "path")}`);
      return { path: str(args, "path"), content };
    },
  },
  {
    definition: toolDef(
      "fs_list",
      "List files in the persistent workspace, optionally under a directory prefix.",
      { prefix: { type: "string", description: "Optional directory prefix" } },
      []
    ),
    isEnabled: () => true,
    async execute(args, ctx) {
      const tenant =
        ctx.user.tenantId != null ? String(ctx.user.tenantId) : "u";
      const base = `t${tenant}/`;
      const prefix = str(args, "prefix").replace(/^\/+/, "");
      const { blobs } = await workspaceStore().list({ prefix: base + prefix });
      return blobs.map(b => b.key.slice(base.length));
    },
  },
  {
    definition: toolDef(
      "fs_delete",
      "Delete a file from the persistent workspace.",
      { path: { type: "string", description: "Relative path" } },
      ["path"]
    ),
    isEnabled: () => true,
    async execute(args, ctx) {
      const key = workspaceKey(ctx, str(args, "path"));
      await workspaceStore().delete(key);
      return { deleted: str(args, "path") };
    },
  },
  {
    definition: toolDef(
      "browser_screenshot",
      "Render a page in a real headless browser and save a PNG screenshot to the workspace. Returns the workspace path. Use for visual checks of storefronts or competitor sites.",
      {
        url: { type: "string", description: "Absolute http(s) URL" },
        fullPage: {
          type: "boolean",
          description: "Capture full page (default false)",
        },
      },
      ["url"]
    ),
    isEnabled: () => Boolean(ENV.browserlessApiKey),
    async execute(args, ctx) {
      const url = assertPublicUrl(str(args, "url")).toString();
      const res = await timedFetch(
        `${ENV.browserlessUrl.replace(/\/$/, "")}/screenshot?token=${ENV.browserlessApiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            url,
            options: { type: "png", fullPage: Boolean(args.fullPage) },
          }),
        }
      );
      if (!res.ok) throw new Error(`Browserless HTTP ${res.status}`);
      const png = await res.arrayBuffer();
      const path = `screenshots/${Date.now()}.png`;
      await workspaceStore().set(workspaceKey(ctx, path), png);
      return { savedTo: path, bytes: png.byteLength };
    },
  },
  {
    definition: toolDef(
      "browser_get_content",
      "Render a page in a real headless browser (executes JavaScript) and return the resulting content as Markdown. Use for JS-heavy pages that fetch_page cannot read.",
      { url: { type: "string", description: "Absolute http(s) URL" } },
      ["url"]
    ),
    isEnabled: () => Boolean(ENV.browserlessApiKey),
    async execute(args) {
      const url = assertPublicUrl(str(args, "url")).toString();
      const res = await timedFetch(
        `${ENV.browserlessUrl.replace(/\/$/, "")}/content?token=${ENV.browserlessApiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
        }
      );
      if (!res.ok) throw new Error(`Browserless HTTP ${res.status}`);
      return {
        markdown: htmlToMarkdown(await res.text()).slice(0, MAX_PAGE_CHARS),
      };
    },
  },
  {
    definition: toolDef(
      "linear_create_issue",
      "Create an issue in Linear (bug report, feature request, task).",
      {
        title: { type: "string", description: "Issue title" },
        description: { type: "string", description: "Markdown body" },
        teamKey: {
          type: "string",
          description: 'Team key, e.g. "ENG" (defaults to first team)',
        },
      },
      ["title"]
    ),
    isEnabled: () => Boolean(ENV.linearApiKey),
    async execute(args) {
      const gql = async (
        query: string,
        variables?: Record<string, unknown>
      ) => {
        const res = await timedFetch("https://api.linear.app/graphql", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: ENV.linearApiKey,
          },
          body: JSON.stringify({ query, variables }),
        });
        if (!res.ok) throw new Error(`Linear HTTP ${res.status}`);
        const json = (await res.json()) as {
          data?: any;
          errors?: Array<{ message: string }>;
        };
        if (json.errors?.length) throw new Error(json.errors[0].message);
        return json.data;
      };
      const teamKey = str(args, "teamKey");
      const teams = await gql(`{ teams { nodes { id key name } } }`);
      const team =
        teams.teams.nodes.find((t: { key: string }) => t.key === teamKey) ??
        teams.teams.nodes[0];
      if (!team) throw new Error("No Linear team found");
      const created = await gql(
        `mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { identifier url } } }`,
        {
          input: {
            teamId: team.id,
            title: str(args, "title"),
            description: str(args, "description") || undefined,
          },
        }
      );
      return created.issueCreate.issue;
    },
  },
  {
    definition: toolDef(
      "linear_search_issues",
      "Search Linear issues by text query; returns identifier, title, state, and URL.",
      { query: { type: "string", description: "Search text" } },
      ["query"]
    ),
    isEnabled: () => Boolean(ENV.linearApiKey),
    async execute(args) {
      const res = await timedFetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: ENV.linearApiKey,
        },
        body: JSON.stringify({
          query: `query($q: String!) { searchIssues(term: $q, first: 10) { nodes { identifier title url state { name } } } }`,
          variables: { q: str(args, "query") },
        }),
      });
      if (!res.ok) throw new Error(`Linear HTTP ${res.status}`);
      const json = (await res.json()) as {
        data?: any;
        errors?: Array<{ message: string }>;
      };
      if (json.errors?.length) throw new Error(json.errors[0].message);
      return json.data.searchIssues.nodes;
    },
  },
];

// ── Public API ────────────────────────────────────────────────────────────────

const NATIVE_TOOL_MAP = new Map(
  NATIVE_TOOLS.map(t => [t.definition.function.name, t])
);

/** Definitions for all currently-enabled native tools. */
export function listNativeToolDefinitions(): Tool[] {
  return NATIVE_TOOLS.filter(t => t.isEnabled()).map(t => t.definition);
}

/** Names of all currently-enabled native tools. */
export function listNativeToolNames(): string[] {
  return listNativeToolDefinitions().map(t => t.function.name);
}

export function isNativeTool(name: string): boolean {
  return NATIVE_TOOL_MAP.has(name);
}

export async function executeNativeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: NativeToolContext
): Promise<unknown> {
  const tool = NATIVE_TOOL_MAP.get(name);
  if (!tool) throw new Error(`Unknown native tool: ${name}`);
  if (!tool.isEnabled()) {
    throw new Error(
      `Tool ${name} is not configured on this deployment (missing API key)`
    );
  }
  return tool.execute(args, ctx);
}
