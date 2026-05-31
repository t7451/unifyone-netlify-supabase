import Link from "next/link";
import { Sparkles, Github, Twitter, Linkedin } from "lucide-react";

const COLS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/integrations", label: "Integrations" },
      { href: "/how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/solutions#gig", label: "For gig workers" },
      { href: "/solutions#ecom", label: "For e-commerce" },
      { href: "/solutions#agencies", label: "For agencies" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/blog/gig-earnings-checklist", label: "Earnings checklist" },
      { href: "https://status.1commerce.online", label: "Status" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/terms", label: "Terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-ink-900/10 bg-ink-900 text-ink-500">
      <div className="container py-16">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-lg font-bold text-white"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              UnifyOne
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-500">
              The AI-powered commerce + earnings platform for gig operators,
              sellers, and agencies. Built on the Cathedral Framework by
              1Commerce LLC.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                aria-label="Twitter"
                href="https://twitter.com"
                className="rounded-md p-2 text-ink-500 hover:bg-white/5 hover:text-white"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                aria-label="LinkedIn"
                href="https://linkedin.com"
                className="rounded-md p-2 text-ink-500 hover:bg-white/5 hover:text-white"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a
                aria-label="GitHub"
                href="https://github.com"
                className="rounded-md p-2 text-ink-500 hover:bg-white/5 hover:text-white"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          {COLS.map(col => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white">{col.title}</h4>
              <ul className="mt-4 space-y-2">
                {col.links.map(l => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-ink-500 hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/5 pt-8 text-xs text-ink-500 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} 1Commerce LLC. All rights reserved.
          </p>
          <p>Built with care on the Cathedral Framework.</p>
        </div>
      </div>
    </footer>
  );
}
