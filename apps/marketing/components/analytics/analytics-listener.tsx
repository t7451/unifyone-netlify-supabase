"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * Mounted once in the root layout. Provides:
 *  1. Delegated click tracking for any element with `data-analytics-cta`.
 *  2. Scroll-depth milestones (25/50/75/100%).
 *  3. Form submit tracking for any <form data-analytics-form="…">.
 */
export function AnalyticsListener() {
  useEffect(() => {
    // --- Delegated CTA click tracking ---
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const el = target?.closest<HTMLElement>("[data-analytics-cta]");
      if (!el) return;
      const id = el.dataset.analyticsCta ?? "unknown";
      const href = (el as HTMLAnchorElement).href || null;
      const tier = el.dataset.tier ?? undefined;

      // Specialized event names for cleaner GA4 funnels
      if (id.startsWith("dashboard-tab-")) {
        track("dashboard_tab_switch", { id });
      } else if (id.startsWith("pricing-")) {
        track("pricing_select_tier", { id, tier });
      } else {
        track("cta_click", { id, href });
      }
    }

    // --- Form submission tracking ---
    function onSubmit(e: SubmitEvent) {
      const form = e.target as HTMLFormElement | null;
      if (!form?.dataset.analyticsForm) return;
      track("form_submit", { id: form.dataset.analyticsForm });
    }

    // --- Scroll depth ---
    const milestones = [25, 50, 75, 100];
    const fired = new Set<number>();
    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      if (max <= 0) return;
      const pct = Math.round((window.scrollY / max) * 100);
      for (const m of milestones) {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          track("scroll_depth", { percent: m });
        }
      }
    }

    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
