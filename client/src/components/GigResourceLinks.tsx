import { Link, useLocation } from "wouter";

const GEO_GUIDES = [
  { path: "/gig-income-aggregator", label: "Consolidate gig income" },
  { path: "/1099-tax-management", label: "1099 tax management" },
  { path: "/gig-earnings-optimizer", label: "Optimize gig earnings" },
  {
    path: "/financial-intelligence-gig-workers",
    label: "Financial intelligence for gig workers",
  },
  { path: "/gig-route-intelligence", label: "Gig route intelligence" },
];

const KEY_TOOLS = [
  { path: "/tools/earnings-consolidator", label: "Earnings Consolidator" },
  { path: "/tools/gig-hourly-rate", label: "Real Hourly Rate Calculator" },
  { path: "/tools/quarterly-tax-estimator", label: "Quarterly Tax Estimator" },
  { path: "/tools/tax-set-aside", label: "Tax Set-Aside Calculator" },
];

/**
 * Cross-link block appended to the gig (GEO) landing pages so each one links
 * out to the relevant free calculators and the sibling guides — turning the
 * standalone landing pages into connected hubs for users and crawlers.
 */
export default function GigResourceLinks() {
  const [location] = useLocation();
  const guides = GEO_GUIDES.filter(guide => guide.path !== location);

  return (
    <section className="border-t bg-muted/20 px-6 py-12 text-foreground">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-6 text-xl font-semibold">Keep going</h2>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              Free calculators
            </h3>
            <ul className="space-y-2">
              {KEY_TOOLS.map(tool => (
                <li key={tool.path}>
                  <Link
                    href={tool.path}
                    className="text-sm transition-colors hover:text-primary"
                  >
                    {tool.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/tools"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  All free tools →
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              More gig guides
            </h3>
            <ul className="space-y-2">
              {guides.map(guide => (
                <li key={guide.path}>
                  <Link
                    href={guide.path}
                    className="text-sm transition-colors hover:text-primary"
                  >
                    {guide.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/seo"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Browse all guides →
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
