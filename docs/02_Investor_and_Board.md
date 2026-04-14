# Investor & Board Narrative

**Version:** 2.0
**Audience:** Institutional investors, venture partners, board members
**Last Updated:** 2026-04-04

---

## Executive Summary

**PNW Enterprises** is building the infrastructure layer for autonomous commerce. We combine three high-growth markets into a single platform: **multi-tenant commerce** (Shopify alternative), **gig economy tools** (earnings optimization, mileage tracking, shift management), and an **AI copilot** (context-aware assistant embedded in every workflow). This convergence is unique -- no existing platform spans all three.

We have proven the Cathedral Principle works: sequential construction of foundational systems before scaling traffic. The result is a platform with zero technical debt, full governance automation, and a defensible integration moat.

**What We Have Built:**
- Full-stack commerce platform: React + tRPC + PostgreSQL (Neon) + Netlify
- 25+ functional modules: Products, Orders, Payments (Stripe/PayPal/Square), Shopify sync, CRM, Social Media, Gamification, Theme Marketplace
- AI copilot (Manus AI) with per-page context awareness across 10+ surfaces
- Claude-powered governance engine with 3-tier escalation (automated -> admin -> owner)
- Meta Conversions API (CAPI) integration with server-side event deduplication
- n8n + Zapier + Mailchimp automation hub
- Gig economy suite: shift tracking, GPS routing, mileage deductions, multi-platform earnings
- Theme marketplace with reviews, ratings, and paid/free distribution
- MCP (Model Context Protocol) server for AI agent interoperability

**Ask:** $500K seed round to accelerate customer acquisition, expand Shopify app store presence, and build the Sovereign Stack (self-hosted deployment).

---

## Pitch Narrative: The Three-Market Convergence

### Market 1: Multi-Tenant Commerce ($12B TAM)

Shopify charges $29--$2,000/month and locks merchants into their ecosystem. BigCommerce is expensive and slow. UnifyOne offers true multi-tenant isolation at the database level (every query scoped by `tenantId`), with Shopify as an integration rather than a competitor. Merchants can sync products bidirectionally, use Shopify for checkout, and run their operations in UnifyOne.

**Key differentiator:** We are a commerce operating system, not just a storefront. Products, Orders, Customers, Analytics, Social Media, CRM, Team Management, and Governance -- all in one platform with a single subscription.

### Market 2: Gig Economy Tools ($8B TAM)

38% of the US workforce participates in gig work. These workers juggle 2--4 platforms (DoorDash, Uber, Instacart, Lyft), manually track mileage for tax deductions, and have no unified financial dashboard. UnifyOne's Gig Command and Money Manager modules solve this:

- **Gig Command (`GigCommand.tsx`):** GPS-aware shift operations center with platform-specific shortcuts, zone recommendations, and per-hour earnings calculations
- **Money Manager (`MoneyManager.tsx`):** Cross-platform earnings aggregation, IRS mileage deduction calculator ($0.70/mile for 2025), financial rules engine (auto-save, budget caps, allocation rules)
- **Mileage Tracking (`mileageLogs` table):** Automatic mileage logging with start/end addresses and IRS-compliant deduction calculations

**Key differentiator:** No gig economy tool also provides commerce infrastructure. A DoorDash driver who also sells merchandise can manage both revenue streams in one platform.

### Market 3: AI Copilot ($15B TAM)

Every SaaS product is adding AI, but most bolt it on as a chatbot. UnifyOne's Manus AI is deeply integrated:

- **Per-page context prompts:** The AI knows whether you are on the Dashboard, Money Manager, Gig Command, Social Media, Leads, or Automations page and adapts its system prompt accordingly (defined in `server/routers/manusAI.ts`)
- **Conversation persistence:** AI conversations are stored in `aiConversations` table, enabling continuity across sessions
- **Governance-aware:** The `claudeGovernanceRouter` uses LLM reasoning to evaluate autonomous actions against governance rules, creating a compliance-aware AI layer
- **Document RAG:** Upload business documents and query them via the Document Chat module with vector similarity search

**Key differentiator:** AI that understands your commerce context, your gig earnings, and your governance constraints simultaneously.

---

## Defensibility Moats

### 1. Cathedral Framework (12-Month Engineering Moat)

The Cathedral Framework mandates sequential construction: each system layer is proven under load before the next is built. This eliminates technical debt -- the most common cause of platform failures at scale. Competitors building fast accumulate debt that becomes unmovable.

**Evidence:** Our schema (`drizzle/schema.ts`) contains 40+ tables with zero circular dependencies. Every table has proper indexing, type safety (via Drizzle ORM), and tenant isolation.

### 2. Integrated Payment Orchestration (6-Month Moat)

UnifyOne integrates four payment processors (Stripe, PayPal, Square, Shopify Payments) with a unified order model. The `orders` table stores processor-agnostic data with processor-specific reference IDs. Combined with server-side Meta CAPI event relay (with SHA-256 PII hashing and deduplication), this creates an attribution pipeline that standalone tools cannot replicate.

