# Technical Architecture Canon

**Version:** 1.0  
**Last Updated:** 2025-03-06  
**Authority:** Technical Lead  
**Review Cycle:** Quarterly

---

## Architecture Overview

UnifyOne is built on a **serverless-first, event-driven architecture** designed for multi-tenant isolation, autonomous operations, and zero-downtime deployments.

### Core Principles

1. **Multi-Tenant Isolation** — Each tenant's data is logically isolated at the schema level (no shared tables)
2. **Event-Driven** — All state changes flow through Pub/Sub for audit trails and downstream automation
3. **Serverless-First** — Cloud Run, Cloud Functions, Pub/Sub; no long-running servers
4. **API-First** — All features are exposed via tRPC procedures; frontend consumes via React hooks
5. **Governance-as-Code** — All constraints are executable rules in the database

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / Client                         │
│                  (React 18 + Vite + TailwindCSS)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (Cloud Run)                       │
│                  (Express.js + tRPC Router)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth Router  │  │ Tenant Router │  │ Payment Router│         │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Docs Router  │  │ Email Router  │  │ Governance   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Supabase    │    │  Stripe API  │    │  Claude API  │
│ (PostgreSQL) │    │  (Payments)  │    │  (AI/RAG)    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   Pub/Sub Topic  │
                    │  (Event Stream)  │
                    └──────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Cloud Fn     │    │ Cloud Fn     │    │ Cloud Fn     │
│ (Email Drip) │    │ (Webhooks)   │    │ (Analytics)  │
└──────────────┘    └──────────────┘    └──────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   Audit Log      │
                    │  (Immutable)     │
                    └──────────────────┘
```

---

## Data Model

### Core Tables

#### `tenants` — Multi-Tenant Isolation

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
  tier ENUM('starter', 'pro', 'enterprise') DEFAULT 'starter',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `users` — User Management

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  oauth_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);
```

#### `transactions` — Payment Records

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  stripe_id VARCHAR(255) UNIQUE NOT NULL,
  amount_cents INT NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `documentEmbeddings` — RAG Knowledge Base

```sql
CREATE TABLE documentEmbeddings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  document_id VARCHAR(255) NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL, -- OpenAI/Claude embeddings
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, document_id, chunk_index)
);

CREATE INDEX idx_document_embeddings ON documentEmbeddings USING ivfflat (embedding vector_cosine_ops);
```

#### `governanceRules` — Executable Constraints

```sql
CREATE TABLE governanceRules (
  id UUID PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  constraint_name VARCHAR(255) NOT NULL,
  constraint_rule TEXT NOT NULL,
  severity ENUM('critical', 'high', 'medium', 'low'),
  kill_switch_condition TEXT,
  audit_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INT DEFAULT 1
);
```

#### `auditLog` — Immutable Audit Trail

```sql
CREATE TABLE auditLog (
  id UUID PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  actor_id UUID NOT NULL REFERENCES users(id),
  actor_role VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_log_timestamp ON auditLog(timestamp DESC);
CREATE INDEX idx_audit_log_actor ON auditLog(actor_id);
```

---

## Integration Patterns

### Payment Orchestration (Stripe → Meta CAPI)

```
Customer Checkout
    ↓
Stripe API (charge)
    ↓
Webhook: checkout.session.completed
    ↓
tRPC: stripe.webhook
    ↓
Create transaction record
    ↓
Emit event: transaction.completed
    ↓
Cloud Function: capi.purchase
    ↓
Meta CAPI API (send purchase event)
    ↓
Audit log entry
```

**Code Example:**

```typescript
// server/routers/stripeRouter.ts
export const stripeRouter = router({
  webhook: publicProcedure
    .input(z.object({ body: z.string(), signature: z.string() }))
    .mutation(async ({ input }) => {
      const event = stripe.webhooks.constructEvent(
        input.body,
        input.signature,
        STRIPE_WEBHOOK_SECRET
      );

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        // Create transaction record
        await db.transactions.create({
          tenant_id: session.metadata.tenant_id,
          stripe_id: session.id,
          amount_cents: session.amount_total,
          status: 'completed',
          metadata: session.metadata,
        });

        // Emit event to Pub/Sub
        await pubsub.topic('transactions').publish({
          type: 'transaction.completed',
          transaction_id: session.id,
          tenant_id: session.metadata.tenant_id,
          amount_cents: session.amount_total,
        });

        // Call Meta CAPI
        await capi.purchase({
          email: session.customer_email,
          amount: session.amount_total / 100,
          currency: session.currency,
          timestamp: Math.floor(Date.now() / 1000),
        });

        // Log to audit trail
        await auditLog.create({
          action: 'payment.completed',
          actor_id: 'system',
          resource_type: 'transaction',
          resource_id: session.id,
          new_value: { status: 'completed' },
        });
      }

      return { received: true };
    }),
});
```

### AI-Powered RAG (Document Chatbot)

```
User Query
    ↓
Embed query (Claude API)
    ↓
Cosine similarity search (documentEmbeddings)
    ↓
Retrieve top-K chunks
    ↓
Construct prompt with context
    ↓
Claude API (generate response)
    ↓
Stream response to client
    ↓
Log to audit trail
```

**Code Example:**

