# UnifyOne Governance System — Complete Implementation Guide

**Version:** 1.0  
**Date:** March 10, 2026  
**Status:** Ready for Production Deployment

---

## Overview

The UnifyOne Governance System (Phases 40-44) implements a **Cathedral Framework-based autonomous operations control system** with Claude AI integration. It provides:

- **Autonomous Decision Evaluation** — Claude analyzes proposed actions against governance rules
- **Escalation Management** — Automatic escalation for rule violations and threshold exceedances
- **Decision Authority Matrix** — Role-based approval hierarchy (operator → architect → cathedral)
- **Kill Switches** — Emergency operational controls for critical systems
- **Audit Trail** — Complete operation history for compliance
- **Governance Dashboard** — Real-time monitoring and administration interface

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Governance Dashboard (client/src/pages/...)         │  │
│  │  - Audit Log Viewer                                  │  │
│  │  - Escalation Queue Manager                          │  │
│  │  - Decision Authority Matrix                         │  │
│  │  - Governance Rules Viewer                           │  │
│  │  - Emergency Controls (Kill Switches)                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓ tRPC
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  tRPC Routers (server/routers/)                      │  │
│  │                                                      │  │
│  │  governance.ts                                       │  │
│  │  - getAuditLogs()                                    │  │
│  │  - getEscalations()                                  │  │
│  │  - resolveEscalation()                               │  │
│  │  - getKillSwitches()                                 │  │
│  │  - toggleKillSwitch()                                │  │
│  │  - getRules()                                        │  │
│  │  - getMetrics()                                      │  │
│  │  - getDecisionAuthority()                            │  │
│  │                                                      │  │
│  │  claudeGovernance.ts                                 │  │
│  │  - evaluateAutonomousAction()                        │  │
│  │  - getEscalationReasoning()                          │  │
│  │  - requestAlternativeAnalysis()                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Core Services (server/_core/)                       │  │
│  │                                                      │  │
│  │  escalationTriggers.ts                               │  │
│  │  - evaluateEscalationTriggers()                       │  │
│  │  - createEscalation()                                │  │
│  │  - autoResolveExpiredEscalations()                    │  │
│  │  - getEscalationStats()                              │  │
│  │                                                      │  │
│  │  llm.ts (existing)                                   │  │
│  │  - invokeLLM() — Claude integration                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database (MySQL)                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Governance Tables (Drizzle Schema)                  │  │
│  │                                                      │  │
│  │  audit_logs                                          │  │
│  │  escalation_queue                                    │  │
│  │  decision_authority                                  │  │
│  │  kill_switches                                       │  │
│  │  governance_rules                                    │  │
│  │  governance_metrics                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Escalation Workflow

```
1. Autonomous Operation Proposed
   └─ Example: Payment of $15,000

2. Claude Evaluation
   ├─ Fetch applicable governance rules
   ├─ Send to Claude with structured prompt
   ├─ Claude analyzes against rules
   └─ Returns: decision, violations, reasoning, recommendedAuthority

3. Rule Violation Detection
   ├─ Check: $15,000 > $10,000 threshold ✓
   ├─ Violation: "Payment exceeds architect threshold"
   └─ Escalation Required: YES

4. Escalation Creation
   ├─ Insert into escalation_queue
   ├─ Store Claude reasoning and violations
   ├─ Set expiration: 12 hours
   └─ Status: pending

5. Audit Logging
   ├─ Insert into audit_logs
   ├─ Record: action, authority, escalation trigger
   └─ Timestamp: NOW()

6. Admin Notification
   ├─ Governance Dashboard shows pending escalation
   ├─ Display: Claude reasoning, violations, context
   └─ Action buttons: Approve / Reject

7. Admin Decision
   ├─ Admin reviews Claude reasoning
   ├─ Optionally requests alternative analysis
   └─ Clicks: Approve or Reject

8. Resolution
   ├─ Update escalation_queue: status = approved/rejected
   ├─ Insert resolution_notes
   ├─ Update audit_logs with decision
   └─ Timestamp: resolved_at = NOW()

9. Auto-Expiration (if not resolved in 12 hours)
   ├─ Cron job runs hourly
   ├─ Finds: status = pending AND expires_at < NOW()
   ├─ Updates: status = expired
   └─ Reason: "Escalation window expired"

10. Metrics Computation
    ├─ Cron job runs every 6 hours
    ├─ Computes: compliance_score, avg_resolution_time
    ├─ Updates: governance_metrics table
    └─ Displayed in: Dashboard metrics
```

---

## Database Schema

