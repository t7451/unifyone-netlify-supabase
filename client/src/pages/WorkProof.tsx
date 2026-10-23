import { Link } from "wouter";
import ReadingLayout from "@/components/ReadingLayout";
import PageHead from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
const PHASES = [
  {
    phase: 1,
    title: "Project Initialization",
    deliverables: [
      "Project scaffold",
      "Tech stack setup",
      "Initial checkpoint",
    ],
  },
  {
    phase: 2,
    title: "Account Architecture",
    deliverables: [
      "Per-worker data isolation",
      "User management",
      "Database schema",
    ],
  },
  {
    phase: 3,
    title: "Dashboard Layout",
    deliverables: ["Sidebar navigation", "User profile", "Responsive design"],
  },
  {
    phase: 4,
    title: "Authentication & OAuth",
    deliverables: ["OAuth", "JWT tokens", "Protected routes"],
  },
  {
    phase: 5,
    title: "Earnings Tracking",
    deliverables: [
      "Income records",
      "Payout history",
      "Per-platform breakdown",
    ],
  },
  {
    phase: 6,
    title: "Trip & Mileage Logging",
    deliverables: ["Trip capture", "IRS standard-mileage", "Mileage history"],
  },
  {
    phase: 7,
    title: "Money Manager",
    deliverables: [
      "Income & expenses",
      "Automatic set-aside",
      "Category tracking",
    ],
  },
  {
    phase: 8,
    title: "Tax Autopilot — Quarterly Estimates",
    deliverables: [
      "Estimated-tax projections",
      "Set-aside guidance",
      "Quarterly reminders",
    ],
  },
  {
    phase: 9,
    title: "Pro Subscription Billing",
    deliverables: [
      "Free + Pro $4.99 plans",
      "Stripe checkout",
      "Manage & cancel",
    ],
  },
  {
    phase: 10,
    title: "Gig Platform Import",
    deliverables: ["Earnings import", "Payout sync", "Multi-platform support"],
  },
  {
    phase: 11,
    title: "GigIQ Insights",
    deliverables: ["Take-home charts", "Pay comparisons", "Earnings trends"],
  },
  {
    phase: 12,
    title: "Earnings Goals",
    deliverables: ["Weekly targets", "Progress tracking", "Streaks"],
  },
  {
    phase: 13,
    title: "Referral System",
    deliverables: ["Referral links", "Reward tracking", "Credit calc"],
  },
  {
    phase: 14,
    title: "Filing-Ready Exports",
    deliverables: ["Annual summary", "Deduction report", "CSV export"],
  },
  {
    phase: 15,
    title: "Email Reminders",
    deliverables: ["Email templates", "Quarterly nudges", "Automation"],
  },
  {
    phase: 16,
    title: "Push & SMS Notifications",
    deliverables: [
      "Notification templates",
      "Delivery tracking",
      "Opt-in management",
    ],
  },
  {
    phase: 17,
    title: "Expense Tracking",
    deliverables: ["Expense capture", "Deduction flags", "Receipt notes"],
  },
  {
    phase: 18,
    title: "Set-Aside Automation",
    deliverables: ["Auto set-aside rules", "Tax buckets", "Balance view"],
  },
  {
    phase: 19,
    title: "Deduction Finder",
    deliverables: ["Common gig deductions", "Eligibility hints", "Tracking"],
  },
  {
    phase: 20,
    title: "Subscription Lifecycle",
    deliverables: ["Plan upgrades", "Recurring billing", "Cancellation"],
  },
  {
    phase: 21,
    title: "Rewards Program",
    deliverables: ["Points system", "Tier rewards", "Redemption"],
  },
  {
    phase: 22,
    title: "Community Tips",
    deliverables: ["Tip library", "Worker guides", "Help center"],
  },
  {
    phase: 23,
    title: "API Rate Limiting",
    deliverables: ["Rate limiter", "Quota tracking", "Error handling"],
  },
  {
    phase: 24,
    title: "Webhook System",
    deliverables: ["Webhook registration", "Event routing", "Retry logic"],
  },
  {
    phase: 25,
    title: "Kai Assistant (Rolling Out)",
    deliverables: ["Assistant chat widget", "Context panels", "Email tips"],
  },
  {
    phase: 26,
    title: "Context-Aware AI Panels",
    deliverables: [
      "Money Manager insights",
      "Earnings tips",
      "Dashboard suggestions",
    ],
  },
  {
    phase: 27,
    title: "Kai AI Marketing",
    deliverables: ["Hero visuals", "Feature banner", "Social cards"],
  },
  {
    phase: 28,
    title: "Resend Email Capture",
    deliverables: ["Email table", "Capture form", "5-email drip"],
  },
  {
    phase: 29,
    title: "Cathedral Framework Restyle",
    deliverables: ["Design system", "CSS variables", "Component library"],
  },
  {
    phase: 30,
    title: "Cathedral Design Rebuild",
    deliverables: ["Hero visuals", "Vault backgrounds", "Typography system"],
  },
  {
    phase: 31,
    title: "Visual Enhancement",
    deliverables: ["4 HD backgrounds", "Overlay tuning", "Mobile optimization"],
  },
  {
    phase: 32,
    title: "Full SEO Blitz",
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
    deliverables: ["/architecture", "/the-system", "/tithes"],
  },
  {
    phase: 34,
    title: "Per-Page JSON-LD",
    deliverables: [
      "Helmet integration",
      "Page-specific schemas",
      "Canonical URLs",
    ],
  },
  {
    phase: 35,
    title: "Scroll-Triggered Reveals",
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

const REPOSITORY = "https://github.com/t7451/unifyone-netlify-supabase";
export default function WorkProof() {
  return (
    <ReadingLayout kind="reference">
      <PageHead
        title="Project history | UnifyOne"
        description="The recorded development phases behind UnifyOne, with links to repository commits and releases. A project history, not a live feature-status report."
        canonical={SITE_URL + "/documents/work-proof"}
      />
      <article className="reading-content">
        <header>
          <span className="marketing-eyebrow">Project history</span>
          <h1>The work behind UnifyOne.</h1>
          <p>
            A record of the development phases described in this project. These
            historical notes are not a current availability checklist, security
            assessment, or test report.
          </p>
        </header>
        <section>
          <h2>Recorded development phases</h2>
          <p>
            Features and names can change after a phase is recorded. Check the
            current product and pricing for the experience available to your
            account.
          </p>
          <ol className="reference-timeline">
            {PHASES.map(phase => (
              <li key={phase.phase}>
                <span className="reference-phase">Phase {phase.phase}</span>
                <div>
                  <h3>{phase.title}</h3>
                  <p>{phase.deliverables.join(" · ")}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2>Follow the source history</h2>
          <p>
            The repository's commits and release notes provide dated records of
            changes. A code change alone does not confirm deployment or
            availability for every account.
          </p>
          <div className="reference-actions">
            <a
              href={REPOSITORY + "/commits/main/"}
              target="_blank"
              rel="noopener noreferrer"
            >
              View commits ↗
            </a>
            <a
              href={REPOSITORY + "/releases"}
              target="_blank"
              rel="noopener noreferrer"
            >
              View releases ↗
            </a>
          </div>
        </section>
        <section>
          <h2>Explore the current product</h2>
          <p>
            Start with the free tools, or review the plans before creating an
            account.
          </p>
          <div className="reference-actions">
            <Link href="/tools">Free tools →</Link>
            <Link href="/pricing">Plans and pricing →</Link>
          </div>
        </section>
      </article>
    </ReadingLayout>
  );
}
