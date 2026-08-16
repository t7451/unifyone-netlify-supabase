/**
 * server/lib/aiResponseFramework.ts
 *
 * High-end response quality framework for Kai and other LLM surfaces.
 *
 * Goals:
 *  1. Consistent structure (answer → facts → actions → caveats)
 *  2. Fast heuristic scoring with no extra model calls
 *  3. Optional critique + refine pass for high-quality mode
 *  4. Shared system-prompt upgrades used across chat, agent, and tools
 *
 * Quality modes:
 *  - fast:     draft only + light polish (latency-first)
 *  - standard: draft + heuristic polish; refine if score is poor
 *  - high:     draft + always attempt refine when issues found
 */

import {
  FREE_TIER_FALLBACK_CHAIN,
  GROQ_FALLBACK_MODEL,
  invokeLLM,
} from "../_core/llm";

export type QualityMode = "fast" | "standard" | "high";

export type ResponseConfidence = "high" | "medium" | "low";

export type StructuredAnswer = {
  answer: string;
  confidence: ResponseConfidence;
  keyFacts: string[];
  nextActions: string[];
  caveats: string[];
};

export type QualityReport = {
  score: number; // 0-100
  issues: string[];
  strengths: string[];
};

export type ImproveResult = {
  content: string;
  improved: boolean;
  quality: QualityReport;
  mode: QualityMode;
};

// ── Shared directive layer (appended to domain prompts) ─────────────────────

/**
 * High-signal response contract injected into system prompts.
 * Short on purpose — every token competes with tool results and history.
 */
export const RESPONSE_QUALITY_CONTRACT = `
Response quality contract (always follow):
1. Lead with the direct answer in the first 1-2 sentences — no preamble.
2. Prefer specific numbers, names, times, and tool results over generic advice.
3. If you used tools or data, cite the figure explicitly (e.g. "$412 this week").
4. End with 1-3 concrete next actions the user can take now when advice is given.
5. If data is missing or uncertain, say so in one plain sentence — never invent.
6. Skip filler ("Certainly!", "Great question!", "As an AI…", "I hope this helps").
7. Keep replies tight: default to short paragraphs or bullets, not essays.
`.trim();

export const CRITIQUE_RUBRIC = `
Score the assistant draft against this rubric (be harsh on vagueness):
- Specificity: uses real numbers, names, or tool data when available
- Actionability: user knows exactly what to do next
- Structure: answer first, then support, then actions
- Honesty: no fabricated stats; uncertainty is labeled
- Brevity: no fluff, no repeated points, no boilerplate openings
`.trim();

// ── Heuristic quality scoring (zero model cost) ─────────────────────────────

const FILLER_OPENERS = [
  /^certainly[!,]?\s+/i,
  /^of course[!,]?\s+/i,
  /^great question[!,]?\s+/i,
  /^absolutely[!,]?\s+/i,
  /^sure[!,]?\s+/i,
  /^as an ai[, ]+/i,
  /^i('m| am) happy to help[!,]?\s+/i,
  /^i hope this helps[!.,]?\s*/i,
];

const VAGUE_PHRASES = [
  /it depends/i,
  /there are many factors/i,
  /in today's (world|market)/i,
  /as we all know/i,
  /generally speaking/i,
  /various ways/i,
  /a number of things/i,
];

export function scoreResponseHeuristics(
  text: string,
  opts?: { userMessage?: string; expectNumbers?: boolean }
): QualityReport {
  const issues: string[] = [];
  const strengths: string[] = [];
  const trimmed = (text ?? "").trim();
  let score = 70;

  if (!trimmed) {
    return { score: 0, issues: ["empty_response"], strengths: [] };
  }

  if (trimmed.length < 40) {
    score -= 15;
    issues.push("too_short");
  } else if (trimmed.length > 2800) {
    score -= 10;
    issues.push("too_long");
  } else if (trimmed.length >= 80 && trimmed.length <= 1200) {
    strengths.push("good_length");
  }

  for (const re of FILLER_OPENERS) {
    if (re.test(trimmed)) {
      score -= 12;
      issues.push("filler_opener");
      break;
    }
  }

  let vagueHits = 0;
  for (const re of VAGUE_PHRASES) {
    if (re.test(trimmed)) vagueHits++;
  }
  if (vagueHits >= 2) {
    score -= 15;
    issues.push("vague_language");
  } else if (vagueHits === 1) {
    score -= 6;
    issues.push("mild_vagueness");
  }

  const hasNumber = /\d/.test(trimmed);
  if (hasNumber) strengths.push("has_numbers");
  else if (opts?.expectNumbers) {
    score -= 10;
    issues.push("missing_numbers");
  }

  const hasActionCue =
    /\b(next|try|do this|start|check|open|set|run|tap|go to|recommend)\b/i.test(
      trimmed
    ) || /^[-*•]\s+/m.test(trimmed);
  if (hasActionCue) strengths.push("actionable_cues");
  else if ((opts?.userMessage ?? "").match(/\b(how|what should|help me)\b/i)) {
    score -= 8;
    issues.push("weak_actions");
  }

  // Soft reward for structured bullets
  if ((trimmed.match(/^\s*[-*•\d]/gm) ?? []).length >= 2) {
    strengths.push("structured_list");
    score += 4;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    strengths,
  };
}

/** Strip known low-value openers / closers without changing substance. */
export function polishResponse(text: string): string {
  let out = (text ?? "").trim();
  for (const re of FILLER_OPENERS) {
    out = out.replace(re, "");
  }
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  // Drop trailing "I hope this helps!" style lines
  out = out.replace(/\n*(I hope (this|that) helps[!.,]?\s*)+$/i, "").trim();
  return out;
}

export function shouldRefine(
  mode: QualityMode,
  quality: QualityReport
): boolean {
  if (mode === "fast") return false;
  if (mode === "high") return quality.score < 88 || quality.issues.length > 0;
  // standard
  return quality.score < 72 || quality.issues.includes("filler_opener");
}

export function resolveQualityMode(
  raw?: string | null,
  opts?: { premiumModel?: boolean }
): QualityMode {
  if (raw === "fast" || raw === "standard" || raw === "high") return raw;
  // Premium models default to high; free tier to standard.
  return opts?.premiumModel ? "high" : "standard";
}

// ── Critique + refine (one extra free-tier LLM call when needed) ────────────

export async function refineResponse(opts: {
  draft: string;
  userMessage: string;
  contextLabel?: string;
  issues: string[];
}): Promise<string | null> {
  const issueList =
    opts.issues.length > 0 ? opts.issues.join(", ") : "general_quality";
  const prompt = `You are a response editor for Kai (UnifyOne gig-ops assistant).
Rewrite the draft so it fully satisfies the quality contract. Keep facts. Do not invent data.

${RESPONSE_QUALITY_CONTRACT}

${CRITIQUE_RUBRIC}

Known issues with the draft: ${issueList}
Context: ${opts.contextLabel ?? "general"}

User message:
${opts.userMessage.slice(0, 1500)}

Draft:
${opts.draft.slice(0, 4000)}

Return ONLY the improved reply text — no JSON, no preamble, no "here's the rewrite".`;

  try {
    const result = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      model: `groq/${GROQ_FALLBACK_MODEL}`,
      modelChain: [...FREE_TIER_FALLBACK_CHAIN],
      maxTokens: 900,
    });
    const text = (result.choices[0]?.message.content ?? "").toString().trim();
    if (!text || text.length < 20) return null;
    return polishResponse(text);
  } catch (err) {
    console.warn("[aiResponseFramework] refine failed:", err);
    return null;
  }
}

