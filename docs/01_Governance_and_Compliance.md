# Governance & Compliance Canon

**Version:** 2.0
**Last Updated:** 2026-04-04
**Authority:** CEO + Compliance Officer
**Review Cycle:** Quarterly

---

## Governance Charter

### Principles

1. **Human Sovereignty** -- All autonomous systems have kill-switches and escalation paths to human authority. No AI system may operate without a defined human override.
2. **Transparency** -- Every decision, constraint, and policy change is logged, versioned, and auditable. No shadow operations.
3. **Reversibility** -- All systems are designed to be rolled back without data loss or customer impact. Every mutation has an undo path.
4. **Governance as Code** -- Constraints are executable rules stored in the `governanceRules` database table, not suggestions in documents.
5. **Tenant Isolation** -- Governance enforcement is per-tenant. Each tenant's data, rules, and escalation paths are logically isolated.

### Decision Authority Matrix

| Decision Type | Authority | Escalation | Audit Log | Threshold |
|---------------|-----------|-----------|-----------|-----------|
| Customer pricing changes | Finance Lead | CEO | Required | Any change |
| Architecture decisions | Technical Lead | CEO | Required | Any change |
| Data privacy policy | Compliance Officer | CEO | Required | Any change |
| Autonomous AI actions | Technical Lead | CEO | Required | See escalation matrix |
| Customer contracts | Finance Lead | CEO | Required | >$1,000 |
| Infrastructure changes | Technical Lead | CEO | Required | Production changes |
| Payment processing | Automated | Architect/Cathedral | Required | >$10K/$50K |
| Refund issuance | Automated | Architect/Cathedral | Required | >$5K/$20K |
| Data deletion | Architect | Cathedral | Required | >100 sensitive / >1K bulk |
| Subscription changes | Automated | Architect | Required | >100 affected customers |

---

## Governance-as-Code Schema

All governance rules are stored in the `governanceRules` database table (defined in `drizzle/schema.ts`):

```sql
CREATE TABLE governanceRules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenantId INT,
  ruleName VARCHAR(255) NOT NULL,
  description TEXT,
  entityType VARCHAR(100) NOT NULL,
  -- 'payment_processing', 'refund_issuance', 'customer_acquisition',
  -- 'data_deletion', 'pricing_adjustment', 'inventory_adjustment',
  -- 'subscription_change', 'ai_generated_content'
  conditionJson JSON NOT NULL,
  -- Executable condition: { threshold: 10000, unit: "USD", operator: ">" }
  actionOnViolation VARCHAR(50) NOT NULL DEFAULT 'escalate',
  -- 'escalate', 'block', 'warn', 'log'
  severity ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);
```

### Rule Enforcement Flow

The `claudeGovernanceRouter` (in `server/routers/claudeGovernance.ts`) enforces governance rules using a two-stage process:

1. **Rule-Based Evaluation** -- Load applicable rules from `governanceRules` where `entityType` matches the action type and `isActive = true`. Check each rule's `conditionJson` against the proposed action.
2. **AI-Augmented Reasoning** -- If rules are ambiguous or the action is complex, invoke the LLM to evaluate the action against all applicable rules and provide a structured decision (`ALLOWED`, `ESCALATED`, or `BLOCKED`).
3. **Fallback** -- If the LLM is unavailable, the system falls back to pure rule-based evaluation via `evaluateRulesBased()`.

```typescript
// Simplified enforcement flow (server/routers/claudeGovernance.ts)
const rules = await db.select().from(governanceRules)
  .where(and(
    eq(governanceRules.isActive, true),
    eq(governanceRules.entityType, input.actionType)
  ));

// AI evaluates rules + context -> { allowed, requiresEscalation, riskLevel, violations }
const decision = await invokeLLM({ messages: [systemPrompt, userPrompt] });

// Create audit log + escalation queue entry if needed
await db.insert(auditLogs).values({ ... });
if (decision.requiresEscalation) {
  await db.insert(escalationQueue).values({ ... });
}
```

### Critical Rules (Non-Negotiable)

