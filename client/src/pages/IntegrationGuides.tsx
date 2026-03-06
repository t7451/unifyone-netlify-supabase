import { useState } from "react";
import { Helmet } from "react-helmet-async";
import PublicLayout from "@/components/PublicLayout";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "setup", label: "API Setup" },
  { id: "mcp", label: "MCP Server" },
  { id: "webhook", label: "Webhooks" },
  { id: "tasks", label: "Task Patterns" },
  { id: "n8n", label: "n8n Bridge" },
  { id: "checklist", label: "Checklist" },
];

const CODE_BLOCKS = {
  envSetup: `# .env (UnifyOne / Cloud Run)
MANUS_API_KEY=your_manus_api_key_here
MANUS_WEBHOOK_SECRET=your_webhook_secret_here
MANUS_BASE_URL=https://open.manus.ai/v1`,

  mcpConfig: `// ~/.claude/manus-mcp.json
{
  "mcpServers": {
    "manus-mcp": {
      "command": "npx",
      "args": ["manus-mcp"],
      "env": {
        "MANUS_MCP_API_KEY": "\${MANUS_API_KEY}"
      },
      "autoStart": true
    }
  }
}`,

  createTask: `// server/manus.ts
const MANUS_BASE = process.env.MANUS_BASE_URL;
const API_KEY = process.env.MANUS_API_KEY;

export async function createManusTask({
  prompt,
  mode = "quality",
  connectors = [],
  attachments = [],
  shareableLink = false,
}) {
  const res = await fetch(\`\${MANUS_BASE}/tasks\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${API_KEY}\`,
    },
    body: JSON.stringify({
      prompt,
      mode,
      connectors,
      attachments,
      create_shareable_link: shareableLink,
      hide_in_task_list: false,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(\`Manus task creation failed: \${err.message}\`);
  }

  return res.json();
  // Returns: { task_id, task_title, task_url, shareURL? }
}`,

  webhook: `// server/_core/manus-webhook.ts
import crypto from "crypto";
import express from "express";

function verifySignature(payload, sig, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return sig === \`sha256=\${expected}\`;
}

app.post("/api/webhooks/manus", async (req, res) => {
  const sig = req.headers["x-manus-signature"] || "";
  const valid = verifySignature(
    req.body,
    sig,
    process.env.MANUS_WEBHOOK_SECRET
  );

  if (!valid) return res.status(401).json({ error: "Invalid signature" });

  const event = JSON.parse(req.body);
  const { event_type, task_id, status, result } = event;

  // Route completed tasks
  if (event_type === "task.completed") {
    await handleTaskComplete(task_id, result);
  }

  res.status(200).json({ received: true });
});`,

  n8nBridge: `// n8n HTTP Request node → Manus
// Method: POST
// URL: https://open.manus.ai/v1/tasks
// Auth: Header → Authorization: Bearer {{$env.MANUS_API_KEY}}

// Body (JSON):
{
  "prompt": "{{ $json.prompt }}",
  "mode": "quality",
  "connectors": ["gmail", "notion", "shopify"],
  "hide_in_task_list": false
}

// n8n Webhook node (listens for Manus callbacks):
// Path: /webhooks/manus
// Method: POST
// Route by: {{ $json.event_type }}`,

  taskExample: `// Example: Affiliate Research
createManusTask({
  prompt: \`Research the top 10 Shopify-compatible affiliate programs
  paying 30%+ recurring commissions. Return as JSON with fields:
  name, commission_pct, cookie_days, payout_threshold, signup_url.\`,
  mode: "quality",
  connectors: ["shopify"],
});

// Example: SEO Gap Analysis
createManusTask({
  prompt: \`Run an SEO gap analysis for 1commerce.online
  targeting solopreneurs in the Pacific Northwest.
  Identify striking-distance keywords (pos 7-12), topical gaps,
  and produce 5 optimized title tags + meta descriptions.\`,
  mode: "quality",
});`,
};

