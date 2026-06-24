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
  "Documentation, guides, and build proof for UnifyOne — the earnings and tax app for gig workers. Earnings tracking, IRS mileage, and quarterly tax estimates.";

const TABS = [
  { id: "overview", label: "Overview", icon: "📋" },
  { id: "case-studies", label: "Guides", icon: "📊" },
  { id: "integrations", label: "Tax & Mileage", icon: "⚙️" },
  { id: "work-proof", label: "Build Proof", icon: "✓" },
];

const DOC_AREAS = [
  {
    title: "Getting Started",
    description:
      "Connect your gig income, see your real take-home, and set up earnings tracking in minutes — the fastest path to your first tax estimate.",
    href: "/docs/getting-started",
    Icon: BookOpen,
    badge: "Quickstart",
  },
  {
    title: "Tax Autopilot Guide",
    description:
      "How UnifyOne tracks IRS standard-mileage deductions and projects your quarterly estimated taxes so nothing sneaks up at filing time.",
    href: "/docs/integration-guides",
    Icon: Plug,
    badge: "Taxes",
  },
  {
    title: "API Reference",
    description:
      "Download the Postman collection covering auth, earnings imports, and the core endpoints that power your UnifyOne account.",
    href: "/api/postman/collection.json",
    Icon: Code2,
    badge: "Download",
    download: true,
  },
  {
    title: "Earnings & Mileage Tracking",
    description:
      "See how GigIQ and Money Manager turn raw payouts and trips into clean records you can act on across every gig platform.",
    href: "/docs/case-studies",
    Icon: BarChart2,
    badge: "Guides",
  },
  {
    title: "How It Works",
    description:
      "The thinking behind UnifyOne — built so independent workers keep more of what they earn and stay ready for tax season.",
    href: "/architecture",
    Icon: Layers,
    badge: "Overview",
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
              UnifyOne Documentation
            </h1>
            <p
              className="font-crimson text-lg max-w-2xl mx-auto"
              style={{ color: "#9A9A9A", lineHeight: 1.8 }}
            >
              Guides, walkthroughs, and build proof for UnifyOne — the earnings
              and tax app that helps gig workers track income, log IRS mileage,
              and stay ahead of quarterly taxes.
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
                    UnifyOne is the earnings and tax app built for gig workers —
                    drivers, couriers, and freelancers who need to know their
                    real take-home and stay ready for tax season. This
                    documentation covers setup, day-to-day tracking, and the
                    build proof behind the product.
                  </p>
                  <p>
                    UnifyOne brings together{" "}
                    <strong style={{ color: "#D4A843" }}>GigIQ</strong> for
                    earnings insights across every platform,{" "}
                    <strong style={{ color: "#D4A843" }}>Tax Autopilot</strong>{" "}
                    for IRS standard-mileage deductions and quarterly estimated
                    taxes, and{" "}
                    <strong style={{ color: "#D4A843" }}>Money Manager</strong>{" "}
                    to keep income, expenses, and set-aside in one place. Kai,
                    your assistant, and other AI tools roll out as they ship.
                  </p>
                  <p>
                    Navigate to the sections below to explore the earnings and
                    mileage guides, the tax walkthrough, and the complete build
                    proof timeline.
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
                        📦 Gig Worker Resources
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
                  Guides
                </h2>
                <p
                  className="font-crimson text-base mb-8"
                  style={{ color: "#C0C0C0", lineHeight: 1.8 }}
                >
                  Practical walkthroughs for tracking your earnings, claiming
                  mileage, and getting ahead of quarterly taxes.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {[
                    {
                      icon: "📊",
                      title: "GigIQ Earnings Insights",
                      subtitle: "See Your Real Take-Home",
                      href: "/documents/case-studies#gigiq-earnings",
                    },
                    {
                      icon: "🤖",
                      title: "Meet Kai",
                      subtitle: "Your Assistant (Coming Soon)",
                      href: "/documents/case-studies#kai-assistant",
                    },
                    {
                      icon: "🚗",
                      title: "IRS Mileage Tracking",
                      subtitle: "Standard-Mileage Deductions",
                      href: "/documents/case-studies#irs-mileage",
                    },
                    {
                      icon: "🧾",
                      title: "Quarterly Estimated Taxes",
                      subtitle: "No Surprises at Filing",
                      href: "/documents/case-studies#quarterly-taxes",
                    },
                    {
                      icon: "💰",
                      title: "Money Manager Setup",
                      subtitle: "Income, Expenses & Set-Aside",
                      href: "/documents/case-studies#money-manager",
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
                    View all guides →
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
                  Tax & Mileage
                </h2>
                <p
                  className="font-crimson text-base mb-8"
                  style={{ color: "#C0C0C0", lineHeight: 1.8 }}
                >
                  Step-by-step help for IRS mileage, quarterly estimated taxes,
                  and keeping your records ready for filing.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {[
                    {
                      icon: "🔗",
                      title: "Connect Your Earnings",
                      subtitle: "Import payouts from your gig apps",
                      href: "/documents/integrations#setup",
                    },
                    {
                      icon: "🚗",
                      title: "Log IRS Mileage",
                      subtitle: "Standard-mileage deduction tracking",
                      href: "/documents/integrations#mileage",
                    },
                    {
                      icon: "🧾",
                      title: "Quarterly Tax Estimates",
                      subtitle: "Project what to set aside",
                      href: "/documents/integrations#quarterly",
                    },
                    {
                      icon: "💰",
                      title: "Money Manager",
                      subtitle: "Income, expenses & set-aside",
                      href: "/documents/integrations#money-manager",
                    },
                    {
                      icon: "📊",
                      title: "GigIQ Insights",
                      subtitle: "Compare pay across platforms",
                      href: "/documents/integrations#gigiq",
                    },
                    {
                      icon: "✅",
                      title: "Tax-Season Checklist",
                      subtitle: "Get filing-ready in minutes",
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
                    View tax & mileage guides →
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
                  Build Proof
                </h2>
                <p
                  className="font-crimson text-base mb-8"
                  style={{ color: "#C0C0C0", lineHeight: 1.8 }}
                >
                  Complete timeline of 25+ build phases, deliverables, and
                  shipped capabilities behind UnifyOne — the earnings and tax
                  app for gig workers.
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
                    "Earnings tracking across gig platforms (income, payouts, trips)",
                    "Tax Autopilot: IRS standard-mileage deductions",
                    "Quarterly estimated-tax projections",
                    "GigIQ earnings insights and pay comparisons",
                    "Money Manager: income, expenses & automatic set-aside",
                    "Kai assistant and AI tools shipping as they're ready",
                    "Free and Pro ($4.99) plans",
                    "Secure account, data export, and filing-ready records",
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
                    View build proof timeline →
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
