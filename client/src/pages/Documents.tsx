import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  Code2,
  Layers,
  Plug,
} from "lucide-react";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_URL } from "@/lib/siteConfig";

const DOCUMENTS_CANONICAL = `${SITE_URL}/documents`;
const DOCUMENTS_DESCRIPTION =
  "Complete documentation, case studies, integration guides, and proof of work for UnifyOne platform.";

const TABS = [
  { id: "overview", label: "Overview", icon: "📋" },
  { id: "case-studies", label: "Case Studies", icon: "📊" },
  { id: "integrations", label: "Integrations", icon: "⚙️" },
  { id: "work-proof", label: "Work Proof", icon: "✓" },
];

const DOC_AREAS = [
  {
    title: "Getting Started",
    description:
      "Start with the architecture, platform orientation, and the fastest path to exploring UnifyOne's docs surface.",
    href: "/docs/getting-started",
    Icon: BookOpen,
    badge: "Quickstart",
  },
  {
    title: "Integration Guides",
    description:
      "Review setup patterns for commerce, automation, and AI integrations spanning payments, workflows, and messaging.",
    href: "/docs/integration-guides",
    Icon: Plug,
    badge: "Platform",
  },
  {
    title: "API Reference",
    description:
      "Download the Postman collection covering auth, payments, admin flows, and the core REST endpoints exposed by UnifyOne.",
    href: "/api/postman/collection.json",
    Icon: Code2,
    badge: "Download",
    download: true,
  },
  {
    title: "Case Studies",
    description:
      "See how operators scale revenue, automate fulfillment, and launch tenant portfolios using the UnifyOne control plane.",
    href: "/docs/case-studies",
    Icon: BarChart2,
    badge: "Stories",
  },
  {
    title: "Architecture",
    description:
      "Dive into the Cathedral Principle, multi-tenant patterns, and the systems thinking behind UnifyOne's product design.",
    href: "/architecture",
    Icon: Layers,
    badge: "Systems",
  },
] as const;