#### Data Privacy (GDPR + CCPA)

```json
{
  "ruleName": "No customer PII in logs",
  "entityType": "data_deletion",
  "conditionJson": { "type": "pii_detection", "fields": ["email", "phone", "ssn", "payment_method"] },
  "actionOnViolation": "block",
  "severity": "critical"
}
```

All PII is hashed using SHA-256 before storage in audit logs and Meta CAPI event payloads (see `server/meta/capi.ts` `sha256()` helper). Email, phone, first name, and last name are hashed before transmission to Meta.

#### Financial Compliance

```json
{
  "ruleName": "Transaction reversal window",
  "entityType": "refund_issuance",
  "conditionJson": { "reversalWindowHours": 24, "maxAutoRefund": 5000 },
  "actionOnViolation": "escalate",
  "severity": "critical"
}
```

Refunds under $5,000 can be processed automatically. Refunds over $5,000 require Architect-level approval. Bulk refunds over $20,000 require Cathedral-level (CEO) approval.

#### PCI-DSS Compliance

UnifyOne never stores raw payment card data. All payment processing is delegated to:
- **Stripe** -- Primary payment processor. Card data is tokenized via `@stripe/stripe-js` client-side. Server receives only `stripePaymentIntentId` and `stripeSessionId`.
- **PayPal** -- Secondary processor via `@paypal/paypal-server-sdk`. Order IDs reference PayPal-hosted data.
- **Square** -- Tertiary processor. Access tokens and location IDs stored; raw card data handled by Square.

The `orders` table stores only processor-specific reference IDs (`stripePaymentIntentId`, `paypalOrderId`, `squarePaymentId`), never raw card numbers or CVVs.

#### Autonomous AI Safety

```json
{
  "ruleName": "AI decision threshold",
  "entityType": "ai_generated_content",
  "conditionJson": { "maxBatchSize": 1000, "requiresHumanReview": true },
  "actionOnViolation": "escalate",
  "severity": "high"
}
```

---

## 3-Tier Escalation Logic

### Tier 1: Automated (Operator Level)

**Trigger:** Routine operations within defined thresholds.
**Action:** Execute immediately, log to `auditLogs` table.
**Resolution Time:** Immediate (0 seconds).

Handled automatically by tRPC procedures:
- Payment processing under $10,000
- Email drip campaigns (via `dripScheduler.ts`)
- Notification dispatch (via `notification.ts`)
- Product/inventory updates within normal ranges
- Shopify sync operations (products, orders, customers)
- Social media post publishing
- Reward credit claims

### Tier 2: Admin Review (Architect Level)

**Trigger:** Operations exceeding operational thresholds.
**Action:** Create entry in `escalationQueue`, notify Technical Lead or Finance Lead.
**Resolution Time:** Target <4 hours.

Requires human approval:
- Refunds over $5,000
- Pricing adjustments over 25%
- Bulk data deletion (>1,000 records)
- Inventory adjustments over 10,000 units
- Mass subscription changes (>100 customers)
- AI content batches over 1,000 items
- Customer acquisition spend over $100,000

### Tier 3: Owner Escalation (Cathedral Level)

**Trigger:** High-impact, irreversible, or strategic decisions.
**Action:** Create escalation, notify CEO directly, block action until approved.
**Resolution Time:** Target <24 hours.

Requires CEO approval:
- Payments over $50,000
- Bulk refunds over $20,000
- Deletion of sensitive data (>100 records)
- Pricing adjustments over 50%
- Any governance rule changes
- Kill-switch activation
- Public statements or brand-impacting decisions

### Escalation Flow (from `escalationTriggers.ts`)

```
Operation Initiated
    |
    v
[Evaluate Escalation Triggers]
    |
    +-- No triggers hit --> Execute + Audit Log
    |
    +-- Trigger hit -->
        |
        v
    [Determine Authority Level]
        |
        +-- Operator --> Execute + Audit Log
        +-- Architect --> Escalation Queue + Notify Technical/Finance Lead
        +-- Cathedral --> Escalation Queue + Notify CEO + Block Until Approved
```

