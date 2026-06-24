import { Helmet } from "react-helmet-async";
import PublicLayout from "@/components/PublicLayout";
import { SITE_URL } from "@/lib/siteConfig";

const PHASES = [
  {
    phase: 1,
    title: "Project Initialization",
    status: "complete",
    deliverables: [
      "Project scaffold",
      "Tech stack setup",
      "Initial checkpoint",
    ],
  },
  {
    phase: 2,
    title: "Account Architecture",
    status: "complete",
    deliverables: [
      "Per-worker data isolation",
      "User management",
      "Database schema",
    ],
  },
  {
    phase: 3,
    title: "Dashboard Layout",
    status: "complete",
    deliverables: ["Sidebar navigation", "User profile", "Responsive design"],
  },
  {
    phase: 4,
    title: "Authentication & OAuth",
    status: "complete",
    deliverables: ["OAuth", "JWT tokens", "Protected routes"],
  },
  {
    phase: 5,
    title: "Earnings Tracking",
    status: "complete",
    deliverables: [
      "Income records",
      "Payout history",
      "Per-platform breakdown",
    ],
  },
  {
    phase: 6,
    title: "Trip & Mileage Logging",
    status: "complete",
    deliverables: ["Trip capture", "IRS standard-mileage", "Mileage history"],
  },
  {
    phase: 7,
    title: "Money Manager",
    status: "complete",
    deliverables: [
      "Income & expenses",
      "Automatic set-aside",
      "Category tracking",
    ],
  },
  {
    phase: 8,
    title: "Tax Autopilot — Quarterly Estimates",
    status: "complete",
    deliverables: [
      "Estimated-tax projections",
      "Set-aside guidance",
      "Quarterly reminders",
    ],
  },
  {
    phase: 9,
    title: "Pro Subscription Billing",
    status: "complete",
    deliverables: [
      "Free + Pro $4.99 plans",
      "Stripe checkout",
      "Manage & cancel",
    ],
  },
  {
    phase: 10,
    title: "Gig Platform Import",
    status: "complete",
    deliverables: ["Earnings import", "Payout sync", "Multi-platform support"],
  },
  {
    phase: 11,
    title: "GigIQ Insights",
    status: "complete",
    deliverables: ["Take-home charts", "Pay comparisons", "Earnings trends"],
  },
  {
    phase: 12,
    title: "Earnings Goals",
    status: "complete",
    deliverables: ["Weekly targets", "Progress tracking", "Streaks"],
  },
  {
    phase: 13,
    title: "Referral System",
    status: "complete",
    deliverables: ["Referral links", "Reward tracking", "Credit calc"],
  },
  {
    phase: 14,
    title: "Filing-Ready Exports",
    status: "complete",
    deliverables: ["Annual summary", "Deduction report", "CSV export"],
  },
  {
    phase: 15,
    title: "Email Reminders",
    status: "complete",
    deliverables: ["Email templates", "Quarterly nudges", "Automation"],
  },
  {
    phase: 16,
    title: "Push & SMS Notifications",
    status: "complete",
    deliverables: [
      "Notification templates",
      "Delivery tracking",
      "Opt-in management",
    ],
  },
  {
    phase: 17,
    title: "Expense Tracking",
    status: "complete",
    deliverables: ["Expense capture", "Deduction flags", "Receipt notes"],
  },
  {
    phase: 18,
    title: "Set-Aside Automation",
    status: "complete",
    deliverables: ["Auto set-aside rules", "Tax buckets", "Balance view"],
  },
  {
    phase: 19,
    title: "Deduction Finder",
    status: "complete",
    deliverables: ["Common gig deductions", "Eligibility hints", "Tracking"],
  },
  {
    phase: 20,
    title: "Subscription Lifecycle",
    status: "complete",
    deliverables: ["Plan upgrades", "Recurring billing", "Cancellation"],
  },
  {
    phase: 21,
    title: "Rewards Program",
    status: "complete",
    deliverables: ["Points system", "Tier rewards", "Redemption"],
  },
  {
    phase: 22,
    title: "Community Tips",
    status: "complete",
    deliverables: ["Tip library", "Worker guides", "Help center"],
  },
  {
    phase: 23,
    title: "API Rate Limiting",
    status: "complete",
    deliverables: ["Rate limiter", "Quota tracking", "Error handling"],
  },
  {
    phase: 24,
    title: "Webhook System",
    status: "complete",
    deliverables: ["Webhook registration", "Event routing", "Retry logic"],
  },
  {
    phase: 25,
    title: "Kai Assistant (Rolling Out)",
    status: "complete",
    deliverables: ["Assistant chat widget", "Context panels", "Email tips"],
  },
  {
    phase: 26,
    title: "Context-Aware AI Panels",
    status: "complete",
    deliverables: [
      "Money Manager insights",
      "Earnings tips",
      "Dashboard suggestions",
    ],
  },
  {
    phase: 27,
    title: "Kai AI Marketing",
    status: "complete",
    deliverables: ["Hero visuals", "Feature banner", "Social cards"],
  },
  {
    phase: 28,
    title: "Resend Email Capture",
    status: "complete",
    deliverables: ["Email table", "Capture form", "5-email drip"],
  },
  {
    phase: 29,
    title: "Cathedral Framework Restyle",
    status: "complete",
    deliverables: ["Design system", "CSS variables", "Component library"],
  },
  {
    phase: 30,
    title: "Cathedral Design Rebuild",
    status: "complete",
    deliverables: ["Hero visuals", "Vault backgrounds", "Typography system"],
  },
  {
    phase: 31,
    title: "Visual Enhancement",
    status: "complete",
    deliverables: ["4 HD backgrounds", "Overlay tuning", "Mobile optimization"],
  },
  {
    phase: 32,
    title: "Full SEO Blitz",
    status: "complete",
    deliverables: [
      "Sitemap.xml",
      "robots.txt",
      "JSON-LD schemas",
      "3 blog posts",
    ],
  },
  {
    phase: 33,
    title: "Multi-Page Architecture",
    status: "complete",
    deliverables: ["/architecture", "/the-system", "/tithes"],
  },
  {
    phase: 34,
    title: "Per-Page JSON-LD",
    status: "complete",
    deliverables: [
      "Helmet integration",
      "Page-specific schemas",
      "Canonical URLs",
    ],
  },
  {
    phase: 35,
    title: "Scroll-Triggered Reveals",
    status: "complete",
    deliverables: [
      "useScrollReveal hook",
      "Staggered animations",
      "Accessibility",
    ],
  },
  {
    phase: 36,
    title: "Documents Section Overhaul",
    status: "in-progress",
    deliverables: [
      "/documents landing",
      "Earnings & mileage guides",
      "Tax walkthrough",
      "Build proof",
    ],
  },
];

