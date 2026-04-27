import { useState } from "react";
import { Helmet } from "react-helmet-async";
import PublicLayout from "@/components/PublicLayout";
import { SITE_URL } from "@/lib/siteConfig";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "setup", label: "API Setup" },
  { id: "mcp", label: "MCP Server (Live)" },
  { id: "webhook", label: "Webhooks" },
  { id: "tasks", label: "Task Patterns" },
  { id: "n8n", label: "n8n Bridge" },
  { id: "checklist", label: "Checklist" },
];

const CODE_BLOCKS = {
  envSetup: `# .env (UnifyOne / Netlify)
MCP_WORKER_URL=https://unify0ne-mcp.skdev-371.workers.dev
ONECOMMERCE_API_KEY=your_api_key_here

# UnifyAI Router (api.1commerce.online)
UNIFYAI_ENDPOINT=https://api.1commerce.online/v1
UNIFYAI_API_KEY=your_unifyone_api_key`,

  mcpConfig: `// Claude Desktop config (claude_desktop_config.json)
// Or paste into Settings > Developer > MCP Servers in claude.ai
{
  "mcpServers": {
    "unify0ne": {
      "url": "https://unify0ne-mcp.skdev-371.workers.dev/mcp"
    }
  }
}

// Alternative: use npx mcp-remote for SSE transport
// npx @modelcontextprotocol/inspector \\
//   https://unify0ne-mcp.skdev-371.workers.dev/mcp`,

  createTask: `// server/ai.ts — invoke the Kai chat endpoint from server-side
import { invokeLLM } from "./_core/llm";

export async function runAITask({
  systemPrompt,
  userPrompt,
  userId,
  tenantId,
}: {
  systemPrompt: string;
  userPrompt: string;
  userId: number;
  tenantId?: number;
}) {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    meter: {
      userId,
      source: "ai_task",
      action: "kai.task",
      tenantId,
    },
  });

  return response.choices[0]?.message?.content ?? "";
}`,

  webhook: `// server/_core/ai-webhook.ts — handle n8n automation callbacks
import crypto from "crypto";
import express from "express";

function verifySignature(payload: string, sig: string, secret: string) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return sig === \`sha256=\${expected}\`;
}

app.post("/api/webhooks/automation", async (req, res) => {
  const sig = req.headers["x-automation-signature"] as string || "";
  const valid = verifySignature(
    req.body,
    sig,
    process.env.AUTOMATION_WEBHOOK_SECRET ?? ""
  );

  if (!valid) return res.status(401).json({ error: "Invalid signature" });

  const event = JSON.parse(req.body);
  const { event_type, workflow_id, status, result } = event;

  if (event_type === "workflow.completed") {
    await handleWorkflowComplete(workflow_id, result);
  }

  res.status(200).json({ received: true });
});`,

  n8nBridge: `// n8n HTTP Request node → UnifyOne tRPC endpoint
// Method: POST
// URL: https://your-app.netlify.app/api/trpc/ai.chat
// Auth: Header → Authorization: Bearer {{$env.UNIFYONE_API_KEY}}

// Body (JSON):
{
  "json": {
    "message": "{{ $json.prompt }}",
    "context": "automations"
  }
}

// n8n Webhook node (listens for UnifyOne events):
// Path: /webhooks/unifyone
// Method: POST
// Route by: {{ $json.event_type }}`,

  taskExample: `// Example: Trigger Kai insight from n8n schedule
const response = await fetch("/api/trpc/ai.chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": \`Bearer \${process.env.UNIFYONE_API_KEY}\`,
  },
  body: JSON.stringify({
    json: {
      message: "Summarize this week's top revenue opportunities",
      context: "dashboard",
    },
  }),
});

// Example: Trigger automation on new order
// n8n: Watch orders webhook → POST to ai.chat with order context
const orderContext = JSON.stringify({ orderId, amount, product });
await runAITask({
  systemPrompt: "You are an order fulfillment assistant.",
  userPrompt: \`Suggest next steps for order \${orderId}\`,
  userId,
  tenantId,
});`,
};

