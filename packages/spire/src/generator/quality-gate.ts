// Pure-TS post-write quality check. No AI call. Runs on every article before
// it can move to status='review' or 'published'. The gate is intentionally
// strict — it's easier to tighten prompts than to apologize for a ranked
// page full of AI slop.

export type QualityCheck = {
  name: string;
  pass: boolean;
  message: string;
};

export type QualityReport = {
  pass: boolean;
  score: number; // 0-100
  wordCount: number;
  checks: QualityCheck[];
};

// Single-character runs that betray Claude-ism patterns. Anchored to word
// boundaries so "information" doesn't hit "realm".
const FORBIDDEN_WORDS = [
  "delve",
  "delves",
  "leverage",
  "leveraging",
  "leveraged",
  "tapestry",
  "landscape",
  "realm",
  "bustling",
  "intricate",
  "elevate",
  "elevated",
  "elevating",
  "seamless",
  "seamlessly",
];

const FORBIDDEN_PHRASES = [
  /in today'?s fast-paced/i,
  /in this article,? we will explore/i,
  /let'?s dive in/i,
  /in conclusion,?/i,
  /it'?s important to note/i,
  /it is important to note/i,
  /when it comes to/i,
];

const AI_LEAK_PATTERNS = [
  /as an ai( language model)?/i,
  /as a language model/i,
  /i(?:'m| am) an ai/i,
  /i cannot (?:provide|access|browse|verify|check)/i,
  /i do(?:n'?t| not) have (?:access|the ability)/i,
  /my (?:training data|knowledge cutoff)/i,
  /i apologize,? but/i,
];

export function qualityGate(
  markdown: string,
  briefInternalLinks: Array<{ anchor: string; url: string }>,
  briefOutboundSources: Array<{ url: string }>,
  /**
   * Batch 04: mesh crosslinks supplied to the brief. When ≥ 2 were given,
   * the article must include ≥ 1 of them — otherwise Claude is ignoring
   * the mesh and the piece fails the gate.
   */
  briefMeshCrosslinks: Array<{ url: string }> = []
): QualityReport {
  const checks: QualityCheck[] = [];

  // 1. Word count
  const bodyWords = countWords(markdown);
  checks.push({
    name: "word_count_>=_1200",
    pass: bodyWords >= 1200,
    message: `body word count: ${bodyWords}`,
  });

  // 2. No H1 in body (title comes from frontmatter)
  const h1Count = (markdown.match(/^# [^\n]+$/gm) ?? []).length;
  checks.push({
    name: "no_h1_in_body",
    pass: h1Count === 0,
    message:
      h1Count === 0
        ? "no H1 found"
        : `found ${h1Count} H1(s); title must come from frontmatter only`,
  });

  // 3. At least 3 H2s
  const h2Count = (markdown.match(/^## [^\n]+$/gm) ?? []).length;
  checks.push({
    name: "h2_>=_3",
    pass: h2Count >= 3,
    message: `H2 count: ${h2Count}`,
  });

  // 4. No H4+ (we enforce clean 2-level hierarchy)
  const deepHeadingCount = (markdown.match(/^####+ [^\n]+$/gm) ?? []).length;
  checks.push({
    name: "no_h4_plus",
    pass: deepHeadingCount === 0,
    message:
      deepHeadingCount === 0
        ? "hierarchy clean (no H4+)"
        : `found ${deepHeadingCount} heading(s) at H4 or deeper; max depth is H3`,
  });

  // 5. >= 2 internal links from the brief's allow-list. Internal links can
  //    be same-site paths (/gig-workers) or cross-site mesh URLs (full
  //    https://... to another 1Commerce-network site) — both count.
  const internalLinkAllowList = new Set(briefInternalLinks.map(l => l.url));
  const meshUrlAllowList = new Set(briefMeshCrosslinks.map(l => l.url));
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const foundLinks: Array<{ anchor: string; url: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(markdown)) !== null) {
    foundLinks.push({ anchor: m[1]!, url: m[2]! });
  }
  const internalHits = foundLinks.filter(
    l => internalLinkAllowList.has(l.url) || meshUrlAllowList.has(l.url)
  );
  checks.push({
    name: "internal_links_>=_2",
    pass: internalHits.length >= 2,
    message: `found ${internalHits.length} internal link(s) matching brief allow-list (out of ${foundLinks.length} total links)`,
  });

  // 6. Outbound links only from the outbound allow-list OR the mesh allow-list.
  //    Mesh URLs are https:// but are not third-party sources — they're
  //    cross-site internal links. Must whitelist them or the check falsely
  //    rejects every well-behaved mesh piece.
  const outboundAllowList = new Set(briefOutboundSources.map(s => s.url));
  const violatingOutbound = foundLinks.filter(
    l =>
      /^https?:\/\//i.test(l.url) &&
      !outboundAllowList.has(l.url) &&
      !meshUrlAllowList.has(l.url)
  );
  checks.push({
    name: "no_unpermitted_outbound_links",
    pass: violatingOutbound.length === 0,
    message:
      violatingOutbound.length === 0
        ? "all outbound links within brief allow-list"
        : `unpermitted outbound: ${violatingOutbound
            .slice(0, 3)
            .map(l => l.url)
            .join(", ")}`,
  });

  // 5b. Mesh-link check. Only enforced when the brief supplied ≥ 2 mesh
  //     crosslinks — otherwise the cluster simply has no coverage and the
  //     article has nothing to mesh to.
  if (briefMeshCrosslinks.length >= 2) {
    const meshHits = foundLinks.filter(l => meshUrlAllowList.has(l.url));
    checks.push({
      name: "mesh_links_present",
      pass: meshHits.length >= 1,
      message:
        meshHits.length >= 1
          ? `found ${meshHits.length} mesh link(s)`
          : `0 mesh links out of ${briefMeshCrosslinks.length} supplied — Claude ignored mesh context`,
    });
  }

  // 7. Every link resolves to internal path or full URL
  const malformedLinks = foundLinks.filter(
    l =>
      !(
        l.url.startsWith("/") ||
        l.url.startsWith("http://") ||
        l.url.startsWith("https://")
      )
  );
  checks.push({
    name: "all_links_well_formed",
    pass: malformedLinks.length === 0,
    message:
      malformedLinks.length === 0
        ? "all links well-formed"
        : `malformed: ${malformedLinks
            .slice(0, 3)
            .map(l => l.url)
            .join(", ")}`,
  });

  // 8. No forbidden words (word-boundary match, case-insensitive)
  const hitWords = FORBIDDEN_WORDS.filter(w =>
    new RegExp(`\\b${escapeRegExp(w)}\\b`, "i").test(markdown)
  );
  checks.push({
    name: "no_forbidden_words",
    pass: hitWords.length === 0,
    message:
      hitWords.length === 0
        ? "no forbidden words"
        : `hit: ${hitWords.join(", ")}`,
  });

  // 9. No forbidden phrases
  const hitPhrases = FORBIDDEN_PHRASES.filter(re => re.test(markdown)).map(
    re => re.source
  );
  checks.push({
    name: "no_forbidden_phrases",
    pass: hitPhrases.length === 0,
    message:
      hitPhrases.length === 0
        ? "no forbidden phrases"
        : `hit: ${hitPhrases.join(", ")}`,
  });

  // 10. No AI-leak strings
  const hitLeaks = AI_LEAK_PATTERNS.filter(re => re.test(markdown)).map(
    re => re.source
  );
  checks.push({
    name: "no_ai_leaks",
    pass: hitLeaks.length === 0,
    message:
      hitLeaks.length === 0
        ? "no AI self-reference"
        : `hit: ${hitLeaks.join(", ")}`,
  });

  // 11. No unescaped `---` inside body (breaks Astro frontmatter parsing
  //     because the publisher prepends --- delimiters).
  //     Match `---` only when it appears at the start of a line.
  const lines = markdown.split("\n");
  const bareDashDash = lines.filter(line => line.trim() === "---").length;
  checks.push({
    name: "no_bare_dash_delimiter_in_body",
    pass: bareDashDash === 0,
    message:
      bareDashDash === 0
        ? "no bare --- lines"
        : `found ${bareDashDash} bare --- line(s); would break frontmatter parsing`,
  });

  const passed = checks.filter(c => c.pass).length;
  const total = checks.length;
  const score = Math.round((passed / total) * 100);
  const pass = checks.every(c => c.pass);

  return {
    pass,
    score,
    wordCount: bodyWords,
    checks,
  };
}

function countWords(md: string): number {
  // Strip code fences, then count whitespace-separated tokens.
  const stripped = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/[#*_~>\-]+/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // keep anchor text, drop url
    .trim();
  if (stripped.length === 0) return 0;
  return stripped.split(/\s+/).filter(t => t.length > 0).length;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
