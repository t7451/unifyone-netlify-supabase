import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { getSignupUrl } from "@/const";
import { usePixelPageView } from "@/hooks/usePixelPageView";

const NAV_LINKS = [
  { label: "Architecture", href: "/architecture" },
  { label: "The System", href: "/the-system" },
  { label: "Tithes", href: "/tithes" },
  { label: "Pricing", href: "/pricing" },
  { label: "Documentation", href: "/documents" },
];

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  // Fire Meta Pixel PageView on every route change
  usePixelPageView();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);

  const isActive = (href: string) => location === href;

  return (
    <div
      style={{
        backgroundColor: "#020202",
        color: "#F0E8D0",
        minHeight: "100vh",
      }}
    >
      {/* ── NAVIGATION ─────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: scrolled ? "rgba(2,2,2,0.97)" : "rgba(2,2,2,0.6)",
          borderBottom: scrolled
            ? "1px solid rgba(212,168,67,0.12)"
            : "1px solid transparent",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          {/* Wordmark */}
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                <div
                  className="absolute inset-0 transition-colors duration-300"
                  style={{ border: "1px solid rgba(212,168,67,0.4)" }}
                />
                <div
                  className="absolute inset-[3px]"
                  style={{ border: "1px solid rgba(212,168,67,0.15)" }}
                />
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <line
                    x1="7"
                    y1="1"
                    x2="7"
                    y2="13"
                    stroke="#D4A843"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="1"
                    y1="5"
                    x2="13"
                    y2="5"
                    stroke="#D4A843"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <div>
                <span
                  className="font-cinzel text-sm font-700 tracking-widest group-hover:text-amber-400 transition-colors"
                  style={{ color: "#D4A843", letterSpacing: "0.2em" }}
                >
                  UNIFYONE
                </span>
                <span
                  className="hidden sm:inline text-xs ml-2"
                  style={{
                    color: "#5A5A5A",
                    letterSpacing: "0.1em",
                    fontFamily: "Cinzel, serif",
                  }}
                >
                  BY 1COMMERCE
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}>
                <span
                  className="cursor-pointer transition-colors duration-200"
                  style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase" as const,
                    color: isActive(link.href) ? "#D4A843" : "#5A5A5A",
                    borderBottom: isActive(link.href)
                      ? "1px solid rgba(212,168,67,0.5)"
                      : "1px solid transparent",
                    paddingBottom: "2px",
                  }}
                  onMouseEnter={e => {
                    if (!isActive(link.href))
                      (e.currentTarget as HTMLElement).style.color = "#D4A843";
                  }}
                  onMouseLeave={e => {
                    if (!isActive(link.href))
                      (e.currentTarget as HTMLElement).style.color = "#5A5A5A";
                  }}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <span
                className="hidden sm:block cursor-pointer transition-all duration-200"
                style={{
                  fontFamily: "Cinzel, serif",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase" as const,
                  color: "#5A5A5A",
                }}
                onMouseEnter={e =>
                  ((e.currentTarget as HTMLElement).style.color = "#D4A843")
                }
                onMouseLeave={e =>
                  ((e.currentTarget as HTMLElement).style.color = "#5A5A5A")
                }
              >
                Enter
              </span>
            </Link>
            <a
              href={getSignupUrl()}
              className="btn-illuminate"
              style={{ padding: "0.5rem 1.25rem", fontSize: "0.65rem" }}
            >
              Begin
            </a>
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 mobile-nav-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ color: "#5A5A5A", background: "none", border: "none" }}
            >
              <div
                className="w-5 h-px mb-1.5 transition-all"
                style={{
                  backgroundColor: mobileMenuOpen ? "#D4A843" : "#5A5A5A",
                }}
              />
              <div
                className="w-5 h-px mb-1.5"
                style={{ backgroundColor: "#3A3A3A" }}
              />
              <div
                className="w-5 h-px transition-all"
                style={{
                  backgroundColor: mobileMenuOpen ? "#D4A843" : "#5A5A5A",
                }}
              />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden"
            style={{
              borderTop: "1px solid rgba(212,168,67,0.1)",
              backgroundColor: "rgba(2,2,2,0.98)",
            }}
          >
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}>
                <span
                  className="block px-6 py-4 cursor-pointer mobile-visibility-copy"
                  style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: "0.7rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase" as const,
                    color: isActive(link.href) ? "#D4A843" : "#5A5A5A",
                    borderBottom: "1px solid rgba(212,168,67,0.06)",
                  }}
                >
                  {link.label}
                </span>
              </Link>
            ))}
            <div className="px-6 py-4">
              <a
                href={getSignupUrl()}
                className="btn-illuminate block text-center"
                style={{ padding: "0.75rem 1.5rem", fontSize: "0.7rem" }}
              >
                Begin Construction
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── PAGE CONTENT ───────────────────────────────────────────────── */}
      <main>{children}</main>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid rgba(212,168,67,0.08)",
          backgroundColor: "#020202",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <line
                    x1="7"
                    y1="1"
                    x2="7"
                    y2="13"
                    stroke="#D4A843"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="1"
                    y1="5"
                    x2="13"
                    y2="5"
                    stroke="#D4A843"
                    strokeWidth="1.5"
                  />
                </svg>
                <span
                  className="font-cinzel text-xs font-700 tracking-widest"
                  style={{ color: "#D4A843", letterSpacing: "0.2em" }}
                >
                  UNIFYONE
                </span>
              </div>
              <p
                className="font-crimson text-sm"
                style={{ color: "#8A8A8A", lineHeight: 1.7 }}
              >
                Commerce infrastructure engineered like a cathedral —
                sequential, structural, and built to outlast every platform
                trend.
              </p>
            </div>

            {/* Platform */}
            <div>
              <span className="inscription block mb-4">Platform</span>
              <div className="space-y-3">
                {[
                  { label: "Architecture", href: "/architecture" },
                  { label: "The System", href: "/the-system" },
                  { label: "Tithes", href: "/tithes" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "Theme Store", href: "/themes" },
                  { label: "Governance", href: "/governance" },
                ].map(item => (
                  <Link key={item.href} href={item.href}>
                    <span
                      className="block cursor-pointer font-cinzel text-xs tracking-widest transition-colors duration-200"
                      style={{ color: "#8A8A8A", letterSpacing: "0.15em" }}
                      onMouseEnter={e =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "#D4A843")
                      }
                      onMouseLeave={e =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "#8A8A8A")
                      }
                    >
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <span className="inscription block mb-4">Codex</span>
              <div className="space-y-3">
                {[
                  {
                    label: "Gig Commerce Guide",
                    href: "/blog/gig-economy-commerce-platform",
                  },
                  {
                    label: "Multi-Tenant SaaS",
                    href: "/blog/multi-tenant-ecommerce-saas",
                  },
                  {
                    label: "AI for Gig Workers",
                    href: "/blog/manus-ai-gig-workers",
                  },
                  { label: "Resources", href: "/resources" },
                  { label: "Docs Chat", href: "/docs-chat" },
                  { label: "Sovereign Access", href: "/sovereign" },
                ].map(item => (
                  <Link key={item.href} href={item.href}>
                    <span
                      className="block cursor-pointer font-cinzel text-xs tracking-widest transition-colors duration-200"
                      style={{ color: "#8A8A8A", letterSpacing: "0.15em" }}
                      onMouseEnter={e =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "#D4A843")
                      }
                      onMouseLeave={e =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "#8A8A8A")
                      }
                    >
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <span className="inscription block mb-4">Foundation</span>
              <div className="space-y-3">
                {[
                  { label: "About", href: "/about" },
                  { label: "Contact", href: "/contact" },
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Enter Dashboard", href: "/dashboard" },
                ].map(item => (
                  <Link key={item.href} href={item.href}>
                    <span
                      className="block cursor-pointer font-cinzel text-xs tracking-widest transition-colors duration-200"
                      style={{ color: "#8A8A8A", letterSpacing: "0.15em" }}
                      onMouseEnter={e =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "#D4A843")
                      }
                      onMouseLeave={e =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "#8A8A8A")
                      }
                    >
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Instagram QR */}
          <div className="flex flex-col items-center gap-3 mb-10">
            <a
              href="https://www.instagram.com/1commerce_llc"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3"
            >
              <img
                src="https://github.com/user-attachments/assets/6dbb3057-6f53-4fcd-9d50-edff38133fed"
                alt="Follow @1COMMERCE_LLC on Instagram — scan QR code"
                width={96}
                height={96}
                className="rounded-lg opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                style={{ imageRendering: "pixelated" }}
              />
              <span
                className="inscription transition-colors duration-200 mobile-visibility-subtle"
                style={{
                  color: "#5A5A5A",
                  letterSpacing: "0.2em",
                  fontSize: "0.6rem",
                }}
                onMouseEnter={e =>
                  ((e.currentTarget as HTMLElement).style.color = "#D4A843")
                }
                onMouseLeave={e =>
                  ((e.currentTarget as HTMLElement).style.color = "#5A5A5A")
                }
              >
                @1COMMERCE_LLC
              </span>
            </a>
          </div>

          {/* Bottom bar */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
            style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}
          >
            <span
              className="inscription mobile-visibility-subtle"
              style={{ color: "#5A5A5A" }}
            >
              © {new Date().getFullYear()} PNW Enterprises / 1Commerce
              Solutions LLC
            </span>
            <span
              className="inscription mobile-visibility-subtle"
              style={{ color: "#5A5A5A" }}
            >
              Cathedral Framework · Built to Endure
            </span>
          </div>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 mobile-sticky-safe"
        style={{
          backgroundColor: "rgba(2,2,2,0.97)",
          borderTop: "1px solid rgba(212,168,67,0.1)",
        }}
      >
        <a
          href={getSignupUrl()}
          className="btn-illuminate block text-center w-full"
          style={{ padding: "0.875rem", fontSize: "0.7rem" }}
        >
          Begin Construction — Free
        </a>
      </div>
    </div>
  );
}