### 3. AI Copilot Depth (6-Month Moat)

Manus AI is not a bolted-on chatbot. It has 10+ context-specific system prompts, governance-aware decision-making, document RAG, and conversation persistence. The `claudeGovernanceRouter` performs real-time AI-augmented rule evaluation -- a pattern no commerce competitor has implemented.

### 4. Governance-as-Code (12-Month Moat)

Our governance layer -- executable rules, 3-tier escalation, immutable audit logs, automatic kill-switches -- is a compliance moat. Enterprise customers require this. Competitors would need 12+ months to replicate the `governanceRules` + `escalationQueue` + `auditLogs` infrastructure.

### 5. Gig Economy + Commerce Convergence (Unique Position)

No platform combines multi-tenant commerce with gig economy financial management. This convergence creates a unique value proposition for the 59 million Americans who do gig work and may also run side businesses.

### 6. MCP Server (AI Interoperability Moat)

UnifyOne exposes a Model Context Protocol server, making it natively accessible to external AI agents. As AI agents become the primary interface for business operations, MCP compatibility is a first-mover advantage.

---

## Business Model

### Revenue Streams

| Stream | Unit Economics | Projected |
|--------|-----------------|-----------|
| **UnifyOne SaaS** | $99--$999/mo per tenant | Primary revenue driver |
| **Theme Marketplace** | 30% commission on paid themes | Growing marketplace revenue |
| **Transaction Fees** | 1--2% via Stripe Connect (planned) | Volume-based revenue |
| **1Commerce Integrations** | 2% transaction fee | Legacy revenue |
| **PNW Solutions Consulting** | $150/hr, 40% utilization | Services revenue |
| **Subsidiary Revenue** | 30% of subsidiary gross | Ecosystem revenue |

### SaaS Pricing Tiers

Plans are stored in the `plans` table with Stripe Price IDs for both monthly and yearly billing:

| Plan | Price | Max Products | Max Orders | Max Users | Features |
|------|-------|-------------|------------|-----------|----------|
| **Starter** | $99/mo | 100 | 1,000 | 5 | Core commerce, basic analytics |
| **Pro** | $299/mo | 1,000 | 10,000 | 15 | + Manus AI, social media, automations |
| **Enterprise** | $999/mo | Unlimited | Unlimited | Unlimited | + Governance, dedicated support, custom integrations |

### Unit Economics

- **CAC:** $200 (organic + referral only; referral system with credit rewards incentivizes virality)
- **LTV:** $5,000 (3-year retention, blended $140/mo average)
- **LTV:CAC Ratio:** 25:1 (excellent)
- **Gross Margin:** 75% (SaaS) + 85% (consulting)
- **Payback Period:** 4 months

---

## Go-to-Market Strategy

### Phase 1: Product-Led Growth (Current)

- **Target:** Gig workers + small e-commerce operators
- **Channels:** Organic (SEO blog covering "gig economy commerce," "multi-tenant ecommerce," "ai for gig workers"), referral program (credit-based), direct outreach
- **Product hooks:** Free tier for gig workers (Money Manager + Mileage Tracking), paid upgrade for commerce features
- **Messaging:** "One platform for your gigs and your business"

### Phase 2: Platform Growth

- **Target:** SMB e-commerce + Shopify merchants
- **Channels:** Shopify App Store listing, Meta Ads ($20/day targeting), Google Ads, Product Hunt launch
- **Product hooks:** Shopify sync (bidirectional), Theme Marketplace, Social Media Suite
- **Messaging:** "Commerce infrastructure without the Shopify price tag"

### Phase 3: Enterprise

- **Target:** Mid-market + enterprise with compliance requirements
- **Channels:** Enterprise sales, channel partners, SOC 2 certification as trust signal
- **Product hooks:** Governance-as-Code, multi-tenant isolation, audit trails, Sovereign Stack (self-hosted)
- **Messaging:** "The only commerce platform built for autonomous operations"

---

## Capital Strategy

### Seed Round ($500K)

**Use of Funds:**
- 40% ($200K): Customer acquisition (paid ads, Shopify App Store, partnerships)
- 30% ($150K): Engineering (Sovereign Stack, Theme Marketplace expansion, mobile app)
- 20% ($100K): Operations (SOC 2 audit, compliance, hiring)
- 10% ($50K): Runway buffer

**Timeline:** 18 months to Series A readiness

### Series A Target ($2--3M)

**Milestones to Trigger:**
- 500+ customers, $200K MRR
- Autonomous AI handling 80% of operational decisions (measured via `auditLogs`)
- SOC 2 Type II certification
- Sovereign Stack deployed with 10+ self-hosted customers
- Shopify App Store with 100+ installs

---

## Growth Projections Framework

### Key Assumptions