const CHECKLIST = [
  {
    id: "c1",
    text: "Set MCP_WORKER_URL and ONECOMMERCE_API_KEY in .env",
    done: false,
  },
  {
    id: "c2",
    text: "Configure Claude Desktop MCP server (mcpConfig block)",
    done: false,
  },
  { id: "c3", text: "Deploy /api/webhooks/automation endpoint", done: false },
  { id: "c4", text: "Add AUTOMATION_WEBHOOK_SECRET to env", done: false },
  {
    id: "c5",
    text: "Test Kai chat endpoint with a manual prompt",
    done: false,
  },
  {
    id: "c6",
    text: "Wire n8n HTTP node to tRPC ai.chat endpoint",
    done: false,
  },
  {
    id: "c7",
    text: "Set up n8n Webhook node for order/lead events",
    done: false,
  },
  { id: "c8", text: "Verify credit metering in admin dashboard", done: false },
  {
    id: "c9",
    text: "Enable Shopify + payment webhooks for automation triggers",
    done: false,
  },
  {
    id: "c10",
    text: "Test end-to-end: new order → n8n → Kai insight",
    done: false,
  },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div
      style={{
        position: "relative",
        marginTop: "1rem",
        marginBottom: "1.5rem",
      }}
    >
      <pre
        style={{
          background: "#0d1117",
          color: "#c9d1d9",
          borderRadius: 8,
          padding: "1.2rem",
          overflowX: "auto",
          fontSize: 12,
          lineHeight: 1.6,
          margin: 0,
          border: "1px solid rgba(212,168,67,0.2)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {code}
      </pre>
      <button
        onClick={copy}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: copied ? "#238636" : "rgba(212,168,67,0.1)",
          color: copied ? "#fff" : "#D4A843",
          border: "1px solid rgba(212,168,67,0.3)",
          borderRadius: 6,
          padding: "6px 12px",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        {copied ? "✓ Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function IntegrationGuides() {
  const [activeTab, setActiveTab] = useState("overview");
  const [checks, setChecks] = useState(CHECKLIST);

  const toggle = (id: string) =>
    setChecks(c => c.map(x => (x.id === id ? { ...x, done: !x.done } : x)));

  const done = checks.filter(c => c.done).length;

  return (
    <PublicLayout>
      <Helmet>
        <title>Integration Guides | UnifyOne Documentation</title>
        <meta
          name="description"
          content="Complete integration guides for Kai, Claude, n8n, and payment processors."
        />
        <link rel="canonical" href={`${SITE_URL}/documents/integrations`} />
        <meta
          property="og:title"
          content="Integration Guides | UnifyOne Documentation"
        />
        <meta
          property="og:description"
          content="Complete integration guides for Kai, Claude, n8n, and payment processors."
        />
        <meta
          property="og:url"
          content={`${SITE_URL}/documents/integrations`}
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "AI Integration Guide",
            description:
              "Complete guide to integrating Kai AI and Claude with UnifyOne platform",
            step: [
              {
                "@type": "HowToStep",
                name: "API Setup",
                text: "Configure MCP_WORKER_URL and ONECOMMERCE_API_KEY",
              },
              {
                "@type": "HowToStep",
                name: "MCP Server",
                text: "Install and configure the UnifyOne MCP server",
              },
              {
                "@type": "HowToStep",
                name: "Webhooks",
                text: "Deploy webhook endpoint for automation callbacks",
              },
              {
                "@type": "HowToStep",
                name: "Task Patterns",
                text: "Implement task creation patterns for your use cases",
              },
            ],
          })}
        </script>
      </Helmet>

      <section
        style={{
          backgroundColor: "#020202",
          minHeight: "100vh",
          paddingTop: "6rem",
          paddingBottom: "4rem",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="inscription block mb-4">INTEGRATION GUIDES</span>
            <h1
              className="font-cinzel text-4xl sm:text-5xl font-bold mb-6"
              style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
            >
              Connect your entire stack
            </h1>
            <p
              className="font-crimson text-lg max-w-2xl mx-auto"
              style={{ color: "#9A9A9A", lineHeight: 1.8 }}
            >
              Complete technical guide to integrating Kai AI for autonomous task
              execution and Claude for intelligent automation.
            </p>
          </div>

          {/* Integration Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {[
              {
                emoji: "💳",
                title: "Stripe",
                description:
                  "Connect Stripe for subscriptions, one-time payments, and the Meta CAPI purchase event bridge.",
                tab: "setup",
              },
              {
                emoji: "🛍️",
                title: "Shopify",
                description:
                  "Sync Shopify products, orders, and webhooks with your UnifyOne multi-tenant store.",
                tab: "setup",
              },
              {
                emoji: "🅿️",
                title: "PayPal",
                description:
                  "Enable PayPal checkout alongside Stripe for broader global payment coverage.",
                tab: "setup",
              },
              {
                emoji: "⬛",
                title: "Square",
                description:
                  "Integrate Square POS and eCommerce APIs to unify in-person and online sales data.",
                tab: "setup",
              },
              {
                emoji: "🤖",
                title: "Anthropic AI",
                description:
                  "Wire Claude claude-3-5-sonnet via MCP server for context-aware task execution inside UnifyOne.",
                tab: "mcp",
              },
              {
                emoji: "🔄",
                title: "n8n",
                description:
                  "Automate workflows end-to-end: orders, leads, and Kai AI prompts via the n8n bridge.",
                tab: "n8n",
              },
            ].map(integration => (
              <div
                key={integration.title}
                style={{
                  backgroundColor: "rgba(212,168,67,0.04)",
                  border: "1px solid rgba(212,168,67,0.15)",
                  padding: "1.5rem",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
                  {integration.emoji}
                </div>
                <div
                  className="font-cinzel text-sm font-bold mb-2"
                  style={{ color: "#D4A843", letterSpacing: "0.05em" }}
                >
                  {integration.title}
                </div>
                <p
                  className="font-crimson text-sm mb-4"
                  style={{ color: "#A0A0A0", lineHeight: 1.6 }}
                >
                  {integration.description}
                </p>
                <button
                  onClick={() => setActiveTab(integration.tab)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "rgba(212,168,67,0.1)",
                    border: "1px solid rgba(212,168,67,0.3)",
                    color: "#D4A843",
                    fontFamily: "'Cinzel', serif",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  View Guide →
                </button>
              </div>
            ))}
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                style={{
                  padding: "10px 16px",
                  backgroundColor:
                    activeTab === section.id
                      ? "rgba(212,168,67,0.15)"
                      : "rgba(212,168,67,0.05)",
                  border: `1px solid ${activeTab === section.id ? "rgba(212,168,67,0.4)" : "rgba(212,168,67,0.15)"}`,
                  color: activeTab === section.id ? "#D4A843" : "#7A7A7A",
                  fontFamily: "'Cinzel', serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                {section.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div
            style={{
              backgroundColor: "rgba(212,168,67,0.02)",
              border: "1px solid rgba(212,168,67,0.1)",
              padding: "2.5rem",
            }}
          >
            {activeTab === "overview" && (
              <div>
                <h2
                  className="font-cinzel text-2xl font-bold mb-6"
                  style={{ color: "#D4A843" }}
                >
                  Overview
                </h2>
                <div
                  className="font-crimson text-base space-y-4"
                  style={{ color: "#C0C0C0", lineHeight: 1.8 }}
                >
                  <p>
                    Kai is a context-aware AI sidekick that{" "}
                    <strong style={{ color: "#D4A843" }}>executes tasks</strong>{" "}
                    — not just answers questions. Integrate Kai with UnifyOne to
                    automate complex workflows: affiliate research, SEO audits,
                    digital product fulfillment, store provisioning, and more.
                  </p>
                  <p>
                    This guide covers: API setup, MCP server configuration,
                    webhook handling, task patterns, and n8n bridge integration.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "setup" && (
              <div>
                <h2
                  className="font-cinzel text-2xl font-bold mb-6"
                  style={{ color: "#D4A843" }}
                >
                  1. API Setup
                </h2>
                <p
                  className="font-crimson text-base mb-4"
                  style={{ color: "#C0C0C0" }}
                >
                  Configure your UnifyAI credentials in your environment:
                </p>
                <CodeBlock code={CODE_BLOCKS.envSetup} />
              </div>
            )}

            {activeTab === "mcp" && (
              <div>
                <h2
                  className="font-cinzel text-2xl font-bold mb-6"
                  style={{ color: "#D4A843" }}
                >
                  2. MCP Server
                </h2>
                <p
                  className="font-crimson text-base mb-4"
                  style={{ color: "#C0C0C0" }}
                >
                  Install and configure the UnifyOne MCP server for Claude
                  integration:
                </p>
                <CodeBlock code={CODE_BLOCKS.mcpConfig} />
              </div>
            )}

            {activeTab === "webhook" && (
              <div>
                <h2
                  className="font-cinzel text-2xl font-bold mb-6"
                  style={{ color: "#D4A843" }}
                >
                  3. Webhooks
                </h2>
                <p
                  className="font-crimson text-base mb-4"
                  style={{ color: "#C0C0C0" }}
                >
                  Deploy a webhook endpoint to receive automation events:
                </p>
                <CodeBlock code={CODE_BLOCKS.webhook} />
              </div>
            )}

            {activeTab === "tasks" && (
              <div>
                <h2
                  className="font-cinzel text-2xl font-bold mb-6"
                  style={{ color: "#D4A843" }}
                >
                  4. Task Patterns
                </h2>
                <p
                  className="font-crimson text-base mb-4"
                  style={{ color: "#C0C0C0" }}
                >
                  Common task patterns for research, audits, and provisioning:
                </p>
                <CodeBlock code={CODE_BLOCKS.taskExample} />
              </div>
            )}

            {activeTab === "n8n" && (
              <div>
                <h2
                  className="font-cinzel text-2xl font-bold mb-6"
                  style={{ color: "#D4A843" }}
                >
                  5. n8n Bridge
                </h2>
                <p
                  className="font-crimson text-base mb-4"
                  style={{ color: "#C0C0C0" }}
                >
                  Wire Kai task calls through n8n workflows:
                </p>
                <CodeBlock code={CODE_BLOCKS.n8nBridge} />
              </div>
            )}

            {activeTab === "checklist" && (
              <div>
                <h2
                  className="font-cinzel text-2xl font-bold mb-6"
                  style={{ color: "#D4A843" }}
                >
                  Implementation Checklist
                </h2>
                <div className="space-y-3">
                  {checks.map(check => (
                    <label
                      key={check.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "12px",
                        backgroundColor: check.done
                          ? "rgba(63, 185, 80, 0.05)"
                          : "rgba(212,168,67,0.05)",
                        border: `1px solid ${check.done ? "rgba(63, 185, 80, 0.2)" : "rgba(212,168,67,0.15)"}`,
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={check.done}
                        onChange={() => toggle(check.id)}
                        style={{ marginRight: "12px", cursor: "pointer" }}
                      />
                      <span
                        className="font-crimson text-base"
                        style={{
                          color: check.done ? "#7A7A7A" : "#C0C0C0",
                          textDecoration: check.done ? "line-through" : "none",
                        }}
                      >
                        {check.text}
                      </span>
                    </label>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: "1.5rem",
                    paddingTop: "1.5rem",
                    borderTop: "1px solid rgba(212,168,67,0.1)",
                  }}
                >
                  <div
                    className="font-cinzel text-sm"
                    style={{ color: "#D4A843", marginBottom: "8px" }}
                  >
                    Progress: {done}/{checks.length} complete
                  </div>
                  <div
                    style={{
                      background: "rgba(212,168,67,0.1)",
                      borderRadius: 4,
                      height: 8,
                    }}
                  >
                    <div
                      style={{
                        width: `${(done / checks.length) * 100}%`,
                        background:
                          done === checks.length ? "#3fb950" : "#D4A843",
                        height: "100%",
                        borderRadius: 4,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
