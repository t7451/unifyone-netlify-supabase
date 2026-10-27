import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import PublicLayout from "./PublicLayout";
import GigResourceLinks from "./GigResourceLinks";
import "./reading.css";

const TAX_BASIS_2025_TOOLS = new Set([
  "quarterly-tax-estimator",
  "se-tax-calculator",
  "tax-set-aside",
]);

export default function ReadingLayout({
  children,
  kind = "article",
  collection,
}: {
  children: ReactNode;
  kind?: "article" | "calculator" | "reference";
  collection?: { label: string; href: string };
}) {
  const [location] = useLocation();
  const content = useRef<HTMLDivElement>(null);
  const [outline, setOutline] = useState<{ id: string; text: string }[]>([]);
  const tool = location.split("/").pop() ?? "";

  useEffect(() => {
    if (kind === "calculator") {
      setOutline([]);
      return;
    }
    const headings = Array.from(content.current?.querySelectorAll("h2") ?? []);
    const headingSet = new Set<Element>(headings);
    // Keep authored deep links, and avoid collisions with IDs outside the outline.
    const used = new Set(
      Array.from(document.querySelectorAll("[id]"))
        .filter(element => !headingSet.has(element))
        .map(element => element.id)
    );
    const authoredIds = new Set(
      headings
        .filter(heading => !heading.dataset.readingGeneratedAnchor)
        .map(heading => heading.id)
        .filter(Boolean)
    );
    setOutline(
      headings.flatMap(heading => {
        const text = heading.textContent?.trim() ?? "";
        if (!text) return [];
        const authored =
          !!heading.id && !heading.dataset.readingGeneratedAnchor;
        const base = authored
          ? heading.id
          : text
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") || "section";
        let id = base;
        let suffix = 2;
        while (used.has(id) || (!authored && authoredIds.has(id)))
          id = `${base}-${suffix++}`;
        used.add(id);
        heading.id = id;
        if (!authored) heading.dataset.readingGeneratedAnchor = "true";
        // Native anchors can now move keyboard/screen-reader focus to the heading.
        if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
        return [{ id, text }];
      })
    );
  }, [kind, location, children]);

  return (
    <PublicLayout>
      <div className={"marketing-page reading-page reading-" + kind}>
        <nav className="reading-context" aria-label="Content navigation">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link
            href={
              collection?.href ??
              (kind === "calculator"
                ? "/tools"
                : kind === "reference"
                  ? "/documents"
                  : "/resources")
            }
          >
            {collection?.label ??
              (kind === "calculator"
                ? "Free tools"
                : kind === "reference"
                  ? "Documentation"
                  : "Guides & articles")}
          </Link>
          {kind === "article" && (
            <Link href="/tools" className="reading-context-extra">
              Try a calculator →
            </Link>
          )}
        </nav>
        {kind !== "calculator" && outline.length > 2 && (
          <details className="reading-outline">
            <summary>
              On this page <span>{outline.length} sections</span>
            </summary>
            <nav aria-label="On this page">
              <ol>
                {outline.map(item => (
                  <li key={item.id}>
                    <a
                      href={"#" + item.id}
                      onClick={() =>
                        document
                          .getElementById(item.id)
                          ?.focus({ preventScroll: true })
                      }
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </details>
        )}
        {kind === "calculator" && TAX_BASIS_2025_TOOLS.has(tool) && (
          <aside className="reading-year-note">
            <strong>2025 calculation basis</strong>
            <p>
              Uses 2025 tax-year figures. This is not a 2026 estimate or a
              filing/payment instruction. Assumes no W-2 wages. Other income,
              credits, QBI, age-related deductions, and Additional Medicare Tax
              can change your result.{" "}
              <a
                href="https://www.irs.gov/publications/p501"
                target="_blank"
                rel="noopener noreferrer"
              >
                Check IRS guidance ↗
              </a>
            </p>
          </aside>
        )}
        <div ref={content} className="reading-body">
          {children}
        </div>
        {kind === "article" && <GigResourceLinks />}
      </div>
    </PublicLayout>
  );
}
