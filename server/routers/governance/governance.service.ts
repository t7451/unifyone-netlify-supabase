// ── Governance use-cases (pure business logic) ─────────────────────────────────

/** Default kill switches returned when the DB is unavailable. */
export function defaultKillSwitches() {
  return [
    {
      id: 1,
      switchName: "autonomous_operations",
      description: "Pause all autonomous AI operations",
      isActive: false,
      triggeredBy: null,
      triggeredAt: null,
      reason: null,
      autoResetEnabled: false,
      autoResetAt: null,
      impactScope: "All AI-driven operations",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      switchName: "payment_processing",
      description: "Halt all payment processing",
      isActive: false,
      triggeredBy: null,
      triggeredAt: null,
      reason: null,
      autoResetEnabled: false,
      autoResetAt: null,
      impactScope: "Stripe, PayPal, Shopify payments",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      switchName: "new_customer_acquisition",
      description: "Pause new customer onboarding",
      isActive: false,
      triggeredBy: null,
      triggeredAt: null,
      reason: null,
      autoResetEnabled: false,
      autoResetAt: null,
      impactScope: "Registration, trial signups",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

/** Default governance rules returned when the DB is unavailable. */
export function defaultRules() {
  return [
    {
      id: 1,
      ruleName: "Revenue Threshold",
      ruleType: "approval_threshold" as const,
      entityType: "transaction",
      conditionJson: { threshold: 10000, currency: "USD" },
      actionOnViolation: "escalate" as const,
      authorityLevelRequired: "architect",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      ruleName: "Bulk Refund Limit",
      ruleType: "approval_threshold" as const,
      entityType: "order",
      conditionJson: { threshold: 5000, currency: "USD" },
      actionOnViolation: "escalate" as const,
      authorityLevelRequired: "architect",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      ruleName: "API Rate Limit",
      ruleType: "rate_limit" as const,
      entityType: "api",
      conditionJson: { maxCallsPerMinute: 1000 },
      actionOnViolation: "block" as const,
      authorityLevelRequired: "operator",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 4,
      ruleName: "Autonomous Decision Scope",
      ruleType: "operational_constraint" as const,
      entityType: "ai_agent",
      conditionJson: {
        maxAutonomousActions: 100,
        requireHumanApproval: ["delete", "bulk_update", "payment"],
      },
      actionOnViolation: "escalate" as const,
      authorityLevelRequired: "cathedral",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

/** Default decision authority returned when the DB is unavailable. */
export function defaultDecisionAuthority() {
  return [
    {
      id: 1,
      userId: 1,
      authorityLevel: "cathedral" as const,
      approvalThreshold: null,
      canOverrideDecisions: true,
      canModifyGovernance: true,
      canAccessAuditLogs: true,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

/** Default metrics returned when the DB is unavailable. */
export function defaultMetrics() {
  return {
    totalOperations: 0,
    escalationsTriggered: 0,
    escalationsApproved: 0,
    escalationsRejected: 0,
    killSwitchesActivated: 0,
    complianceScore: "100.00",
    averageEscalationTimeMinutes: 0,
  };
}

/** Compute live governance metrics from escalations + active kill switches. */
export function computeMetrics(
  escalations: Array<{ status: string }>,
  activeKillSwitches: Array<unknown>
) {
  const pending = escalations.filter(e => e.status === "pending").length;
  const approved = escalations.filter(e => e.status === "approved").length;
  const rejected = escalations.filter(e => e.status === "rejected").length;
  const totalOps = escalations.length + activeKillSwitches.length * 10;
  const complianceScore =
    totalOps === 0
      ? 100
      : Math.max(0, 100 - (rejected / Math.max(1, escalations.length)) * 100);
  return {
    totalOperations: escalations.length,
    escalationsTriggered: escalations.length,
    escalationsApproved: approved,
    escalationsRejected: rejected,
    escalationsPending: pending,
    killSwitchesActivated: activeKillSwitches.length,
    complianceScore: complianceScore.toFixed(2),
    averageEscalationTimeMinutes: 0,
  };
}

// ── Decision Evaluation ────────────────────────────────────────────────────────
export type DecisionViolation = {
  rule: string;
  action: string;
  reason: string;
};

/** Evaluate proposed action against active rules; returns violations + flags. */
export function evaluateDecisionRules(
  input: {
    action: string;
    value?: number;
  },
  rules: Array<{
    ruleName: string;
    ruleType: string;
    conditionJson: Record<string, unknown>;
    actionOnViolation: string;
  }>
) {
  const violations: DecisionViolation[] = [];
  for (const rule of rules) {
    const condition = rule.conditionJson as Record<string, unknown>;
    if (rule.ruleType === "approval_threshold" && input.value !== undefined) {
      const threshold = condition.threshold as number;
      if (input.value > threshold) {
        violations.push({
          rule: rule.ruleName,
          action: rule.actionOnViolation,
          reason: `Value $${input.value} exceeds threshold $${threshold}`,
        });
      }
    }
    if (rule.ruleType === "operational_constraint") {
      const requiresApproval = condition.requireHumanApproval as
        | string[]
        | undefined;
      if (
        requiresApproval?.some(op => input.action.toLowerCase().includes(op))
      ) {
        violations.push({
          rule: rule.ruleName,
          action: rule.actionOnViolation,
          reason: `Action "${input.action}" requires human approval per governance policy`,
        });
      }
    }
  }
  const shouldEscalate = violations.some(
    v => v.action === "escalate" || v.action === "block"
  );
  const shouldBlock = violations.some(v => v.action === "block");

  return { violations, shouldEscalate, shouldBlock };
}

export function decisionRecommendation(
  shouldBlock: boolean,
  shouldEscalate: boolean
): string {
  return shouldBlock
    ? "BLOCKED: This action violates governance rules and cannot proceed."
    : shouldEscalate
      ? "ESCALATED: This action requires approval before proceeding."
      : "APPROVED: This action is within governance parameters.";
}