export default function Documents() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <PublicLayout>
      <PageHead
        title="Documentation | UnifyOne"
        description={DOCUMENTS_DESCRIPTION}
        canonical={DOCUMENTS_CANONICAL}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "UnifyOne Documentation",
            description: DOCUMENTS_DESCRIPTION,
            url: DOCUMENTS_CANONICAL,
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: SITE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Documentation",
                  item: DOCUMENTS_CANONICAL,
                },
              ],
            },
          },
        ]}
      />

      <section
        style={{
          backgroundColor: "#020202",
          minHeight: "100vh",
          paddingTop: "6rem",
          paddingBottom: "4rem",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="inscription block mb-4">DOCUMENTATION</span>
            <h1
              className="font-cinzel text-4xl sm:text-5xl font-bold mb-6"
              style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
            >
              The Cathedral Documented
            </h1>
            <p
              className="font-crimson text-lg max-w-2xl mx-auto"
              style={{ color: "#9A9A9A", lineHeight: 1.8 }}
            >
              Complete technical documentation, case studies, integration
              guides, and proof of work for the UnifyOne platform.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 sm:gap-4 mb-12 justify-center">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "12px 24px",
                  backgroundColor:
                    activeTab === tab.id
                      ? "rgba(212,168,67,0.15)"
                      : "rgba(212,168,67,0.05)",
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
          <div
            style={{
              backgroundColor: "rgba(212,168,67,0.02)",
              border: "1px solid rgba(212,168,67,0.1)",
              padding: "3rem",
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
                  className="space-y-6 font-crimson text-base"
                  style={{ color: "#C0C0C0", lineHeight: 1.8 }}
                >
                  <p>
                    UnifyOne is a multi-tenant commerce platform engineered with
                    the Cathedral Principle — sequential, structural
                    construction that prioritizes foundational strength before
                    scaling traffic. This documentation covers the complete
                    architecture, integration patterns, and proof of work across
                    36 development phases.
                  </p>
                  <p>
                    The platform combines{" "}
                    <strong style={{ color: "#D4A843" }}>
                      Kai AI integration
                    </strong>{" "}
                    for intelligent task automation,{" "}
                    <strong style={{ color: "#D4A843" }}>
                      multi-tenant isolation
                    </strong>{" "}
                    for SaaS scalability, and{" "}
                    <strong style={{ color: "#D4A843" }}>
                      payment infrastructure
                    </strong>{" "}
                    (Stripe, PayPal, Shopify) for global commerce.
                  </p>
                  <p>
                    Navigate to the sections below to explore detailed case
                    studies, integration guides, and the complete work proof
                    timeline.
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
                    {TABS.filter(t => t.id !== "overview").map(tab => (
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

                  <div className="mt-12">
                    <h3
                      className="font-cinzel text-lg font-bold mb-6"
                      style={{ color: "#D4A843", letterSpacing: "0.05em" }}
                    >
                      EXPLORE DOCUMENTATION
                    </h3>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                      {DOC_AREAS.map(area => {
                        const { Icon, badge, description, href, title } = area;
                        const download =
                          "download" in area ? area.download : false;
                        const cardContent = (
                          <Card className="h-full border-[#d4a84333] bg-[#0d0d0d] text-left transition-colors hover:border-[#d4a84366] hover:bg-[#131313]">
                            <CardHeader className="space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#d4a84355] bg-[#d4a84314] text-[#D4A843]">
                                  <Icon className="h-5 w-5" />
                                </div>
                                <Badge
                                  variant="outline"
                                  className="border-[#d4a84344] text-[#D4A843]"
                                >
                                  {badge}
                                </Badge>
                              </div>
                              <CardTitle
                                className="font-cinzel text-lg"
                                style={{
                                  color: "#F0E8D0",
                                  letterSpacing: "0.03em",
                                }}
                              >
                                {title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="flex h-full flex-col justify-between gap-6">
                              <p
                                className="font-crimson text-sm"
                                style={{ color: "#A0A0A0", lineHeight: 1.7 }}
                              >
                                {description}
                              </p>
                              <Button
                                asChild
                                variant="link"
                                className="h-auto justify-start px-0 font-cinzel text-xs font-semibold tracking-[0.12em] text-[#D4A843]"
                              >
                                <span>
                                  Read <ArrowRight className="h-4 w-4" />
                                </span>
                              </Button>
                            </CardContent>
                          </Card>
                        );

                        if (download) {
                          return (
                            <a
                              key={title}
                              href={href}
                              download
                              className="block h-full"
                            >
                              {cardContent}
                            </a>
                          );
                        }

                        return (
                          <Link key={title} href={href}>
                            <a className="block h-full">{cardContent}</a>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "case-studies" && (
              <div>
                <h2
                  className="font-cinzel text-2xl font-bold mb-6"
                  style={{ color: "#D4A843" }}
                >
                  Case Studies
                </h2>
                <p
                  className="font-crimson text-base mb-8"
                  style={{ color: "#C0C0C0", lineHeight: 1.8 }}
                >
                  Detailed technical deep-dives into major platform features,
                  architectural decisions, and integrations.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {[
                    {
                      icon: "🏛️",
                      title: "Cathedral Framework",
                      subtitle: "Design System Architecture",
                      href: "/documents/case-studies#cathedral-framework",
                    },
                    {
                      icon: "🤖",
                      title: "Kai AI Integration",
                      subtitle: "Context-Aware Copilot",
                      href: "/documents/case-studies#kai-ai-integration",
                    },
                    {
                      icon: "🏢",
                      title: "Multi-Tenant Commerce",
                      subtitle: "Isolation & Scale",
                      href: "/documents/case-studies#multi-tenant-commerce",
                    },
                    {
                      icon: "💳",
                      title: "Stripe → Meta CAPI Bridge",
                      subtitle: "Transactions to Algorithm",
                      href: "/documents/case-studies#stripe-capi-bridge",
                    },
                    {
                      icon: "🎞️",
                      title: "Scroll-Triggered Reveals",
                      subtitle: "Performance-First Animation",
                      href: "/documents/case-studies#scroll-reveals",
                    },
                  ].map(item => (
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
                        <span style={{ fontSize: "1.75rem", flexShrink: 0 }}>
                          {item.icon}
                        </span>
                        <div>
                          <div
                            className="font-cinzel text-sm font-bold"
                            style={{ letterSpacing: "0.05em" }}
                          >
                            {item.title}
                          </div>
                          <div
                            className="font-crimson text-xs mt-1"
                            style={{ color: "#7A7A7A" }}
                          >
                            {item.subtitle}
                          </div>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
                <Link href="/documents/case-studies">
                  <a
                    style={{
                      color: "#D4A843",
                      textDecoration: "underline",
                      fontFamily: "'Cinzel', serif",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    View all case studies →
                  </a>
                </Link>
              </div>
            )}

            {activeTab === "integrations" && (
              <div>
                <h2
                  className="font-cinzel text-2xl font-bold mb-6"
                  style={{ color: "#D4A843" }}
                >
                  Integration Guides
                </h2>
                <p
                  className="font-crimson text-base mb-8"
                  style={{ color: "#C0C0C0", lineHeight: 1.8 }}
                >
                  Complete step-by-step integration guides for Kai, Claude MCP,
                  n8n automation, and payment processors.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {[
                    {
                      icon: "⚙️",
                      title: "API Setup",
                      subtitle: "Configure credentials & environment",
                      href: "/documents/integrations#setup",
                    },
                    {
                      icon: "🔌",
                      title: "MCP Server (Live)",
                      subtitle: "Claude Desktop integration",
                      href: "/documents/integrations#mcp",
                    },
                    {
                      icon: "🪝",
                      title: "Webhooks",
                      subtitle: "Task completion event handling",
                      href: "/documents/integrations#webhook",
                    },
                    {
                      icon: "🔄",
                      title: "n8n Bridge",
                      subtitle: "Automate via n8n workflows",
                      href: "/documents/integrations#n8n",
                    },
                    {
                      icon: "📋",
                      title: "Task Patterns",
                      subtitle: "Research, audits & provisioning",
                      href: "/documents/integrations#tasks",
                    },
                    {
                      icon: "✅",
                      title: "Implementation Checklist",
                      subtitle: "Track your integration progress",
                      href: "/documents/integrations#checklist",
                    },
                  ].map(item => (
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
                        <span style={{ fontSize: "1.75rem", flexShrink: 0 }}>
                          {item.icon}
                        </span>
                        <div>
                          <div
                            className="font-cinzel text-sm font-bold"
                            style={{ letterSpacing: "0.05em" }}
                          >
                            {item.title}
                          </div>
                          <div
                            className="font-crimson text-xs mt-1"
                            style={{ color: "#7A7A7A" }}
                          >
                            {item.subtitle}
                          </div>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
                <Link href="/documents/integrations">
                  <a
                    style={{
                      color: "#D4A843",
                      textDecoration: "underline",
                      fontFamily: "'Cinzel', serif",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    View integration guides →
                  </a>
                </Link>
              </div>
            )}

            {activeTab === "work-proof" && (
              <div>
                <h2
                  className="font-cinzel text-2xl font-bold mb-6"
                  style={{ color: "#D4A843" }}
                >
                  Work Proof
                </h2>
                <p
                  className="font-crimson text-base mb-8"
                  style={{ color: "#C0C0C0", lineHeight: 1.8 }}
                >
                  Complete timeline of 25+ development phases, deliverables, and
                  technical achievements spanning the full UnifyOne platform
                  build.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: "🏗️", label: "Phases", value: "25+" },
                    { icon: "🧪", label: "Tests Passing", value: "100+" },
                    { icon: "📦", label: "Schema Tables", value: "40+" },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      style={{
                        padding: "1.5rem",
                        backgroundColor: "rgba(212,168,67,0.05)",
                        border: "1px solid rgba(212,168,67,0.15)",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                        {stat.icon}
                      </div>
                      <div
                        className="font-cinzel text-2xl font-bold"
                        style={{ color: "#D4A843" }}
                      >
                        {stat.value}
                      </div>
                      <div
                        className="font-crimson text-sm mt-1"
                        style={{ color: "#7A7A7A" }}
                      >
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 mb-8">
                  {[
                    "Multi-tenant commerce platform (products, orders, customers)",
                    "Stripe, PayPal & Shopify payment rails",
                    "Kai AI integration with context-aware copilot",
                    "Social commerce: friends, challenges, gamification",
                    "Governance dashboard with audit logs & kill switches",
                    "Theme store marketplace with Stripe fulfillment",
                    "Affiliate hub, revenue streams, rewards keys",
                    "Mobile automation scheduling with n8n bridge",
                  ].map(item => (
                    <div
                      key={item}
                      className="flex items-start gap-3 font-crimson text-sm"
                      style={{ color: "#A0A0A0" }}
                    >
                      <span style={{ color: "#D4A843", flexShrink: 0 }}>✓</span>
                      {item}
                    </div>
                  ))}
                </div>
                <Link href="/documents/work-proof">
                  <a
                    style={{
                      color: "#D4A843",
                      textDecoration: "underline",
                      fontFamily: "'Cinzel', serif",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
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