### Table: audit_logs
Stores all governance operations for compliance auditing.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| user_id | INT | User performing action |
| action | VARCHAR(255) | Action description |
| entity_type | VARCHAR(100) | Type of entity (payment, refund, etc.) |
| entity_id | INT | ID of affected entity |
| old_value | JSON | Previous value |
| new_value | JSON | New value |
| decision_authority | VARCHAR(100) | Authority level (operator, architect, cathedral) |
| escalation_triggered | BOOLEAN | Whether escalation was created |
| escalation_reason | TEXT | Reason for escalation |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

### Table: escalation_queue
Stores pending decisions requiring human approval.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| audit_log_id | INT | Reference to audit log |
| decision_type | VARCHAR(100) | Type of decision |
| decision_context | JSON | Full context for decision |
| threshold_exceeded | DECIMAL(15,2) | Amount/count that exceeded threshold |
| threshold_limit | DECIMAL(15,2) | Threshold limit |
| authority_level | VARCHAR(50) | Required authority level |
| status | ENUM | pending, approved, rejected, expired |
| resolution_notes | TEXT | Admin's decision notes |
| resolved_at | TIMESTAMP | When decision was made |
| expires_at | TIMESTAMP | When escalation expires |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

### Table: decision_authority
Stores user permission matrix for governance decisions.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| user_id | INT | User ID |
| authority_level | VARCHAR(50) | operator, architect, or cathedral |
| approval_threshold | DECIMAL(15,2) | Maximum amount can approve |
| can_access_audit_logs | BOOLEAN | Can view audit logs |
| can_override_decisions | BOOLEAN | Can override decisions |
| can_modify_governance | BOOLEAN | Can modify rules |
| active | BOOLEAN | Is this authority active |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

### Table: kill_switches
Emergency operational controls.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| switch_name | VARCHAR(100) | Unique switch identifier |
| description | TEXT | What this switch controls |
| impact_scope | TEXT | What systems are affected |
| is_active | BOOLEAN | Is switch currently active |
| reason | TEXT | Why switch was activated |
| activated_by | INT | User who activated it |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

### Table: governance_rules
Defines governance rules and thresholds.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| rule_name | VARCHAR(100) | Rule name |
| rule_type | ENUM | approval_threshold, rate_limit, data_access, operational_constraint |
| entity_type | VARCHAR(100) | What entity this rule applies to |
| condition_json | JSON | Rule condition (threshold, operator, etc.) |
| action_on_violation | ENUM | block, escalate, log, warn |
| authority_level_required | VARCHAR(50) | Minimum authority to override |
| is_active | BOOLEAN | Is rule currently active |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

### Table: governance_metrics
Computed metrics for dashboard display.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| compliance_score | INT | 0-100 compliance percentage |
| total_escalations | INT | Total escalations created |
| pending_escalations | INT | Currently pending |
| average_resolution_time_minutes | INT | Avg time to resolve |
| last_computed_at | TIMESTAMP | When metrics were last computed |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

---

## API Reference

### Governance Router

#### getAuditLogs()
Fetch audit log entries with optional filtering.

```typescript
trpc.governance.getAuditLogs.useQuery(undefined, {
  select: (data) => data.logs.filter(log => log.escalationTriggered)
});
```

**Response:**
```typescript
{
  logs: Array<{
    id: number;
    action: string;
    entityType: string;
    decisionAuthority: string;
    escalationTriggered: boolean;
    createdAt: Date;
  }>;
}
```

#### getEscalations()
Fetch escalations with status filtering.

```typescript
const escalations = trpc.governance.getEscalations.useQuery();
```

**Response:**
```typescript
Array<{
  id: number;
  decisionType: string;
  status: "pending" | "approved" | "rejected" | "expired";
  authorityLevel: string;
  thresholdExceeded: number;
  thresholdLimit: number;
  expiresAt: Date;
  resolutionNotes?: string;
}>
```

#### resolveEscalation()
Admin mutation to approve or reject an escalation.

```typescript
const resolve = trpc.governance.resolveEscalation.useMutation();

resolve.mutate({
  id: escalationId,
  status: "approved",
  resolutionNotes: "Approved by admin"
});
```

#### toggleKillSwitch()
Activate or deactivate a kill switch.

```typescript
const toggle = trpc.governance.toggleKillSwitch.useMutation();

toggle.mutate({
  switchName: "payment_processing_halt",
  isActive: true,
  reason: "Emergency activation due to security incident"
});
```

### Claude Governance Router

#### evaluateAutonomousAction()
Use Claude to evaluate a proposed autonomous action.

```typescript
const evaluate = trpc.claudeGovernance.evaluateAutonomousAction.useMutation();

evaluate.mutate({
  actionType: "payment_processing",
  description: "Process customer refund of $15,000",
  estimatedValue: 15000,
  urgency: "medium",
  context: {
    customerId: "cust_123",
    reason: "Product defect"
  }
});
```