### Escalation Queue Schema

```sql
CREATE TABLE escalation_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  auditLogId INT NOT NULL,
  decisionType VARCHAR(100) NOT NULL,
  decisionContext JSON,
  thresholdExceeded VARCHAR(100),
  authorityLevel VARCHAR(50) NOT NULL, -- 'operator', 'architect', 'cathedral'
  status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending',
  resolvedBy INT,
  resolvedAt TIMESTAMP,
  resolutionNotes TEXT,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### Escalation Expiry

Unresolved escalations are automatically expired by `autoResolveExpiredEscalations()` in `server/_core/escalationTriggers.ts`. Default expiry windows:
- **Critical urgency:** 1 hour
- **Standard:** 12 hours

Expired escalations are marked as `expired` with resolution notes `"Auto-resolved: Escalation window expired"`.

---

## Regulatory Posture

### Compliance Status

| Regulation | Status | Implementation | Review Date |
|-----------|--------|----------------|------------|
| **GDPR** | Compliant | PII hashing (SHA-256), data export, deletion on request | Quarterly |
| **CCPA** | Compliant | Opt-out mechanisms, data portability, no-sell policy | Quarterly |
| **PCI-DSS** | Compliant (delegated) | Stripe/PayPal/Square handle all card data; no local storage | Ongoing |
| **SOC 2 Type II** | In progress | Audit trail infrastructure complete; formal audit pending | 2026-Q3 |
| **OMB M-25-21/22** | Compliant | Zero-trust API auth, TLS 1.3+, AES-256 at rest | Quarterly |

### GDPR-Specific Controls

1. **Data Minimization** -- Only collect data necessary for commerce operations. No behavioral tracking beyond analytics events.
2. **Right to Erasure** -- `data_deletion` action type in governance rules. Bulk deletion requires Architect approval (>1K records) or Cathedral approval (>100 sensitive records).
3. **Data Portability** -- Tenant data exportable via tRPC procedures. All data stored in structured PostgreSQL tables with Drizzle ORM.
4. **Consent Management** -- Cookie consent for Meta Pixel (`_fbp`, `_fbc` cookies). CAPI events include user consent status.
5. **Privacy by Design** -- PII is SHA-256 hashed before transmission to Meta CAPI. Logs exclude raw PII.

### PCI-DSS Awareness

UnifyOne maintains PCI compliance through **SAQ A** (Self-Assessment Questionnaire A) by:
- Never transmitting, processing, or storing cardholder data on our servers
- Using Stripe.js / PayPal SDK for client-side tokenization
- Storing only payment processor reference IDs in the `orders` table
- Enforcing HTTPS (TLS 1.3+) on all endpoints via Netlify edge
- Security headers: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`

---

## Data Handling Policies

### Data Classification

| Classification | Examples | Storage | Access | Retention |
|---------------|----------|---------|--------|-----------|
| **Public** | Product names, prices, theme listings | PostgreSQL (Neon) | All users | Indefinite |
| **Internal** | Analytics events, audit logs, workflow configs | PostgreSQL (Neon) | Tenant admins | 3 years |
| **Confidential** | Customer emails, addresses, order details | PostgreSQL (Neon) | Tenant admins + system | 7 years |
| **Restricted** | Payment tokens, OAuth access tokens, API keys | PostgreSQL (encrypted) | System only | Until revoked |

### Data Isolation

All tables with tenant-scoped data include a `tenantId` column. Every query that touches tenant data must include a `WHERE tenantId = ?` clause. This is enforced at the tRPC context level -- the `ctx.tenant` object is always available on protected procedures.

Tables without `tenantId` (platform-level):
- `users` (have `tenantId` but also exist before tenant creation)
- `plans` (global subscription plans)
- `announcements` (admin broadcasts)

### Encryption

