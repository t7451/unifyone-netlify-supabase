import {
  FREE_TIER_FALLBACK_CHAIN,
  GROQ_FALLBACK_MODEL,
  invokeLLM,
} from "../../_core/llm";

export type ClaudeDecision = {
  allowed: boolean;
  requiresEscalation: boolean;
  riskLevel: "low" | "medium" | "high" | string;
  violations: string[];
  reasoning: string;
  recommendedAuthority: string;
};

type GovernanceRule = {
  ruleName: string;
  conditionJson: Record<string, unknown>;
  actionOnViolation: string;
};

export type EvaluateInput = {
  actionType: string;
  description: string;
  affectedEntities?: Record<string, unknown>;
  estimatedValue?: number;
  urgency: "low" | "medium" | "high" | "critical";
  context?: Record<string, unknown>;
};

// ── Helper: build the Claude prompts for decision reasoning ────────────────────
export function buildSystemPrompt(
  rules: Array<{ ruleName: string; conditionJson: unknown }>
): string {
  return `You are an autonomous governance AI assistant for UnifyOne, a Cathedral Framework-based earnings and tax platform for gig and 1099 workers (with optional commerce tools). Your role is to evaluate proposed autonomous actions against governance rules and organizational policies.

You have access to the following governance rules:
${rules.map(r => `- ${r.ruleName}: ${JSON.stringify(r.conditionJson)}`).join("\n")}

For each proposed action, you must:
1. Analyze the action against applicable governance rules
2. Identify any rule violations or threshold exceedances
3. Assess the risk level (low, medium, high, critical)
4. Recommend whether to proceed, escalate, or block
5. Provide reasoning for your recommendation

Return a JSON response with: { allowed: boolean, requiresEscalation: boolean, riskLevel: string, violations: string[], reasoning: string, recommendedAuthority: string }`;
}

export function buildUserPrompt(input: EvaluateInput): string {
  return `Evaluate this autonomous action:

Action Type: ${input.actionType}
Description: ${input.description}
Estimated Value: ${input.estimatedValue ? `$${input.estimatedValue.toLocaleString()}` : "N/A"}
Urgency: ${input.urgency}
Affected Entities: ${input.affectedEntities ? JSON.stringify(input.affectedEntities, null, 2) : "None"}
Context: ${input.context ? JSON.stringify(input.context, null, 2) : "None"}

Based on the governance rules provided, determine if this action should be:
- ALLOWED: Proceed without escalation
- ESCALATED: Requires human approval before proceeding
- BLOCKED: Cannot proceed under any circumstances

Consider factors like:
- Financial thresholds
- Operational constraints
- Data access policies
- Rate limits
- Compliance requirements`;
}

/**
 * Invoke Claude for a governance decision, falling back to rule-based
 * evaluation if the LLM call fails. Returns the resolved decision object.
 */
export async function evaluateWithClaude(
  input: EvaluateInput,
  rules: GovernanceRule[]
): Promise<ClaudeDecision> {
  const systemPrompt = buildSystemPrompt(rules);
  const userPrompt = buildUserPrompt(input);

  let claudeDecision: ClaudeDecision = {
    allowed: true,
    requiresEscalation: false,
    riskLevel: "low",
    violations: [],
    reasoning: "No governance violations detected",
    recommendedAuthority: "operator",
  };

  try {
    const response = await invokeLLM({
    model: `groq/${GROQ_FALLBACK_MODEL}`,
    modelChain: [...FREE_TIER_FALLBACK_CHAIN],
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "governance_decision",
          schema: {
            type: "object",
            properties: {
              allowed: { type: "boolean" },
              requiresEscalation: { type: "boolean" },
              riskLevel: {
                type: "string",
                enum: ["low", "medium", "high", "critical"],
              },
              violations: { type: "array", items: { type: "string" } },
              reasoning: { type: "string" },
              recommendedAuthority: {
                type: "string",
                enum: ["operator", "architect", "cathedral"],
              },
            },
            required: [
              "allowed",
              "requiresEscalation",
              "riskLevel",
              "violations",
              "reasoning",
              "recommendedAuthority",
            ],
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (content && typeof content === "string") {
      claudeDecision = JSON.parse(content);
    }
  } catch (error) {
    console.error("[Claude Governance] LLM invocation failed:", error);
    // Fall back to rule-based evaluation
    claudeDecision = evaluateRulesBased(input, rules);
  }

  return claudeDecision;
}

/**
 * Request additional Claude analysis / alternative approaches for an
 * escalation that has been flagged for human review.
 */
export async function requestAlternativeAnalysis(
  context: Record<string, unknown>,
  question: string
) {
  const response = await invokeLLM({
    model: `groq/${GROQ_FALLBACK_MODEL}`,
    modelChain: [...FREE_TIER_FALLBACK_CHAIN],
    messages: [
      {
        role: "system",
        content: `You are an autonomous governance AI for UnifyOne. An escalation has been flagged for human review. Provide thoughtful analysis and alternative approaches.`,
      },
      {
        role: "user",
        content: `Original decision context: ${JSON.stringify(context, null, 2)}

User question: ${question}

Provide a detailed response considering:
1. The original governance reasoning
2. Alternative approaches to achieve the goal
3. Risk mitigation strategies
4. Compliance implications`,
      },
    ],
  });

  return (
    response.choices?.[0]?.message?.content ?? "Unable to generate analysis"
  );
}

// ── Helper: Rule-Based Fallback Evaluation ─────────────────────────────────────
export function evaluateRulesBased(
  input: {
    actionType: string;
    estimatedValue?: number;
    urgency: string;
    context?: Record<string, unknown>;
  },
  rules: Array<{
    ruleName: string;
    conditionJson: Record<string, unknown>;
    actionOnViolation: string;
  }>
): ClaudeDecision {
  const violations: string[] = [];
  let riskLevel = "low";
  let requiresEscalation = false;

  // ── Check financial thresholds ──────────────────────────────────────────────
  for (const rule of rules) {
    const condition = rule.conditionJson as Record<string, unknown>;
    const threshold = condition.threshold as number | undefined;

    if (threshold && input.estimatedValue && input.estimatedValue > threshold) {
      violations.push(
        `${rule.ruleName}: Amount $${input.estimatedValue} exceeds threshold $${threshold}`
      );
      if (
        rule.actionOnViolation === "escalate" ||
        rule.actionOnViolation === "block"
      ) {
        requiresEscalation = true;
        riskLevel = "high";
      }
    }
  }

  // ── Check urgency ──────────────────────────────────────────────────────────
  if (input.urgency === "critical") {
    riskLevel = "critical";
    requiresEscalation = true;
  } else if (input.urgency === "high") {
    riskLevel = "high";
  }

  return {
    allowed: violations.length === 0,
    requiresEscalation,
    riskLevel,
    violations,
    reasoning:
      violations.length > 0
        ? `Rule violations detected: ${violations.join("; ")}`
        : "No governance violations detected",
    recommendedAuthority:
      riskLevel === "critical"
        ? "cathedral"
        : riskLevel === "high"
          ? "architect"
          : "operator",
  };
}
