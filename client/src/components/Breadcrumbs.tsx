import { Link, useLocation } from "wouter";

/**
 * Friendly labels for known path segments. Unknown slugs (e.g. individual
 * /seo/:slug or /blog/:slug pages) fall back to a title-cased version of the
 * slug, so every route gets a sensible breadcrumb without per-page wiring.
 */
const SEGMENT_LABELS: Record<string, string> = {
  architecture: "Architecture",
  "the-system": "The System",
  tithes: "Tithes",
  pricing: "Pricing",
  tools: "Free Tools",
  blog: "Blog",
  documents: "Documents",
  "case-studies": "Case Studies",
  integrations: "Integrations",
  "work-proof": "Work Proof",
  about: "About",
  contact: "Contact",
  resources: "Resources",
  privacy: "Privacy",
  terms: "Terms",
  themes: "Theme Store",
  "docs-chat": "Docs Chat",
  sovereign: "Sovereign",
  seo: "Guides",
  press: "Media Kit",
  register: "Register",
  login: "Sign In",
  "gig-income-aggregator": "Gig Income Aggregator",
  "1099-tax-management": "1099 Tax Management",
  "gig-earnings-optimizer": "Gig Earnings Optimizer",
  "financial-intelligence-gig-workers":
    "Financial Intelligence for Gig Workers",
  "gig-route-intelligence": "Gig Route Intelligence",
};

/** Tokens that need explicit casing rather than naive title-casing. */
const TOKEN_CASING: Record<string, string> = {
  ai: "AI",
  saas: "SaaS",
  seo: "SEO",
  geo: "GEO",
  faq: "FAQ",
  irs: "IRS",
  crm: "CRM",
  api: "API",
  vs: "vs",
  pnw: "PNW",
  unifyone: "UnifyOne",
  "1commerce": "1Commerce",
  onecommerce: "OneCommerce",
};

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map(word => {
      if (!word) return word;
      const lower = word.toLowerCase();
      if (lower in TOKEN_CASING) return TOKEN_CASING[lower];
      return word[0].toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function labelFor(segment: string): string {
  return SEGMENT_LABELS[segment] ?? titleCase(segment);
}

const CRUMB_STYLE = {
  fontFamily: "Cinzel, serif",
  fontSize: "0.6rem",
  fontWeight: 600,
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
};

function CrumbLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <span
        className="cursor-pointer transition-colors duration-200"
        style={{ ...CRUMB_STYLE, color: "#5A5A5A" }}
        onMouseEnter={e =>
          ((e.currentTarget as HTMLElement).style.color = "#D4A843")
        }
        onMouseLeave={e =>
          ((e.currentTarget as HTMLElement).style.color = "#5A5A5A")
        }
      >
        {label}
      </span>
    </Link>
  );
}

/**
 * Visible breadcrumb trail derived from the current path. Renders nothing on
 * the home route. Mirrors the per-page JSON-LD BreadcrumbList so users and
 * crawlers see the same hierarchy. Intermediate crumbs link to real parent
 * routes (e.g. /tools, /blog, /seo, /documents); the current page is plain
 * text with aria-current. Top padding clears the fixed h-16 navigation.
 */
export default function Breadcrumbs() {
  const [location] = useLocation();
  const path = location.split("?")[0].split("#")[0];
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="max-w-7xl mx-auto px-6 sm:px-8"
      style={{ paddingTop: "4.75rem", paddingBottom: "0.25rem" }}
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <CrumbLink href="/" label="Home" />
        </li>
        {segments.map((segment, i) => {
          const href = "/" + segments.slice(0, i + 1).join("/");
          const isLast = i === segments.length - 1;
          return (
            <li key={href} className="flex items-center gap-x-2">
              <span
                aria-hidden="true"
                style={{ color: "#3A3A3A", fontSize: "0.6rem" }}
              >
                /
              </span>
              {isLast ? (
                <span
                  aria-current="page"
                  style={{ ...CRUMB_STYLE, color: "#D4A843" }}
                >
                  {labelFor(segment)}
                </span>
              ) : (
                <CrumbLink href={href} label={labelFor(segment)} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