- **In Transit:** TLS 1.3+ enforced by Netlify edge network. HSTS preload enabled.
- **At Rest:** AES-256 encryption via Supabase/PlanetScale managed database encryption.
- **PII Hashing:** SHA-256 for all PII sent to external services (Meta CAPI, analytics).
- **Token Storage:** Shopify access tokens, Square tokens, and OAuth secrets stored as encrypted text in PostgreSQL.

---

## Audit Trail Requirements

### Audit Log Schema

All systems must log to the immutable `auditLogs` table:

```sql
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  tenantId INT,
  action VARCHAR(255) NOT NULL,
  entityType VARCHAR(100),
  entityId INT,
  oldValue JSON,
  newValue JSON,
  decisionAuthority VARCHAR(50), -- 'operator', 'architect', 'cathedral'
  escalationTriggered BOOLEAN DEFAULT false,
  escalationReason TEXT,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### What Must Be Logged

| Event Category | Specific Events | Required Fields |
|---------------|-----------------|-----------------|
| **Authentication** | Login, logout, OAuth callback | userId, ipAddress, userAgent |
| **Data Mutations** | Create, update, delete on any entity | entityType, entityId, oldValue, newValue |
| **Payment Events** | Charges, refunds, subscription changes | amount, status, processorId |
| **Governance** | Rule evaluation, escalation creation, resolution | decisionAuthority, escalationTriggered |
| **AI Decisions** | Claude governance evaluation, Manus AI queries | action context, decision output |
| **Integration Events** | Shopify sync, Meta CAPI relay, n8n triggers | source, status, latencyMs |
| **Admin Actions** | Announcement creation, team invites, role changes | adminId, affected entities |

### Audit Log Immutability

Audit logs are append-only. The `auditLogs` table has no `UPDATE` or `DELETE` operations exposed through any tRPC procedure. Historical audit data is retained for a minimum of 3 years.

---

## Kill-Switch Mechanisms

### Automatic Kill-Switches

| Trigger | Action | Recovery |
|---------|--------|----------|
| Unencrypted data detected in transit | Halt affected endpoint, escalate to Technical Lead | Manual verification + re-encryption |
| PII detected in application logs | Purge affected log entries, escalate to Compliance Officer | Manual audit of data retention |
| Unauthorized API access attempt | Block requesting IP, escalate to Security | Manual review + credential rotation |
| Customer refund SLA missed (>5 business days) | Escalate to Finance Lead | Manual refund processing + root cause analysis |
| Cross-tenant data leak detected | Halt all data access, escalate to CEO | Full security audit, customer notification |
| Shopify API quota exhaustion (>90%) | Throttle sync operations, alert Technical Lead | Wait for quota reset or optimize queries |

### Manual Kill-Switches

- **CEO Kill-Switch:** Pause all autonomous AI decisions (governance dashboard)
- **Finance Kill-Switch:** Pause all payment processing
- **Security Kill-Switch:** Pause all API access
- **Integration Kill-Switch:** Pause all external API calls (Stripe, PayPal, Shopify, Meta CAPI)

---

## Policy Changes & Versioning

All governance changes follow this process:

1. **Proposal** -- Authority proposes change with rationale
2. **Review** -- Other authorities review for conflicts (48-hour window)
3. **Approval** -- CEO approves or requests changes
4. **Implementation** -- Change is versioned in `governanceRules` table and deployed
5. **Audit** -- Compliance Officer verifies implementation via audit log review
6. **Notification** -- All stakeholders are notified of change

### Change Log

| Version | Date | Change | Authority | Rationale |
|---------|------|--------|-----------|-----------|
| 1.0 | 2025-03-06 | Initial governance charter | CEO | Foundation for autonomous operations |
| 2.0 | 2026-04-04 | Added 3-tier escalation, PCI-DSS, GDPR controls, data classification | CEO + Compliance | Comprehensive compliance framework |

---

## Next Steps

1. Complete SOC 2 Type II audit preparation (Q3 2026)
2. Implement automated PII scanning on all log outputs
3. Build governance dashboard real-time monitoring with WebSocket alerts
4. Add GDPR data export API endpoint for tenant self-service
5. Quarterly governance review (next: 2026-07-04)
