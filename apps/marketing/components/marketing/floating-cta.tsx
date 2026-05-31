"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { APP_URLS } from "@/lib/utils";

export function FloatingCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 800);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <a
      href={APP_URLS.signup}
      data-analytics-cta="floating-signup"
      className="fixed bottom-5 right-5 z-30 hidden items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-brand-700 sm:inline-flex"
    >
      Start Free — no credit card
      <ArrowRight className="h-4 w-4" />
    </a>
  );
}