| Assumption | Value | Basis |
|-----------|-------|-------|
| Organic CAC | $200 | Blog SEO + referral credits |
| Monthly churn | 5% (Starter), 3% (Pro), 1% (Enterprise) | Industry benchmarks |
| Upsell rate | 15% annually (Starter -> Pro) | Based on feature adoption |
| Referral conversion | 10% of users refer 1+ customer | Credit-based incentive system |
| Average revenue per user | $140/mo (blended) | Weighted by plan mix |

### Conservative Projections

| Year | Customers | MRR | ARR | Burn Rate | Runway |
|------|-----------|-----|-----|-----------|--------|
| 2025 | 100 | $50K | $600K | $20K/mo | 25 months |
| 2026 | 300 | $200K | $2.4M | $10K/mo | 36+ months |
| 2027 | 1,000 | $500K | $6M | Breakeven | Sustainable |

### Aggressive Projections

| Year | Customers | MRR | ARR | Burn Rate | Runway |
|------|-----------|-----|-----|-----------|--------|
| 2025 | 200 | $100K | $1.2M | $10K/mo | 50 months |
| 2026 | 800 | $500K | $6M | Breakeven | Sustainable |
| 2027 | 2,000 | $1.2M | $14.4M | Profitable | Sustainable |

### Revenue Compounding Levers

1. **Theme Marketplace** -- As merchant count grows, theme authors join, creating network effects. 30% commission on paid themes.
2. **Referral Flywheel** -- Credit-based referral system (tracked via `referrals` and `creditTransactions` tables) incentivizes organic growth.
3. **Integration Lock-In** -- Once a merchant connects Shopify, Stripe, and Meta CAPI, switching costs increase dramatically.
4. **AI Value Accrual** -- As Manus AI conversations accumulate (`aiConversations` table), the AI becomes more valuable per tenant.
5. **Subsidiary Revenue** -- Each PNW subsidiary (KSK Industrial, PNW Solutions) contributes revenue while validating platform features.

---

## Competitive Landscape

### Direct Competitors

| Competitor | Strength | Weakness | Our Advantage |
|-----------|----------|----------|---------------|
| **Shopify** | Brand, ecosystem | Monolithic, no multi-tenant, expensive | Multi-tenant isolation, AI copilot, 10x cheaper for SMBs |
| **BigCommerce** | Enterprise features | Slow, expensive | Purpose-built governance, faster iteration |
| **Wix** | Easy setup | No commerce depth | Full commerce stack + gig economy tools |
| **Zapier/Make** | Workflow automation | No commerce context | Commerce-native automation with AI reasoning |
| **Stride/Gridwise** | Gig tracking | No commerce features | Full commerce + gig in one platform |

**Competitive Moat:** We are the only platform that combines multi-tenant isolation + AI copilot + governance-as-code + gig economy tools. This is a 12--18 month lead.

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|-----------|
| Market adoption slow | Medium | High | Diversify customer segments (gig workers -> SMB -> enterprise) |
| Stripe/Meta API changes | Low | Medium | Abstraction layer via tRPC routers; multiple payment processors |
| Regulatory changes | Medium | High | Governance-as-code allows rapid policy updates via `governanceRules` |
| AI provider dependency | Medium | Medium | LLM abstraction via `invokeLLM()` -- can switch providers (currently using Forge API gateway) |
| Competitive pressure | High | Medium | Cathedral Framework execution + governance moat |
| Shopify App Store rejection | Low | High | Build direct distribution channel (Sovereign Stack) as fallback |

---

## Board Structure & Governance

### Current Board

- **CEO (Keith):** Founder, strategic direction, Cathedral-level authority
- **Technical Lead:** Architecture, infrastructure, Architect-level authority
- **Finance Lead:** Capital allocation, pricing, customer contracts
- **Compliance Officer:** Regulatory posture, data privacy, audit trails

### Board Expansion (Post-Seed)

- 1 institutional investor seat
- 1 independent director (commerce/SaaS experience)
- 1 independent director (AI/governance experience)

### Decision Authority

All board decisions are logged in the `auditLogs` table, versioned, and reversible. The governance-as-code framework applies to board decisions as well. The 3-tier authority model (Operator -> Architect -> Cathedral) extends to board governance.

---

## Next Steps for Investors

1. **Technical Due Diligence:** Review UnifyOne architecture, Drizzle schema (40+ tables), tRPC router structure (25+ routers), governance framework
2. **Product Demo:** Live walkthrough of Dashboard, Gig Command, Money Manager, Manus AI, Governance Dashboard
3. **Customer References:** Speak with current customers about product-market fit
4. **Market Validation:** Validate TAM assumptions with industry analysts (gig economy + commerce convergence)
5. **Legal Review:** Review governance charter, compliance posture, IP ownership
6. **Term Sheet:** Discuss valuation, liquidation preferences, board seats

---

## Contact

**Keith (CEO)**
Email: skdev@1commercesolutions.com
Phone: +1-406-594-4343
Website: https://1commerce.online
