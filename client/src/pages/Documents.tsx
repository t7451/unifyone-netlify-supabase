import "@/components/reading.css";
import { useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import { SITE_URL } from "@/lib/siteConfig";

const DESCRIPTION =
  "Start with UnifyOne's free tools and practical guides, then explore workflow examples, technical references, and the project history.";
const GROUPS = [
  {
    title: "Start with your records",
    text: "You can use the public tools without connecting an account.",
    links: [
      {
        title: "Understand the workflow",
        text: "A short introduction to recording your work and reviewing your week.",
        href: "/the-system",
      },
      {
        title: "Try a free calculator",
        text: "Compare earnings, estimate mileage deductions, or plan a tax set-aside.",
        href: "/tools",
      },
      {
        title: "Browse money and tax guides",
        text: "Read about bookkeeping, irregular income, and tax planning.",
        href: "/resources",
      },
    ],
  },
  {
    title: "Go a little deeper",
    text: "Examples and references for a closer look at the product.",
    links: [
      {
        title: "Workflow examples",
        text: "Illustrative ways to use your own earnings and expense records.",
        href: "/documents/case-studies",
      },
      {
        title: "How the platform is built",
        text: "An overview of the application, data stores, and account boundaries.",
        href: "/architecture",
      },
      {
        title: "Technical integration reference",
        text: "Developer configuration examples for APIs, MCP, and webhooks.",
        href: "/documents/integrations",
      },
      {
        title: "Project history",
        text: "The recorded development plan and links to the repository history.",
        href: "/documents/work-proof",
      },
    ],
  },
];
export default function Documents() {
  const [search, setSearch] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const query = search.trim().toLowerCase();
  const groups = GROUPS.map(group => ({
    ...group,
    links: group.links.filter(item =>
      [item.title, item.text, group.title]
        .join(" ")
        .toLowerCase()
        .includes(query)
    ),
  })).filter(group => group.links.length);
  const total = GROUPS.reduce((count, group) => count + group.links.length, 0);
  const count = groups.reduce((count, group) => count + group.links.length, 0);
  function clearSearch() {
    setSearch("");
    searchInput.current?.focus();
  }
  return (
    <PublicLayout>
      <PageHead
        title="Documentation | UnifyOne"
        description={DESCRIPTION}
        canonical={SITE_URL + "/documents"}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "UnifyOne documentation",
            description: DESCRIPTION,
            url: SITE_URL + "/documents",
          },
        ]}
      />
      <div className="marketing-page marketing-reference-hub">
        <header className="marketing-container marketing-page-heading">
          <span className="marketing-eyebrow">Documentation</span>
          <h1>A useful place to start.</h1>
          <p className="marketing-lead">
            Find your next step, whether you're comparing a week's earnings or
            exploring how UnifyOne is built.
          </p>
        </header>
        <div className="marketing-container marketing-library">
          <div className="marketing-library-controls">
            <label className="marketing-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search documentation</span>
              <input
                ref={searchInput}
                type="search"
                aria-controls="document-results"
                value={search}
                onChange={event => setSearch(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    clearSearch();
                  }
                }}
                placeholder="Search workflows, integrations, guides…"
              />
            </label>
            {search && (
              <button
                type="button"
                className="marketing-button marketing-button-outline"
                onClick={clearSearch}
              >
                Clear search
              </button>
            )}
          </div>
          <p
            className="marketing-result-count"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {count} {count === 1 ? "reference" : "references"} of {total}
          </p>
          <div id="document-results">
            {!count && (
              <div className="marketing-empty">
                <h2>No matching references.</h2>
                <p>
                  Try another phrase or clear your search to browse the
                  documentation.
                </p>
              </div>
            )}
            {groups.map(group => (
              <section key={group.title} className="reference-group">
                <h2>{group.title}</h2>
                <p>{group.text}</p>
                <div className="marketing-tool-grid">
                  {group.links.map(item => (
                    <Link
                      className="marketing-tool-card"
                      key={item.href}
                      href={item.href}
                    >
                      <BookOpen size={22} aria-hidden="true" />
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                      <span>
                        Explore <ArrowUpRight size={16} aria-hidden="true" />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <aside className="reference-note">
            <h2>Need help with your account?</h2>
            <p>
              Tell us what you're trying to do and where you're getting stuck.
            </p>
            <Link
              className="marketing-button marketing-button-outline"
              href="/contact"
            >
              Contact support <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}
