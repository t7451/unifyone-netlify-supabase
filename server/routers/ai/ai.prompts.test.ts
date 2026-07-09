/**
 * ai.prompts — gig-first Kai persona
 *
 * Guards the gig-position changeover: the assembled system prompt for the
 * `general` context must frame Kai as the gig operator's copilot (earnings,
 * taxes) with commerce as an optional secondary, never as an unconditional
 * "commerce business" operator. Tool-usage instructions (oc_list_stores etc.)
 * must remain intact, and the existing gig context prompts must be unchanged.
 */

import { describe, it, expect } from "vitest";
import {
  CONTEXT_PROMPTS,
  KAI_BASE_DIRECTIVES,
  KAI_IN_SCOPE_GUIDANCE,
} from "./ai.prompts";

// Mirrors the assembly in ai.service.ts `chat` (no dataContext / mcpContext).
function assembleSystemPrompt(context: string): string {
  const baseSystemPrompt = CONTEXT_PROMPTS[context] ?? CONTEXT_PROMPTS.general;
  return [baseSystemPrompt, KAI_BASE_DIRECTIVES, KAI_IN_SCOPE_GUIDANCE]
    .filter(Boolean)
    .join("\n");
}

describe("Kai system prompt (gig-first positioning)", () => {
  it("frames the general context around the gig operation", () => {
    const prompt = assembleSystemPrompt("general");
    expect(prompt).toMatch(/gig/i);
    expect(prompt).toMatch(/earnings/i);
    expect(prompt).toMatch(/tax/i);
  });

  it("does not carry an unconditional 'commerce business' persona", () => {
    const prompt = assembleSystemPrompt("general");
    expect(prompt).not.toContain("commerce business");
    // The persona line itself must lead with the gig operation.
    expect(KAI_BASE_DIRECTIVES).toMatch(/copilot for the user's gig operation/);
  });

  it("treats storefront/commerce guidance as conditional, tools intact", () => {
    // Tool names and usage instructions survive the reframe.
    expect(KAI_BASE_DIRECTIVES).toContain("oc_list_stores");
    expect(KAI_BASE_DIRECTIVES).toContain("oc_create_product");
    expect(KAI_BASE_DIRECTIVES).toContain("oc_create_store");
    expect(KAI_BASE_DIRECTIVES).toContain("run_code");
    // Store guidance is scoped to users who work with the storefront.
    expect(KAI_BASE_DIRECTIVES).toMatch(
      /If the user works with their storefront\/commerce tools/
    );
    expect(KAI_BASE_DIRECTIVES).toMatch(
      /If the user asks to "build a store\/storefront"/
    );
  });

  it("keeps the dashboard prompt gig-first with commerce as secondary", () => {
    expect(CONTEXT_PROMPTS.dashboard).toMatch(/gig platforms/i);
    expect(CONTEXT_PROMPTS.dashboard).toMatch(/optional storefront/i);
    expect(CONTEXT_PROMPTS.dashboard).not.toMatch(
      /next actions for their store\b/
    );
  });

  it("keeps the in-scope refusal guidance product-neutral", () => {
    expect(KAI_IN_SCOPE_GUIDANCE).toContain(
      "earnings/tax/workflow/commerce questions"
    );
  });

  it("leaves the existing gig context prompts unchanged", () => {
    expect(CONTEXT_PROMPTS["money-manager"]).toContain(
      "gig economy financial hub"
    );
    expect(CONTEXT_PROMPTS["gig-command"]).toContain(
      "GPS-aware shift operations center"
    );
    expect(CONTEXT_PROMPTS.achievements).toContain("Gamification Hub");
    expect(CONTEXT_PROMPTS.friends).toContain("Social page");
  });
});
