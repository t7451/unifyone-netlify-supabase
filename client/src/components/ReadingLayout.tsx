import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import PublicLayout from "./PublicLayout";
import GigResourceLinks from "./GigResourceLinks";
import "./reading.css";

const TAX_TOOLS = new Set([
  "mileage-deduction-calculator",
  "quarterly-tax-estimator",
  "se-tax-calculator",
  "tax-set-aside",
  "gig-hourly-rate",
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
    if (kind === "calculator") return;
    const used = new Set<string>();
    const headings = Array.from(content.current?.querySelectorAll("h2") ?? []);
    setOutline(
      headings
        .map((heading, index) => {
          const text = heading.textContent?.trim() ?? "";
          const base =
            heading.id ||
            text
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") ||
            "section";
          let id = base;
          if (used.has(id)) id = base + "-" + (index + 1);
          used.add(id);
          heading.id = id;
          return { id, text };
        })
        .filter(heading => heading.text)
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
                    <a href={"#" + item.id}>{item.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </details>
        )}
        {kind === "calculator" && TAX_TOOLS.has(tool) && (
          <aside className="reading-year-note">
            <strong>2025 calculation basis</strong>
            <p>
              {tool === "gig-hourly-rate"
                ? "Uses the 2025 mileage allowance as a cost proxy, not your actual vehicle costs. Results are before income and self-employment taxes."
                : "Uses 2025 tax-year figures. This is not a 2026 estimate or a filing/payment instruction. Assumes no W-2 wages. Other income, credits, QBI, age-related deductions, and Additional Medicare Tax can change your result."}{" "}
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
