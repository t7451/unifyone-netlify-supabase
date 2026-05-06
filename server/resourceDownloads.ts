import type {
  Express,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";

type ResourceFile = {
  id: string;
  filename: string;
  contentType: string;
  body: string;
};

const templateRows: Record<string, string[]> = {
  "weekly-dashboard": [
    "Week,North Star Metric,Revenue Target,Actual Revenue,Pipeline Value,Top Priority,Owner,Status,Notes",
    "2025-W01,Qualified demos booked,25000,,75000,Launch weekly revenue review,Ops Lead,Not started,Replace sample values with your live KPIs",
    "2025-W02,Activation rate,30000,,90000,Tighten onboarding handoff,Customer Success,Not started,",
  ],
  "lead-pipeline": [
    "Lead,Company,Source,Stage,Estimated Value,Next Action,Owner,Due Date,Notes",
    "Sample Lead,Example Co.,Referral,Qualified,12000,Schedule discovery call,Sales Lead,2025-01-15,Replace sample data before use",
    "Partner Prospect,Partner LLC,LinkedIn,Contacted,8000,Send platform overview,Founder,2025-01-17,",
  ],
  "revenue-command": [
    "Stream,Monthly Target,Actual MRR,Gross Margin %,Forecast,Owner,Risk,Action",
    "Subscriptions,50000,,82,600000,Finance,Medium,Review churn drivers weekly",
    "Services,15000,,65,180000,Ops,Low,Document repeatable delivery packages",
  ],
  "content-calendar": [
    "Publish Date,Channel,Content Pillar,Asset Type,Headline,CTA,Owner,Status,Repurpose Notes",
    "2025-01-10,LinkedIn,Commerce Ops,Carousel,5 metrics every operator should review,Book a demo,Marketing,Draft,Turn into email section",
    "2025-01-12,YouTube,Automation,Short,How to spot manual work leaks,Download resources,Founder,Idea,Clip for Reels",
  ],
};

const guideBodies: Record<string, string> = {
  "cathedral-principle": `# The Cathedral Principle

Build commerce infrastructure in durable layers: identity, tenant isolation, payments, operations, analytics, then automation. Each layer should make the next layer safer to scale.

Use this brief as a planning worksheet:

1. Name the layer you are improving this quarter.
2. List the manual decisions that still block scale.
3. Add a rollback or kill switch for every new mutation.
4. Define the metric that proves the layer is stable.
`,
  "unifyone-guide": `# UnifyOne Platform Guide

UnifyOne unifies multi-tenant commerce operations across payments, products, orders, analytics, automations, teams, and customer workflows.

Operational checklist:

- Keep tenant data scoped by tenant ID.
- Route business-critical events through signed webhooks.
- Review subscription, order, and payment states weekly.
- Use dashboards to convert operational signals into actions.
`,
  "enterprise-ai": `# Enterprise AI & SaaS Solutions

Practical AI adoption starts with narrow workflows, reliable context, and measurable guardrails.

Implementation worksheet:

- Workflow: What decision or task should the agent improve?
- Context: Which documents, records, and policies are required?
- Guardrail: What actions require human approval?
- Metric: What cost, speed, or quality outcome should improve?
`,
  "day1-viral": `# Day 1 Viral Distribution Posts

Launch-day distribution works best when each channel has a specific job.

Post framework:

- Problem: Name the painful operational bottleneck.
- Insight: Explain the new way to solve it.
- Proof: Show a screenshot, metric, or workflow.
- CTA: Send readers to the resource library, demo, or contact page.
`,
  "sovereign-solopreneur": `# The Sovereign Solopreneur Strategy

The goal is not to avoid help; it is to build systems that reduce dependency on headcount.

System map:

- Revenue engine: offers, pricing, checkout, retention.
- Delivery engine: templates, automations, quality checks.
- Intelligence engine: analytics, alerts, agent-assisted decisions.
- Governance engine: permissions, audit logs, rollback paths.
`,
  "ai-operating-system": `# AI Operating System Guide

An AI operating system coordinates agents, tools, policies, memory, and approval workflows.

Starter architecture:

1. Intake: Capture requests with structured fields.
2. Context: Retrieve only the tenant-safe documents needed.
3. Planning: Break work into auditable tasks.
4. Execution: Use tools with scoped permissions.
5. Review: Log outputs, costs, and approvals.
`,
  "ai-prompt-library": `# AI Prompt Library

Use these prompt patterns as starting points:

## Strategy
"Act as an operator. Given this goal, constraints, and metric, propose a weekly execution plan with risks and rollback steps."

## Content
"Turn this product update into a customer-facing post, a founder note, and three short-form hooks."

## Analysis
"Summarize the anomalies in this dataset and rank recommended actions by impact and confidence."
`,
  "onestack-video": `# OneStack Cinematic Reel Production Brief

This downloadable text brief replaces the unavailable external video file. It gives teams enough direction to recreate or commission the asset without relying on a dead CDN link.

Concept: cinematic enterprise AI operations reel for OneStack.

Shot list:

- Abstract commerce command center dashboard.
- Agent workflow graph moving from intake to execution.
- Secure payment and subscription status overlays.
- Final frame: "OneStack — enterprise AI for unified commerce operations."

Suggested deliverable: 30-45 second MP4, 16:9 and 9:16 exports, captions included.
`,
};

export const RESOURCE_DOWNLOADS: Record<string, ResourceFile> = {
  ...Object.fromEntries(
    Object.entries(templateRows).map(([id, rows]) => [
      id,
      {
        id,
        filename: `${id}.csv`,
        contentType: "text/csv; charset=utf-8",
        body: `${rows.join("\n")}\n`,
      },
    ])
  ),
  ...Object.fromEntries(
    Object.entries(guideBodies).map(([id, body]) => [
      id,
      {
        id,
        filename: `${id}.md`,
        contentType: "text/markdown; charset=utf-8",
        body,
      },
    ])
  ),
};

function attachmentHeader(filename: string): string {
  return `attachment; filename="${filename.replace(/["\\]/g, "")}"`;
}

export function buildResourceDownloadResponse(id: string): Response {
  const resource = RESOURCE_DOWNLOADS[id];
  if (!resource) {
    return Response.json({ error: "Resource not found" }, { status: 404 });
  }

  return new Response(resource.body, {
    status: 200,
    headers: {
      "Content-Type": resource.contentType,
      "Content-Disposition": attachmentHeader(resource.filename),
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function registerResourceDownloadFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const match = url.pathname.match(/^\/api\/resources\/([^/]+)\/download$/);
  if (!match) return null;

  if (req.method !== "GET" && req.method !== "HEAD") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  return buildResourceDownloadResponse(decodeURIComponent(match[1]));
}

export function registerResourceDownloadRoutes(app: Express) {
  app.get(
    "/api/resources/:id/download",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const response = buildResourceDownloadResponse(req.params.id);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      try {
        res.send(await response.text());
      } catch {
        res.status(500).json({ error: "Could not generate resource" });
      }
    }
  );
}