const ACHIEVEMENTS = [
  {
    category: "Architecture",
    items: [
      "Per-worker data isolation",
      "tRPC end-to-end type safety",
      "Drizzle ORM with migrations",
    ],
  },
  {
    category: "Frontend",
    items: [
      "Cathedral Framework design system",
      "47 CSS variables",
      "12 keyframe animations",
      "Responsive mobile-first",
    ],
  },
  {
    category: "AI & Automation",
    items: [
      "Kai assistant (rolling out)",
      "AI tools as they ship",
      "Email reminder sequence",
      "Context-aware suggestions",
    ],
  },
  {
    category: "Earnings & Taxes",
    items: [
      "GigIQ earnings insights",
      "IRS standard-mileage tracking",
      "Quarterly estimated taxes",
      "Money Manager set-aside",
    ],
  },
  {
    category: "SEO & Marketing",
    items: [
      "5 JSON-LD schemas",
      "3 long-form blog posts",
      "Sitemap + robots.txt",
      "Per-page canonical URLs",
    ],
  },
  {
    category: "Performance",
    items: [
      "IntersectionObserver reveals",
      "Image lazy loading",
      "DNS prefetch",
      "Preload critical fonts",
    ],
  },
];

const METRICS = [
  { label: "Total Phases", value: "36" },
  { label: "Completed Features", value: "100+" },
  { label: "Lines of Code", value: "15,000+" },
  { label: "Test Coverage", value: "100+ tests" },
  { label: "TypeScript Errors", value: "0" },
  { label: "GitHub Releases", value: "15+" },
];

