/**
 * StickyCTA — mobile-first sticky conversion bar.
 *
 * Appears after the visitor scrolls past the hero (~600px), hides while
 * the pricing section is on screen (no double-CTA), dismissable, and
 * respects the dismissal for the session. One action only.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const SHOW_AFTER_PX = 600;

export default function StickyCTA() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pricingInView, setPricingInView] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const target = document.getElementById("pricing");
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPricingInView(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (!visible || dismissed || pricingInView) return null;

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
      style={{
        backgroundColor: "rgba(2,2,2,0.96)",
        borderTop: "1px solid rgba(212,168,67,0.35)",
        backdropFilter: "blur(8px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p
            className="font-cinzel text-xs font-bold truncate"
            style={{ color: "#F0E8D0", letterSpacing: "0.06em" }}
          >
            START FREE — UPGRADE WHEN READY
          </p>
          <p className="font-crimson text-xs" style={{ color: "#5A5A5A" }}>
            Pro from $4.99/mo — or $49/yr
          </p>
        </div>
        <button
          onClick={scrollToPricing}
          className="btn-illuminate shrink-0 px-5 py-2 text-sm"
        >
          See plans
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 p-1"
          style={{ color: "#5A5A5A" }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