**Response:**
```typescript
{
  decision: "ESCALATED" | "ALLOWED" | "BLOCKED";
  allowed: boolean;
  requiresEscalation: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  violations: string[];
  reasoning: string;
  recommendedAuthority: "operator" | "architect" | "cathedral";
  escalationId?: number;
}
```

#### getEscalationReasoning()
Retrieve Claude's reasoning for a specific escalation.

```typescript
const reasoning = trpc.claudeGovernance.getEscalationReasoning.useQuery({
  escalationId: 42
});
```

#### requestAlternativeAnalysis()
Ask Claude for alternative approaches to an escalated decision.

```typescript
const analysis = trpc.claudeGovernance.requestAlternativeAnalysis.useMutation();

analysis.mutate({
  escalationId: 42,
  question: "What are alternative approaches to process this refund?"
});
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All TypeScript checks pass (`pnpm check`)
- [ ] All unit tests pass (`pnpm test`)
- [ ] Code reviewed and approved
- [ ] Commits pushed to GitHub

### Deployment Steps
- [ ] Run database migration: `DATABASE_URL=<db> pnpm drizzle-kit push`
- [ ] Seed governance rules: `DATABASE_URL=<db> node scripts/seed-governance-rules.mjs`
- [ ] Verify Governance Dashboard loads
- [ ] Test escalation workflow
- [ ] Test kill switch functionality
- [ ] Deploy to Netlify (auto-deploys on push)

### Post-Deployment
- [ ] Monitor Governance Dashboard for data
- [ ] Check audit logs for operations
- [ ] Verify escalations are being created
- [ ] Test Claude integration
- [ ] Monitor error logs for issues

### Scheduled Tasks
- [ ] Set up hourly cron: `node scripts/resolve-expired-escalations.mjs`
- [ ] Set up 6-hourly cron: `node scripts/compute-governance-metrics.mjs`
- [ ] Set up daily backups of governance tables

---

## Troubleshooting

### Governance Dashboard Shows No Data

**Problem:** Dashboard loads but all queries return empty.

**Solution:**
1. Verify database migration completed: Check if governance tables exist
2. Verify seeding script ran: Check if rules were inserted
3. Check browser console for API errors
4. Check server logs for database connection errors

```bash
# Verify tables exist
mysql -u user -p database -e "SHOW TABLES LIKE '%governance%';"

# Verify data was seeded
mysql -u user -p database -e "SELECT COUNT(*) FROM governance_rules;"
```

### Escalations Not Being Created

**Problem:** Operations complete but no escalations appear in queue.

**Solution:**
1. Verify OPENAI_API_KEY is set
2. Check server logs for Claude API errors
3. Verify governance rules are active
4. Test Claude integration directly

```bash
# Check if rules are active
mysql -u user -p database -e "SELECT * FROM governance_rules WHERE is_active = 1;"

# Test Claude API
curl -X POST https://your-domain/api/trpc/claudeGovernance.evaluateAutonomousAction \
  -H "Content-Type: application/json" \
  -d '{"actionType":"payment_processing","description":"Test","estimatedValue":15000}'
```

### Kill Switches Not Working

**Problem:** Kill switch toggles but operations still proceed.

**Solution:**
1. Verify kill switch was toggled in database
2. Verify operational code checks kill switch status
3. Check server logs for toggle errors

```bash
# Verify kill switch status
mysql -u user -p database -e "SELECT * FROM kill_switches WHERE is_active = 1;"
```

### Compliance Score Dropping

**Problem:** Compliance score is below 90%.

**Solution:**
1. Check pending escalations count
2. Review escalations that haven't been resolved
3. Auto-resolve expired escalations manually if needed

```bash
# Check pending escalations
mysql -u user -p database -e "SELECT COUNT(*) FROM escalation_queue WHERE status = 'pending';"

# Manually resolve expired
mysql -u user -p database -e "UPDATE escalation_queue SET status = 'expired' WHERE expires_at < NOW() AND status = 'pending';"
```

---

## Support & Maintenance

### Monitoring
- Monitor Governance Dashboard metrics daily
- Review audit logs weekly for patterns
- Check escalation resolution times monthly
- Verify kill switches are inactive

### Maintenance
- Archive old audit logs quarterly (90+ days)
- Review and update governance rules quarterly
- Update decision authority as team changes
- Backup governance tables daily

### Updates
- Test governance rule changes in staging first
- Notify admins of new rules before deployment
- Document any custom escalation workflows
- Keep deployment instructions updated

---

**Status:** Ready for Production Deployment  
**Last Updated:** March 10, 2026  
**Version:** 1.0
