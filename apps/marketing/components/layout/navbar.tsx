"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_URLS, cn } from "@/lib/utils";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/integrations", label: "Integrations" },
  { href: "/solutions", label: "For Teams" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/blog", label: "Blog" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-ink-900/5 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-bold text-ink-900"
          aria-label="UnifyOne home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          UnifyOne
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-900/[.04] hover:text-ink-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <a href={APP_URLS.login} data-analytics-cta="nav-login">
              Log in
            </a>
          </Button>
          <Button asChild size="sm">
            <a href={APP_URLS.signup} data-analytics-cta="nav-signup">
              Start Free
            </a>
          </Button>
        </div>

        <button
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="grid h-10 w-10 place-items-center rounded-md text-ink-900 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "md:hidden",
          open ? "block border-t border-ink-900/5 bg-white" : "hidden"
        )}
      >
        <div className="container space-y-1 py-3">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-base font-medium text-ink-700 hover:bg-ink-900/[.04]"
            >
              {item.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            <Button asChild variant="secondary" size="md" className="flex-1">
              <a href={APP_URLS.login}>Log in</a>
            </Button>
            <Button asChild size="md" className="flex-1">
              <a href={APP_URLS.signup}>Start Free</a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
