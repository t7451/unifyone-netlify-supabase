import { useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import PublicLayout from "@/components/PublicLayout";
import { SITE_URL } from "@/lib/siteConfig";

const TABS = [
  { id: "overview", label: "Overview", icon: "📋" },
  { id: "case-studies", label: "Case Studies", icon: "📊" },
  { id: "integrations", label: "Integrations", icon: "⚙️" },
  { id: "work-proof", label: "Work Proof", icon: "✓" },
];

export default function Documents() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <PublicLayout>
      <Helmet>
        <title>Documentation | UnifyOne</title>
        <meta name="description" content="Complete documentation, case studies, integration guides, and proof of work for UnifyOne platform." />
        <link rel="canonical" href={`${SITE_URL}/documents`} />
        <meta property="og:title" content="Documentation | UnifyOne" />
        <meta property="og:description" content="Complete documentation, case studies, integration guides, and proof of work." />
        <meta property="og:url" content={`${SITE_URL}/documents`} />
        <meta name="twitter:title" content="Documentation | UnifyOne" />
        <meta name="twitter:description" content="Complete documentation, case studies, integration guides, and proof of work." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "UnifyOne Documentation",
            description: "Complete documentation, case studies, integration guides, and proof of work.",
            url: `${SITE_URL}/documents`,
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "Documentation", item: `${SITE_URL}/documents` },
              ],
            },
          })}
        </script>
      </Helmet>

      <section style={{ backgroundColor: "#020202", minHeight: "100vh", paddingTop: "6rem", paddingBottom: "4rem" }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="inscription block mb-4">DOCUMENTATION</span>
            <h1 className="font-cinzel text-4xl sm:text-5xl font-bold mb-6" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>
              The Cathedral Documented
            </h1>
            <p className="font-crimson text-lg max-w-2xl mx-auto" style={{ color: "#9A9A9A", lineHeight: 1.8 }}>
              Complete technical documentation, case studies, integration guides, and proof of work for the UnifyOne platform.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 sm:gap-4 mb-12 justify-center">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "12px 24px",
                  backgroundColor: activeTab === tab.id ? "rgba(212,168,67,0.15)" : "rgba(212,168,67,0.05)",
                  border: `1px solid ${activeTab === tab.id ? "rgba(212,168,67,0.4)" : "rgba(212,168,67,0.15)"}`,
                  color: activeTab === tab.id ? "#D4A843" : "#9A9A9A",
                  fontFamily: "'Cinzel', serif",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                className="hover:bg-opacity-20"
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ backgroundColor: "rgba(212,168,67,0.02)", border: "1px solid rgba(212,168,67,0.1)", padding: "3rem" }}>
            {activeTab === "overview" && (
              <div>
                <h2 className="font-cinzel text-2xl font-bold mb-6" style={{ color: "#D4A843" }}>Overview</h2>
                <div className="space-y-6 font-crimson text-base" style={{ color: "#C0C0C0", lineHeight: 1.8 }}>
                  <p>
                    UnifyOne is a multi-tenant commerce platform engineered with the Cathedral Principle — sequential, structural construction that prioritizes foundational strength before scaling traffic. This documentation covers the complete architecture, integration patterns, and proof of work across 36 development phases.
                  </p>
                  <p>
                    The platform combines <strong style={{ color: "#D4A843" }}>Manus AI integration</strong> for intelligent task automation, <strong style={{ color: "#D4A843" }}>multi-tenant isolation</strong> for SaaS scalability, and <strong style={{ color: "#D4A843" }}>payment infrastructure</strong> (Stripe, PayPal, Shopify) for global commerce.
                  </p>
                  <p>
                    Navigate to the sections below to explore detailed case studies, integration guides, and the complete work proof timeline.
                  </p>

                  {/* Quick Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                    <Link href="/docs-chat">
                      <a
                        style={{
                          display: "block",
                          padding: "1.5rem",
                          backgroundColor: "rgba(212,168,67,0.15)",
                          border: "2px solid rgba(212,168,67,0.4)",
                          color: "#D4A843",
                          fontFamily: "'Cinzel', serif",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "0.05em",
                          textAlign: "center",
                          transition: "all 0.3s ease",
                          textDecoration: "none",
                        }}
                        className="hover:bg-opacity-20"
                      >
                        💬 Chat with Docs
                      </a>
                    </Link>
                    <Link href="/resources">
                      <a
                        style={{
                          display: "block",
                          padding: "1.5rem",
                          backgroundColor: "rgba(212,168,67,0.15)",
                          border: "2px solid rgba(212,168,67,0.4)",
                          color: "#D4A843",
                          fontFamily: "'Cinzel', serif",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "0.05em",
                          textAlign: "center",
                          transition: "all 0.3s ease",
                          textDecoration: "none",
                        }}
                        className="hover:bg-opacity-20"
                      >
                        📦 Operating Excellence Resources
                      </a>
                    </Link>
                    <Link href="/video-production">
                      <a
                        style={{
                          display: "block",
                          padding: "1.5rem",
                          backgroundColor: "rgba(212,168,67,0.15)",
                          border: "2px solid rgba(212,168,67,0.4)",
                          color: "#D4A843",
                          fontFamily: "'Cinzel', serif",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "0.05em",
                          textAlign: "center",
                          transition: "all 0.3s ease",
                          textDecoration: "none",
                        }}
                        className="hover:bg-opacity-20"
                      >
                        🎬 Video Production
                      </a>
                    </Link>
                    <Link href="/marketing/ad-copy">
                      <a
                        style={{
                          display: "block",
                          padding: "1.5rem",
                          backgroundColor: "rgba(212,168,67,0.15)",
                          border: "2px solid rgba(212,168,67,0.4)",
                          color: "#D4A843",
                          fontFamily: "'Cinzel', serif",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "0.05em",
                          textAlign: "center",
                          transition: "all 0.3s ease",
                          textDecoration: "none",
                        }}
                        className="hover:bg-opacity-20"
                      >
                        ✍️ Ad Copy Hub
                      </a>
                    </Link>
                    {TABS.filter(t => t.id !== "overview").map((tab) => (
                      <Link key={tab.id} href={`/documents/${tab.id}`}>
                        <a
                          style={{
                            display: "block",
                            padding: "1.5rem",
                            backgroundColor: "rgba(212,168,67,0.08)",
                            border: "1px solid rgba(212,168,67,0.2)",
                            color: "#D4A843",
                            fontFamily: "'Cinzel', serif",
                            fontSize: "14px",
                            fontWeight: 600,
                            letterSpacing: "0.05em",
                            textAlign: "center",
                            transition: "all 0.3s ease",
                            textDecoration: "none",
                          }}
                          className="hover:bg-opacity-20"
                        >
                          {tab.icon} {tab.label}
                        </a>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "case-studies" && (
              <div>
                <h2 className="font-cinzel text-2xl font-bold mb-6" style={{ color: "#D4A843" }}>Case Studies</h2>
                <p className="font-crimson text-base mb-8" style={{ color: "#C0C0C0", lineHeight: 1.8 }}>
                  Detailed technical deep-dives into major platform features, architectural decisions, and integrations.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {[
                    { icon: "🏛️", title: "Cathedral Framework", subtitle: "Design System Architecture", href: "/documents/case-studies#cathedral-framework" },
                    { icon: "🤖", title: "Manus AI Integration", subtitle: "Context-Aware Copilot", href: "/documents/case-studies#manus-ai-integration" },
                    { icon: "🏢", title: "Multi-Tenant Commerce", subtitle: "Isolation & Scale", href: "/documents/case-studies#multi-tenant-commerce" },
                    { icon: "💳", title: "Stripe → Meta CAPI Bridge", subtitle: "Transactions to Algorithm", href: "/documents/case-studies#stripe-capi-bridge" },
                    { icon: "🎞️", title: "Scroll-Triggered Reveals", subtitle: "Performance-First Animation", href: "/documents/case-studies#scroll-reveals" },
                  ].map((item) => (
                    <Link key={item.title} href={item.href}>
                      <a
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "1rem",
                          padding: "1.25rem",
                          backgroundColor: "rgba(212,168,67,0.05)",
                          border: "1px solid rgba(212,168,67,0.15)",
                          color: "#D4A843",
                          transition: "all 0.3s ease",
                          textDecoration: "none",
                        }}
                        className="hover:bg-opacity-20"
                      >
                        <span style={{ fontSize: "1.75rem", flexShrink: 0 }}>{item.icon}</span>
                        <div>
                          <div className="font-cinzel text-sm font-bold" style={{ letterSpacing: "0.05em" }}>{item.title}</div>
                          <div className="font-crimson text-xs mt-1" style={{ color: "#7A7A7A" }}>{item.subtitle}</div>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
                <Link href="/documents/case-studies">
                  <a style={{ color: "#D4A843", textDecoration: "underline", fontFamily: "'Cinzel', serif", fontSize: "14px", fontWeight: 600 }}>
                    View all case studies →
                  </a>
                </Link>
              </div>
            )}

            {activeTab === "integrations" && (
              <div>
                <h2 className="font-cinzel text-2xl font-bold mb-6" style={{ color: "#D4A843" }}>Integration Guides</h2>
                <p className="font-crimson text-base mb-8" style={{ color: "#C0C0C0", lineHeight: 1.8 }}>
                  Complete step-by-step integration guides for Manus AI, Claude MCP, n8n automation, and payment processors.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {[
                    { icon: "⚙️", title: "API Setup", subtitle: "Configure credentials & environment", href: "/documents/integrations#setup" },
                    { icon: "🔌", title: "MCP Server (Live)", subtitle: "Claude Desktop integration", href: "/documents/integrations#mcp" },
                    { icon: "🪝", title: "Webhooks", subtitle: "Task completion event handling", href: "/documents/integrations#webhook" },
                    { icon: "🔄", title: "n8n Bridge", subtitle: "Automate via n8n workflows", href: "/documents/integrations#n8n" },
                    { icon: "📋", title: "Task Patterns", subtitle: "Research, audits & provisioning", href: "/documents/integrations#tasks" },
                    { icon: "✅", title: "Implementation Checklist", subtitle: "Track your integration progress", href: "/documents/integrations#checklist" },
                  ].map((item) => (
                    <Link key={item.title} href={item.href}>
                      <a
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "1rem",
                          padding: "1.25rem",
                          backgroundColor: "rgba(212,168,67,0.05)",
                          border: "1px solid rgba(212,168,67,0.15)",
                          color: "#D4A843",
                          transition: "all 0.3s ease",
                          textDecoration: "none",
                        }}
                        className="hover:bg-opacity-20"
                      >
                        <span style={{ fontSize: "1.75rem", flexShrink: 0 }}>{item.icon}</span>
                        <div>
                          <div className="font-cinzel text-sm font-bold" style={{ letterSpacing: "0.05em" }}>{item.title}</div>
                          <div className="font-crimson text-xs mt-1" style={{ color: "#7A7A7A" }}>{item.subtitle}</div>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
                <Link href="/documents/integrations">
                  <a style={{ color: "#D4A843", textDecoration: "underline", fontFamily: "'Cinzel', serif", fontSize: "14px", fontWeight: 600 }}>
                    View integration guides →
                  </a>
                </Link>
              </div>
            )}

            {activeTab === "work-proof" && (
              <div>
                <h2 className="font-cinzel text-2xl font-bold mb-6" style={{ color: "#D4A843" }}>Work Proof</h2>
                <p className="font-crimson text-base mb-8" style={{ color: "#C0C0C0", lineHeight: 1.8 }}>
                  Complete timeline of 25+ development phases, deliverables, and technical achievements spanning the full UnifyOne platform build.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: "🏗️", label: "Phases", value: "25+" },
                    { icon: "🧪", label: "Tests Passing", value: "100+" },
                    { icon: "📦", label: "Schema Tables", value: "40+" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      style={{
                        padding: "1.5rem",
                        backgroundColor: "rgba(212,168,67,0.05)",
                        border: "1px solid rgba(212,168,67,0.15)",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{stat.icon}</div>
                      <div className="font-cinzel text-2xl font-bold" style={{ color: "#D4A843" }}>{stat.value}</div>
                      <div className="font-crimson text-sm mt-1" style={{ color: "#7A7A7A" }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 mb-8">
                  {[
                    "Multi-tenant commerce platform (products, orders, customers)",
                    "Stripe, PayPal & Shopify payment rails",
                    "Manus AI integration with context-aware copilot",
                    "Social commerce: friends, challenges, gamification",
                    "Governance dashboard with audit logs & kill switches",
                    "Theme store marketplace with Stripe fulfillment",
                    "Affiliate hub, revenue streams, rewards keys",
                    "Mobile automation scheduling with n8n bridge",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 font-crimson text-sm" style={{ color: "#A0A0A0" }}>
                      <span style={{ color: "#D4A843", flexShrink: 0 }}>✓</span>
                      {item}
                    </div>
                  ))}
                </div>
                <Link href="/documents/work-proof">
                  <a style={{ color: "#D4A843", textDecoration: "underline", fontFamily: "'Cinzel', serif", fontSize: "14px", fontWeight: 600 }}>
                    View work proof timeline →
                  </a>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