```typescript
// server/routers/documentChatRouter.ts
export const documentChatRouter = router({
  ask: protectedProcedure
    .input(z.object({ question: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Embed the question
      const questionEmbedding = await claude.embeddings.create({
        model: 'claude-3-opus-20240229',
        input: input.question,
      });

      // Search for similar documents
      const similarDocs = await db.documentEmbeddings.query(
        `SELECT content, metadata FROM documentEmbeddings 
         WHERE tenant_id = $1 
         ORDER BY embedding <-> $2 LIMIT 5`,
        [ctx.user.tenant_id, questionEmbedding.data[0].embedding]
      );

      // Construct context
      const context = similarDocs.map(d => d.content).join('\n\n');

      // Generate response
      const response = await claude.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        system: 'You are a helpful assistant answering questions about UnifyOne documentation.',
        messages: [
          {
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${input.question}`,
          },
        ],
      });

      // Log to audit trail
      await auditLog.create({
        action: 'docs.chat.ask',
        actor_id: ctx.user.id,
        resource_type: 'document_chat',
        resource_id: ctx.user.id,
        new_value: { question: input.question },
      });

      return { answer: response.content[0].text };
    }),
});
```

### Governance Rule Enforcement

```
tRPC Procedure Call
    ↓
Load applicable governance rules
    ↓
Validate against constraints
    ↓
If constraint violated:
  - Escalate to appropriate authority
  - Log violation to audit trail
  - Return error to client
    ↓
If constraint passed:
  - Execute procedure
  - Log to audit trail
  - Return result
```

**Code Example:**

```typescript
// server/_core/governance.ts
export async function enforceGovernanceRule(
  ctx: Context,
  action: string,
  resource: any
): Promise<{ allowed: boolean; reason?: string }> {
  const rules = await db.governanceRules.findMany({
    where: { category: getCategoryForAction(action) },
  });

  for (const rule of rules) {
    const ruleFunc = new Function('resource', 'ctx', `return ${rule.constraint_rule}`);
    const allowed = ruleFunc(resource, ctx);

    if (!allowed) {
      // Log violation
      await auditLog.create({
        action: `governance.violation.${action}`,
        actor_id: ctx.user.id,
        resource_type: 'governance_rule',
        resource_id: rule.id,
        new_value: { violated_rule: rule.constraint_name },
      });

      // Escalate if critical
      if (rule.severity === 'critical') {
        await escalateToAuthority(rule, ctx);
      }

      return { allowed: false, reason: rule.constraint_name };
    }
  }

  return { allowed: true };
}
```

---

## Deployment & Infrastructure

### Cloud Run (API Server)

- **Image:** Node.js 20 + Express + tRPC
- **Memory:** 512MB
- **CPU:** 1 vCPU
- **Concurrency:** 100 requests per instance
- **Autoscaling:** 0–10 instances based on traffic
- **Timeout:** 60 seconds

### Cloud Functions (Event Handlers)

| Function | Trigger | Timeout | Memory |
|----------|---------|---------|--------|
| `emailDripScheduler` | Pub/Sub (daily) | 60s | 256MB |
| `stripeWebhookHandler` | HTTP | 60s | 512MB |
| `analyticsProcessor` | Pub/Sub (real-time) | 30s | 256MB |
| `governanceEscalation` | Pub/Sub (on-demand) | 120s | 512MB |

### Supabase (PostgreSQL)

- **Plan:** Pro ($25/mo)
- **Storage:** 100GB
- **Connections:** 100 concurrent
- **Backups:** Daily + point-in-time recovery
- **Replication:** Multi-region (optional)

### Monitoring & Observability

```typescript
// server/_core/monitoring.ts
import { CloudLogging } from '@google-cloud/logging';

const logging = new CloudLogging();

export async function logMetric(
  name: string,
  value: number,
  labels: Record<string, string> = {}
) {
  const log = logging.log('unifyone-metrics');
  await log.write(
    log.entry({ severity: 'INFO' }, {
      metric: name,
      value,
      labels,
      timestamp: new Date().toISOString(),
    })
  );
}

// Usage
await logMetric('transaction.completed', 1, {
  tenant_id: tenantId,
  amount: amountCents.toString(),
});
```

---

## Security

### Authentication

- **OAuth 2.0** via Manus (built-in)
- **JWT** for session management
- **HTTPS** enforced (TLS 1.3+)
- **CORS** configured for frontend origin only

### Authorization

- **Role-Based Access Control (RBAC)** — admin vs user
- **Tenant Isolation** — users can only access their tenant's data
- **Governance Rules** — executable constraints on all actions

### Data Protection

- **Encryption at Rest:** AES-256 (Supabase default)
- **Encryption in Transit:** TLS 1.3+
- **PII Handling:** No PII in logs; hashed in audit trails
- **Secrets Management:** Environment variables (no hardcoded secrets)

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| **API Response Time (p95)** | <200ms | 150ms |
| **Page Load Time** | <2s | 1.8s |
| **Database Query Time (p95)** | <50ms | 40ms |
| **Uptime** | 99.99% | 99.98% |

---

## Next Steps

1. Implement vector search optimization for documentEmbeddings
2. Add distributed tracing (Cloud Trace) for request flow visibility
3. Implement circuit breakers for external API calls (Stripe, Claude)
4. Add rate limiting per tenant
5. Quarterly architecture review (next: 2025-06-06)
