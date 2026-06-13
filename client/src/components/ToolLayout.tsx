import { type ReactNode } from "react";
import { Link } from "wouter";

interface ToolLayoutProps {
  /** Short name shown in the sticky nav bar. */
  toolName: string;
  /** Last breadcrumb segment (current page label). */
  breadcrumb: string;
  children: ReactNode;
}

/** Shared structural wrapper for all /tools/<slug> pages. */
export default function ToolLayout({
  toolName,
  breadcrumb,
  children,
}: ToolLayoutProps) {
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
      </main>
    </div>
  );
}
