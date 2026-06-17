import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";

interface ToolLayoutProps {
  /** Short name shown in the sticky nav bar. */
  toolName: string;
  /** Last breadcrumb segment (current page label). */
  breadcrumb: string;
  children: ReactNode;
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
];

/** Shared structural wrapper for all /tools/<slug> pages. */
export default function ToolLayout({
  toolName,
  breadcrumb,
  children,
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
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
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

      <main className="max-w-3xl mx-auto px-6 py-12">
        <nav aria-label="breadcrumb" className="mb-6">
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
      </main>
    </div>
  );
}