const CHECKLIST = [
  { id: "c1", text: "Obtain Manus API key from open.manus.ai", done: false },
  { id: "c2", text: "Add MANUS_API_KEY + MANUS_WEBHOOK_SECRET to env", done: false },
  { id: "c3", text: "Install manus-mcp: npx manus-mcp", done: false },
  { id: "c4", text: "Update .mcp.json with manus-mcp block", done: false },
  { id: "c5", text: "Deploy /api/webhooks/manus endpoint", done: false },
  { id: "c6", text: "Register webhook URL in Manus dashboard", done: false },
  { id: "c7", text: "Test with createManusTask() → affiliate_research", done: false },
  { id: "c8", text: "Wire n8n HTTP node to Manus task creation", done: false },
  { id: "c9", text: "Enable Shopify + Gmail connectors in Manus", done: false },
  { id: "c10", text: "Verify webhook events in Manus dashboard", done: false },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div style={{ position: "relative", marginTop: "1rem", marginBottom: "1.5rem" }}>
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
    setChecks((c) => c.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

  const done = checks.filter((c) => c.done).length;

  return (
    <PublicLayout>
      <Helmet>
        <title>Integration Guides | UnifyOne Documentation</title>
        <meta
          name="description"
          content="Complete integration guides for Manus AI, Claude, n8n, and payment processors."
        />
        <link rel="canonical" href="https://1commerce.online/documents/integrations" />
        <meta property="og:title" content="Integration Guides | UnifyOne Documentation" />
        <meta
          property="og:description"
          content="Complete integration guides for Manus AI, Claude, n8n, and payment processors."
        />
        <meta property="og:url" content="https://1commerce.online/documents/integrations" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "Manus AI Integration Guide",
            description: "Complete guide to integrating Manus AI with UnifyOne platform",
            step: [
              {
                "@type": "HowToStep",
                name: "API Setup",
                text: "Configure MANUS_API_KEY and MANUS_WEBHOOK_SECRET",
              },
              {
                "@type": "HowToStep",
                name: "MCP Server",
                text: "Install and configure manus-mcp",
              },
              {
                "@type": "HowToStep",
                name: "Webhooks",
                text: "Deploy webhook endpoint and register with Manus",
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

      <section style={{ backgroundColor: "#020202", minHeight: "100vh", paddingTop: "6rem", paddingBottom: "4rem" }}>
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="inscription block mb-4">INTEGRATION GUIDES</span>
            <h1 className="font-cinzel text-4xl sm:text-5xl font-bold mb-6" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>
              Manus AI + Claude Integration
            </h1>
            <p className="font-crimson text-lg max-w-2xl mx-auto" style={{ color: "#9A9A9A", lineHeight: 1.8 }}>
              Complete technical guide to integrating Manus AI for autonomous task execution and Claude for intelligent automation.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                style={{
                  padding: "10px 16px",
                  backgroundColor: activeTab === section.id ? "rgba(212,168,67,0.15)" : "rgba(212,168,67,0.05)",
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
          <div style={{ backgroundColor: "rgba(212,168,67,0.02)", border: "1px solid rgba(212,168,67,0.1)", padding: "2.5rem" }}>
            {activeTab === "overview" && (
              <div>
                <h2 className="font-cinzel text-2xl font-bold mb-6" style={{ color: "#D4A843" }}>
                  Overview
                </h2>
                <div className="font-crimson text-base space-y-4" style={{ color: "#C0C0C0", lineHeight: 1.8 }}>
                  <p>
                    Manus is a hands-on AI agent platform that <strong style={{ color: "#D4A843" }}>executes tasks</strong> — not just answers questions. Integrate Manus with UnifyOne to automate complex workflows: affiliate research, SEO audits, digital product fulfillment, store provisioning, and more.
                  </p>
                  <p>
                    This guide covers: API setup, MCP server configuration, webhook handling, task patterns, and n8n bridge integration.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "setup" && (
              <div>
                <h2 className="font-cinzel text-2xl font-bold mb-6" style={{ color: "#D4A843" }}>
                  1. API Setup
                </h2>
                <p className="font-crimson text-base mb-4" style={{ color: "#C0C0C0" }}>
                  Configure your Manus API credentials in your environment:
                </p>
                <CodeBlock code={CODE_BLOCKS.envSetup} />
              </div>
            )}

            {activeTab === "mcp" && (
              <div>
                <h2 className="font-cinzel text-2xl font-bold mb-6" style={{ color: "#D4A843" }}>
                  2. MCP Server
                </h2>
                <p className="font-crimson text-base mb-4" style={{ color: "#C0C0C0" }}>
                  Install and configure the Manus MCP server for Claude integration:
                </p>
                <CodeBlock code={CODE_BLOCKS.mcpConfig} />
              </div>
            )}

            {activeTab === "webhook" && (
              <div>
                <h2 className="font-cinzel text-2xl font-bold mb-6" style={{ color: "#D4A843" }}>
                  3. Webhooks
                </h2>
                <p className="font-crimson text-base mb-4" style={{ color: "#C0C0C0" }}>
                  Deploy a webhook endpoint to receive Manus task completion events:
                </p>
                <CodeBlock code={CODE_BLOCKS.webhook} />
              </div>
            )}

            {activeTab === "tasks" && (
              <div>
                <h2 className="font-cinzel text-2xl font-bold mb-6" style={{ color: "#D4A843" }}>
                  4. Task Patterns
                </h2>
                <p className="font-crimson text-base mb-4" style={{ color: "#C0C0C0" }}>
                  Common task patterns for research, audits, and provisioning:
                </p>
                <CodeBlock code={CODE_BLOCKS.taskExample} />
              </div>
            )}

            {activeTab === "n8n" && (
              <div>
                <h2 className="font-cinzel text-2xl font-bold mb-6" style={{ color: "#D4A843" }}>
                  5. n8n Bridge
                </h2>
                <p className="font-crimson text-base mb-4" style={{ color: "#C0C0C0" }}>
                  Wire Manus task creation through n8n workflows:
                </p>
                <CodeBlock code={CODE_BLOCKS.n8nBridge} />
              </div>
            )}

            {activeTab === "checklist" && (
              <div>
                <h2 className="font-cinzel text-2xl font-bold mb-6" style={{ color: "#D4A843" }}>
                  Implementation Checklist
                </h2>
                <div className="space-y-3">
                  {checks.map((check) => (
                    <label
                      key={check.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "12px",
                        backgroundColor: check.done ? "rgba(63, 185, 80, 0.05)" : "rgba(212,168,67,0.05)",
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
                <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(212,168,67,0.1)" }}>
                  <div className="font-cinzel text-sm" style={{ color: "#D4A843", marginBottom: "8px" }}>
                    Progress: {done}/{checks.length} complete
                  </div>
                  <div style={{ background: "rgba(212,168,67,0.1)", borderRadius: 4, height: 8 }}>
                    <div
                      style={{
                        width: `${(done / checks.length) * 100}%`,
                        background: done === checks.length ? "#3fb950" : "#D4A843",
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
