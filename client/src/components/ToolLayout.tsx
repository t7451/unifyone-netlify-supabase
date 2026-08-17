import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import ToolEmailCapture from "@/components/ToolEmailCapture";
import PartnerOffers from "@/components/PartnerOffers";
import AdSlot from "@/components/AdSlot";

interface ToolLayoutProps {
  /** Short name shown in the sticky nav bar. */
  toolName: string;
  /** Last breadcrumb segment (current page label). */
  breadcrumb: string;
  children: ReactNode;
  /**
   * Map-first tools (RoutePulse): on phones, drop breadcrumbs, vertical
   * padding, ads, email capture, and related-tools so the map owns the screen.
   */
  immersiveMobile?: boolean;
}

/** Registry of the live free tools, used to cross-link siblings. */
const ALL_TOOLS = [
  {
    slug: "mileage-deduction-calculator",
    label: "Mileage & Deduction Calculator",
  },
  { slug: "quarterly-tax-estimator", label: "Quarterly Tax Estimator" },
  { slug: "earnings-consolidator", label: "Earnings Consolidator" },
  { slug: "reseller-break-even", label: "Reseller Break-Even Calculator" },
  { slug: "cashflow-tracker", label: "Payout & Cash-Flow Tracker" },
  { slug: "se-tax-calculator", label: "Self-Employment Tax Calculator" },
  { slug: "gig-hourly-rate", label: "Real Hourly Rate Calculator" },
  { slug: "tax-set-aside", label: "Tax Set-Aside Calculator" },
  { slug: "route-pulse", label: "RoutePulse" },
];

/** Shared structural wrapper for all /tools/<slug> pages. */
export default function ToolLayout({
  toolName,
  breadcrumb,
  children,
  immersiveMobile = false,
}: ToolLayoutProps) {
  const [location] = useLocation();
  const currentSlug = location.split("/").filter(Boolean).pop() ?? "";
  const idx = ALL_TOOLS.findIndex(tool => tool.slug === currentSlug);
  // Show three sibling tools, rotating so each page surfaces a different set.
  const related =
    idx === -1
      ? ALL_TOOLS.slice(0, 3)
      : [1, 2, 3].map(offset => ALL_TOOLS[(idx + offset) % ALL_TOOLS.length]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav
        className={`border-b bg-background/95 backdrop-blur sticky top-0 z-10 ${
          immersiveMobile
            ? "h-11 sm:h-auto pt-[env(safe-area-inset-top)]"
            : ""
        }`}
      >
        <div
          className={`mx-auto flex items-center gap-4 ${
            immersiveMobile
              ? "max-w-3xl px-3 h-11 sm:px-6 sm:h-14"
              : "max-w-3xl px-6 h-14"
          }`}
        >
          <Link
            href="/tools"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            ← Free Tools
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-medium truncate">{toolName}</span>
        </div>
      </nav>

      <main
        className={
          immersiveMobile
            ? "max-w-3xl mx-auto px-0 py-0 sm:px-6 sm:py-12"
            : "max-w-3xl mx-auto px-6 py-12"
        }
      >
        <nav
          aria-label="breadcrumb"
          className={immersiveMobile ? "mb-6 hidden sm:block" : "mb-6"}
        >
          <ol className="flex items-center gap-2 text-xs text-muted-foreground">
            <li>
              <Link
                href="/"
                className="hover:text-foreground transition-colors"
              >
                Home
              </Link>
            </li>
            <li>›</li>
            <li>
              <Link
                href="/tools"
                className="hover:text-foreground transition-colors"
              >
                Free Tools
              </Link>
            </li>
            <li>›</li>
            <li className="text-foreground">{breadcrumb}</li>
          </ol>
        </nav>
        {children}

        <div className={immersiveMobile ? "hidden sm:block" : undefined}>
        {/* Display ad -- no-op until an ad network is enabled via env. */}
        <AdSlot slotId="tool-below-result" label="Advertisement" />

        {/* Contextual, disclosed partner offers matched to this tool. */}
        <PartnerOffers toolSlug={currentSlug} />

        {/* Lead capture -- turn high-intent tool traffic into an owned email
            list. Tagged per-tool so leads can be segmented downstream. */}
        <ToolEmailCapture source={`tool:${currentSlug || "unknown"}`} />

        {/* Related tools — internal links so each calculator is a hub, not a dead end. */}
        <section className="mt-16 border-t pt-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">
            More free tools
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {related.map(tool => (
              <li key={tool.slug}>
                <Link
                  href={`/tools/${tool.slug}`}
                  className="block rounded-lg border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {tool.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/tools"
            className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all free tools →
          </Link>
        </section>

        {/* Gig worker guides — backlink each calculator into the gig-tax cluster. */}
        <section className="mt-10 border-t pt-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">
            Gig worker guides
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { href: "/gig-taxes", label: "Gig Worker Taxes: complete guide" },
              {
                href: "/gig-worker-tax-deductions",
                label: "Tax deductions checklist",
              },
              {
                href: "/gig-quarterly-taxes",
                label: "Quarterly estimated taxes",
              },
              {
                href: "/1099-nec-vs-1099-k",
                label: "1099-NEC vs 1099-K explained",
              },
            ].map(guide => (
              <li key={guide.href}>
                <Link
                  href={guide.href}
                  className="block rounded-lg border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {guide.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/gig-taxes"
            className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            All gig worker tax guides →
          </Link>
        </section>
        </div>
      </main>
    </div>
  );
}
