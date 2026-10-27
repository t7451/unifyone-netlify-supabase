import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { getSignupUrl } from "@/const";
import { usePixelPageView } from "@/hooks/usePixelPageView";
import { BrandLockup } from "./Brand";
import "./marketing.css";

const NAV_LINKS = [
  { label: "How it works", href: "/the-system" },
  { label: "Free tools", href: "/tools" },
  { label: "Pricing", href: "/pricing" },
  { label: "Guides", href: "/resources" },
];
const FOOTER_GROUPS = [
  {
    title: "Explore",
    links: [
      { label: "How it works", href: "/the-system" },
      { label: "Pricing", href: "/pricing" },
      { label: "About UnifyOne", href: "/about" },
      { label: "Contact & support", href: "/contact" },
    ],
  },
  {
    title: "Start with a tool",
    links: [
      { label: "All free tools", href: "/tools" },
      { label: "Real hourly rate", href: "/tools/gig-hourly-rate" },
      {
        label: "Mileage deduction",
        href: "/tools/mileage-deduction-calculator",
      },
      {
        label: "Quarterly tax estimate",
        href: "/tools/quarterly-tax-estimator",
      },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Gig tax guide", href: "/gig-taxes" },
      { label: "Money guides", href: "/financial-intelligence-gig-workers" },
      { label: "Blog", href: "/blog" },
      { label: "Documentation", href: "/documents" },
    ],
  },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);
  const menuPanel = useRef<HTMLDivElement>(null);
  usePixelPageView();

  // Keep portaled menus/dialogs on the same theme as the public page.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-public-brand");
    root.setAttribute("data-public-brand", "unifyone");
    return () => {
      if (previous === null) root.removeAttribute("data-public-brand");
      else root.setAttribute("data-public-brand", previous);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);

  useEffect(() => {
    if (!menuOpen) return;
    const focusFrame = requestAnimationFrame(() =>
      menuPanel.current?.querySelector<HTMLAnchorElement>("a")?.focus()
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!nav.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1021px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <div className="marketing-site">
      <a className="marketing-skip" href="#main-content">
        Skip to content
      </a>
      <header className="marketing-header">
        <nav
          ref={nav}
          className="marketing-nav marketing-container"
          aria-label="Main navigation"
          onBlurCapture={event => {
            if (
              event.relatedTarget instanceof Node &&
              !event.currentTarget.contains(event.relatedTarget)
            )
              setMenuOpen(false);
          }}
        >
          <Link href="/" className="marketing-brand" aria-label="UnifyOne home">
            <BrandLockup />
          </Link>
          <div className="marketing-desktop-nav">
            {NAV_LINKS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={location === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="marketing-nav-actions">
            <Link href="/login" className="marketing-sign-in">
              Sign in
            </Link>
            <a
              href={getSignupUrl()}
              className="marketing-button marketing-button-small"
            >
              Get started <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <button
              ref={menuButton}
              type="button"
              className="marketing-menu-toggle"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              aria-controls="marketing-mobile-menu"
              onClick={() => setMenuOpen(open => !open)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
          {menuOpen && (
            <div
              ref={menuPanel}
              id="marketing-mobile-menu"
              className="marketing-mobile-menu"
            >
              {NAV_LINKS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={location === item.href ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/about" onClick={() => setMenuOpen(false)}>
                About
              </Link>
              <Link href="/contact" onClick={() => setMenuOpen(false)}>
                Contact & support
              </Link>
              <a
                href={getSignupUrl()}
                className="marketing-button"
                onClick={() => setMenuOpen(false)}
              >
                Start free <ArrowUpRight size={17} aria-hidden="true" />
              </a>
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                Sign in
              </Link>
            </div>
          )}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="marketing-footer">
        <div className="marketing-container">
          <div className="marketing-footer-grid">
            <div className="marketing-footer-intro">
              <Link href="/" className="marketing-footer-brand">
                <BrandLockup size={34} />
              </Link>
              <p>
                Work logs, costs, mileage and records for people earning across
                apps and clients. Built by 1Commerce.
              </p>
              <a href="mailto:support@1commerce.online">
                support@1commerce.online
              </a>
            </div>
            {FOOTER_GROUPS.map(group => (
              <nav key={group.title} aria-label={group.title}>
                <h2>{group.title}</h2>
                {group.links.map(item => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
          <div className="marketing-footer-bottom">
            <p>© {new Date().getFullYear()} 1Commerce Solutions LLC</p>
            <div>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <a
                href="https://www.instagram.com/1commerce_llc"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