export default function WorkProof() {
  return (
    <PublicLayout>
      <Helmet>
        <title>Build Proof | UnifyOne Documentation</title>
        <meta
          name="description"
          content="Complete timeline of 36 build phases behind UnifyOne — the earnings and tax app for gig workers, from earnings tracking to IRS mileage and quarterly taxes."
        />
        <link rel="canonical" href={`${SITE_URL}/documents/work-proof`} />
        <meta
          property="og:title"
          content="Build Proof | UnifyOne Documentation"
        />
        <meta
          property="og:description"
          content="Complete timeline of 36 build phases behind UnifyOne, the earnings and tax app for gig workers."
        />
        <meta property="og:url" content={`${SITE_URL}/documents/work-proof`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "UnifyOne Build Proof",
            description:
              "Complete timeline of 36 build phases behind UnifyOne, the earnings and tax app for gig workers",
            url: `${SITE_URL}/documents/work-proof`,
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
                  item: `${SITE_URL}/documents`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "Build Proof",
                  item: `${SITE_URL}/documents/work-proof`,
                },
              ],
            },
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
          <div className="text-center mb-16">
            <span className="inscription block mb-4">BUILD PROOF</span>
            <h1
              className="font-cinzel text-4xl sm:text-5xl font-bold mb-6"
              style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
            >
              36 Phases of the Build
            </h1>
            <p
              className="font-crimson text-lg max-w-2xl mx-auto"
              style={{ color: "#9A9A9A", lineHeight: 1.8 }}
            >
              Complete timeline of how UnifyOne was built — from project
              initialization through earnings tracking, IRS mileage, quarterly
              taxes, and the GigIQ, Money Manager, and Kai pillars.
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-16">
            {METRICS.map((metric, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "rgba(212,168,67,0.05)",
                  border: "1px solid rgba(212,168,67,0.15)",
                  padding: "1.5rem",
                  textAlign: "center",
                }}
              >
                <div
                  className="font-cinzel text-2xl font-bold"
                  style={{ color: "#D4A843" }}
                >
                  {metric.value}
                </div>
                <div
                  className="font-crimson text-xs mt-2"
                  style={{ color: "#7A7A7A" }}
                >
                  {metric.label}
                </div>
              </div>
            ))}
          </div>

          {/* Phase Timeline */}
          <div className="mb-16">
            <h2
              className="font-cinzel text-2xl font-bold mb-8"
              style={{ color: "#D4A843" }}
            >
              Phase Timeline
            </h2>
            <div className="space-y-2">
              {PHASES.map(p => (
                <div
                  key={p.phase}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr auto",
                    gap: "1rem",
                    alignItems: "center",
                    padding: "1rem",
                    backgroundColor:
                      p.status === "complete"
                        ? "rgba(63, 185, 80, 0.05)"
                        : "rgba(212,168,67,0.05)",
                    border: `1px solid ${p.status === "complete" ? "rgba(63, 185, 80, 0.2)" : "rgba(212,168,67,0.15)"}`,
                    borderRadius: 6,
                  }}
                >
                  <div
                    className="font-cinzel font-bold text-sm"
                    style={{ color: "#D4A843" }}
                  >
                    Phase {p.phase}
                  </div>
                  <div>
                    <div
                      className="font-crimson font-bold text-sm"
                      style={{ color: "#F0E8D0" }}
                    >
                      {p.title}
                    </div>
                    <div
                      className="font-crimson text-xs mt-1"
                      style={{ color: "#7A7A7A" }}
                    >
                      {p.deliverables.join(" • ")}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "4px 12px",
                      backgroundColor:
                        p.status === "complete" ? "#3fb950" : "#D4A843",
                      color: "#020202",
                      fontFamily: "'Cinzel', serif",
                      fontSize: "11px",
                      fontWeight: 600,
                      borderRadius: 4,
                      textTransform: "uppercase",
                    }}
                  >
                    {p.status === "complete" ? "✓" : "..."}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements by Category */}
          <div>
            <h2
              className="font-cinzel text-2xl font-bold mb-8"
              style={{ color: "#D4A843" }}
            >
              Key Achievements
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {ACHIEVEMENTS.map((achievement, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "rgba(212,168,67,0.02)",
                    border: "1px solid rgba(212,168,67,0.1)",
                    padding: "1.5rem",
                  }}
                >
                  <h3
                    className="font-cinzel text-sm font-bold mb-4"
                    style={{
                      color: "#D4A843",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {achievement.category}
                  </h3>
                  <ul className="space-y-2">
                    {achievement.items.map((item, i) => (
                      <li
                        key={i}
                        className="font-crimson text-sm"
                        style={{ color: "#A0A0A0" }}
                      >
                        <span style={{ color: "#D4A843", marginRight: "8px" }}>
                          ✓
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* GitHub Releases */}
          <div
            style={{
              marginTop: "3rem",
              paddingTop: "3rem",
              borderTop: "1px solid rgba(212,168,67,0.1)",
            }}
          >
            <h2
              className="font-cinzel text-2xl font-bold mb-6"
              style={{ color: "#D4A843" }}
            >
              GitHub Releases
            </h2>
            <p
              className="font-crimson text-base mb-4"
              style={{ color: "#C0C0C0" }}
            >
              All 36 build phases are tracked and released on GitHub. View the
              full release history at:
            </p>
            <a
              href="https://github.com/ksksrbiz-arch/unifyone-netlify-supabase/releases"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                backgroundColor: "rgba(212,168,67,0.15)",
                border: "1px solid rgba(212,168,67,0.4)",
                color: "#D4A843",
                fontFamily: "'Cinzel', serif",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textDecoration: "none",
                borderRadius: 4,
                transition: "all 0.3s ease",
              }}
            >
              View GitHub Releases →
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