/**
 * Full improve pipeline: polish → score → optional refine → re-score.
 */
export async function improveResponse(opts: {
  draft: string;
  userMessage: string;
  mode?: QualityMode;
  contextLabel?: string;
  expectNumbers?: boolean;
}): Promise<ImproveResult> {
  const mode = opts.mode ?? "standard";
  const polished = polishResponse(opts.draft);
  let quality = scoreResponseHeuristics(polished, {
    userMessage: opts.userMessage,
    expectNumbers: opts.expectNumbers,
  });

  if (!shouldRefine(mode, quality)) {
    return { content: polished, improved: polished !== opts.draft, quality, mode };
  }

  const refined = await refineResponse({
    draft: polished,
    userMessage: opts.userMessage,
    contextLabel: opts.contextLabel,
    issues: quality.issues,
  });

  if (!refined) {
    return { content: polished, improved: polished !== opts.draft, quality, mode };
  }

  quality = scoreResponseHeuristics(refined, {
    userMessage: opts.userMessage,
    expectNumbers: opts.expectNumbers,
  });

  return { content: refined, improved: true, quality, mode };
}

/**
 * Compose a system prompt with the quality contract appended once.
 */
export function withQualityContract(systemPrompt: string): string {
  if (systemPrompt.includes("Response quality contract")) return systemPrompt;
  return `${systemPrompt.trim()}\n\n${RESPONSE_QUALITY_CONTRACT}`;
}

/**
 * Best-effort parse of a structured answer from free-form model output.
 * Used when callers ask for JSON-ish structure without hard schema fails.
 */
export function tryParseStructuredAnswer(text: string): StructuredAnswer | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<StructuredAnswer>;
    if (typeof parsed.answer !== "string" || !parsed.answer.trim()) return null;
    return {
      answer: parsed.answer.trim(),
      confidence:
        parsed.confidence === "high" ||
        parsed.confidence === "medium" ||
        parsed.confidence === "low"
          ? parsed.confidence
          : "medium",
      keyFacts: Array.isArray(parsed.keyFacts)
        ? parsed.keyFacts.filter((x): x is string => typeof x === "string")
        : [],
      nextActions: Array.isArray(parsed.nextActions)
        ? parsed.nextActions.filter((x): x is string => typeof x === "string")
        : [],
      caveats: Array.isArray(parsed.caveats)
        ? parsed.caveats.filter((x): x is string => typeof x === "string")
        : [],
    };
  } catch {
    return null;
  }
}

export function formatStructuredAnswer(s: StructuredAnswer): string {
  const parts: string[] = [s.answer.trim()];
  if (s.keyFacts.length > 0) {
    parts.push("", "**Key facts**", ...s.keyFacts.map(f => `• ${f}`));
  }
  if (s.nextActions.length > 0) {
    parts.push("", "**Next actions**", ...s.nextActions.map(a => `• ${a}`));
  }
  if (s.caveats.length > 0) {
    parts.push("", "**Caveats**", ...s.caveats.map(c => `• ${c}`));
  }
  return parts.join("\n");
}
