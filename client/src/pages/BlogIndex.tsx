import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import { BLOG_POSTS } from "@/pages/blog/blogPostShared";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/blog`;
const DESCRIPTION =
  "Read UnifyOne essays on gig-worker earnings, mileage and 1099 tax tracking, and AI-assisted shift intelligence for drivers and freelancers.";

const POSTS = [
  {
    href: BLOG_POSTS.gigWorkerShiftIntelligence.href,
    title: "Gig Worker Shift Intelligence",
    description:
      "How GigIQ reads your real shift history to show which hours and zones pay the most after fuel and expenses.",
  },
  {
    href: BLOG_POSTS.gigEcommerce.href,
    title: "Earnings & Taxes for Gig Workers",
    description:
      "How drivers and freelancers track income, automate mileage deductions, and plan for quarterly taxes in one app.",
  },
  {
    href: BLOG_POSTS.multiTenant.href,
    title: "The Architecture Behind UnifyOne",
    description:
      "A look under the hood at the tenant-safe platform that keeps every gig worker's earnings and tax data isolated and secure.",
  },
];

const BLOG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": CANONICAL,
  url: CANONICAL,
  name: "UnifyOne Blog",
  description:
    "Public writing from UnifyOne on gig-worker earnings, 1099 taxes and mileage, and AI-assisted shift intelligence.",
  isPartOf: { "@id": `${SITE_URL}/#website` },
  inLanguage: "en-US",
  publisher: {
    "@type": "Organization",
    name: "1Commerce by 1Commerce LLC",
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.ico` },
  },
  blogPost: POSTS.map((post, index) => ({
    "@type": "BlogPosting",
    position: index + 1,
    headline: post.title,
    url: `${SITE_URL}${post.href}`,
    description: post.description,
  })),
};

const ITEM_LIST_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "UnifyOne Blog posts",
  itemListOrder: "https://schema.org/ItemListOrderAscending",
  numberOfItems: POSTS.length,
  itemListElement: POSTS.map((post, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: post.title,
    url: `${SITE_URL}${post.href}`,
  })),
};

const JSON_LD = [BLOG_JSON_LD, ITEM_LIST_JSON_LD];

export default function BlogIndex() {
  const [search, setSearch] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const posts = POSTS.filter(post =>
    [post.title, post.description]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );
  function clearSearch() {
    setSearch("");
    searchInput.current?.focus();
  }
  return (
    <PublicLayout>
      <PageHead
        title="Notes on independent work | UnifyOne"
        description={DESCRIPTION}
        canonical={CANONICAL}
        jsonLd={JSON_LD}
      />
      <div className="marketing-page">
        <header className="marketing-page-heading marketing-container">
          <p className="marketing-eyebrow">From the UnifyOne notebook</p>
          <h1>
            A closer look at
            <br />
            <em>independent work.</em>
          </h1>
          <p className="marketing-lead">
            Ideas and product notes on earnings, expenses, tax planning, and the
            tools behind a clearer working week.
          </p>
        </header>
        <section
          className="marketing-library marketing-container"
          aria-label="Articles"
        >
          <div className="marketing-library-controls">
            <label className="marketing-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search articles</span>
              <input
                ref={searchInput}
                type="search"
                aria-controls="article-results"
                value={search}
                onChange={event => setSearch(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    clearSearch();
                  }
                }}
                placeholder="Search earnings, taxes, architecture…"
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
            {posts.length} {posts.length === 1 ? "article" : "articles"} of{" "}
            {POSTS.length}
          </p>
          <div
            id="article-results"
            className={posts.length ? "marketing-tool-grid" : "marketing-empty"}
          >
            {!posts.length && (
              <>
                <h2>No matching articles.</h2>
                <p>
                  Try a different phrase or clear your search to see all
                  articles.
                </p>
              </>
            )}
            {posts.map(post => (
              <Link
                key={post.href}
                href={post.href}
                className="marketing-tool-card"
              >
                <span className="marketing-card-category">
                  From the notebook
                </span>
                <h2>{post.title}</h2>
                <p>{post.description}</p>
                <span>Read article →</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="marketing-closing">
          <div className="marketing-container">
            <p className="marketing-eyebrow">
              Looking for something practical?
            </p>
            <h2>There’s a guide for that.</h2>
            <p>
              Find a starting point for taxes, income records, and money between
              paydays.
            </p>
            <Link href="/resources" className="marketing-button">
              Explore the guide library →
            </Link>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
