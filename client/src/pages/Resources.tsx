import { useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import { SITE_URL } from "@/lib/siteConfig";

const GUIDES = [
  {
    title: "Gig worker taxes",
    category: "Taxes",
    text: "A starting point for income records, deductions, and estimated taxes.",
    href: "/gig-taxes",
  },
  {
    title: "1099-NEC vs. 1099-K",
    category: "Taxes",
    text: "Understand the forms that can arrive after a year of independent work.",
    href: "/1099-nec-vs-1099-k",
  },
  {
    title: "Bookkeeping for gig work",
    category: "Money",
    text: "Build a record of earnings and expenses you can use throughout the year.",
    href: "/gig-worker-bookkeeping",
  },
  {
    title: "Budgeting on irregular income",
    category: "Money",
    text: "Plan your spending when no two paydays look quite the same.",
    href: "/gig-worker-budgeting",
  },
  {
    title: "Building an emergency fund",
    category: "Money",
    text: "Think through a buffer for slow weeks and unexpected expenses.",
    href: "/gig-worker-emergency-fund",
  },
  {
    title: "Retirement for independent workers",
    category: "Money",
    text: "Explore retirement account types and questions to ask a professional.",
    href: "/gig-worker-retirement",
  },
  {
    title: "DoorDash tax guide",
    category: "Taxes",
    text: "Review income records, mileage, and common tax-planning questions.",
    href: "/doordash-taxes",
  },
  {
    title: "Uber driver tax guide",
    category: "Taxes",
    text: "Make sense of driving income, platform statements, and expenses.",
    href: "/uber-driver-taxes",
  },
  {
    title: "How UnifyOne works",
    category: "Getting started",
    text: "See how tracking your work can turn into a useful weekly habit.",
    href: "/the-system",
  },
  {
    title: "Compare your gig income",
    category: "Getting started",
    text: "Bring different income streams together to understand your working week.",
    href: "/gig-income-aggregator",
  },
];
const DESCRIPTION =
  "Practical guides for gig and freelance work: income records, mileage, tax planning, budgeting, and getting started with UnifyOne.";
export default function Resources() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All guides");
  const query = search.trim().toLowerCase();
  const guides = GUIDES.filter(
    guide =>
      (category === "All guides" || guide.category === category) &&
      (guide.title + " " + guide.text).toLowerCase().includes(query)
  );
  return (
    <PublicLayout>
      <PageHead
        title="Guides for independent work | UnifyOne"
        description={DESCRIPTION}
        canonical={SITE_URL + "/resources"}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Guides for independent work",
            description: DESCRIPTION,
            url: SITE_URL + "/resources",
            mainEntity: {
              "@type": "ItemList",
              itemListElement: GUIDES.map((guide, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: guide.title,
                url: SITE_URL + guide.href,
              })),
            },
          },
        ]}
      />
      <div className="marketing-page">
        <header className="marketing-page-heading marketing-container">
          <p className="marketing-eyebrow">The guide library</p>
          <h1>
            Independent work.
            <br />
            <em>A little less guesswork.</em>
          </h1>
          <p className="marketing-lead">
            Practical reading on earnings, mileage, taxes, and the money
            decisions between paydays.
          </p>
        </header>
        <section
          className="marketing-library marketing-container"
          aria-label="Browse guides"
        >
          <div className="marketing-library-controls">
            <label className="marketing-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search guides</span>
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search taxes, budgeting, mileage…"
              />
            </label>
            <div
              className="marketing-filters"
              role="group"
              aria-label="Guide category"
            >
              {["All guides", "Taxes", "Money", "Getting started"].map(item => (
                <button
                  type="button"
                  key={item}
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <p className="marketing-result-count" role="status">
            {guides.length} {guides.length === 1 ? "guide" : "guides"}
          </p>
          {guides.length ? (
            <div className="marketing-tool-grid">
              {guides.map(guide => (
                <Link
                  className="marketing-tool-card"
                  key={guide.href}
                  href={guide.href}
                >
                  <BookOpen size={22} aria-hidden="true" />
                  <span className="marketing-card-category">
                    {guide.category}
                  </span>
                  <h2>{guide.title}</h2>
                  <p>{guide.text}</p>
                  <span>
                    Read guide <ArrowUpRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="marketing-empty">
              <h2>No matching guides yet.</h2>
              <p>Try a different phrase or browse the full library.</p>
              <button
                className="marketing-button marketing-button-outline"
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All guides");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          <p className="marketing-library-note">
            Guides are educational. Tax rules and financial products can change;
            check official sources and get advice for your circumstances.
          </p>
        </section>
        <section className="marketing-closing">
          <div className="marketing-container">
            <p className="marketing-eyebrow">Put a number to it</p>
            <h2>
              Reading is a start.
              <br />
              Try your own numbers.
            </h2>
            <p>
              Explore the public calculators, or tell us what guide would help
              you next.
            </p>
            <div className="marketing-actions">
              <Link href="/tools" className="marketing-button">
                Explore free tools →
              </Link>
              <Link
                href="/contact?topic=custom-resources"
                className="marketing-text-link"
              >
                Suggest a resource →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
