import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getConsent, hasDecidedConsent, setConsent } from "@/lib/consent";
import {
  initBehaviorTracking,
  trackPageViewFirstParty,
} from "@/lib/behaviorTracking";

/**
 * Opt-in cookie consent banner.
 *
 * Shows until the visitor makes a choice. Behavioral analytics tracking and the
 * first-party visitor/session cookies stay dormant until the visitor accepts —
 * this is the gate that makes the tracking layer GDPR-opt-in compliant.
 *
 * Mount once near the root of the app (inside Router for the privacy link).
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only prompt visitors who haven't decided yet.
    if (!hasDecidedConsent()) {
      setVisible(true);
      return;
    }
    // Returning visitor who previously opted in: make sure flush listeners are
    // bound for this page load.
    if (getConsent()?.analytics) {
      initBehaviorTracking();
    }
  }, []);

  const accept = () => {
    setConsent(true);
    initBehaviorTracking();
    // Record the current page now that consent exists.
    trackPageViewFirstParty();
    setVisible(false);
  };

  const reject = () => {
    setConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-neutral-950/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/80"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <p className="text-sm leading-relaxed text-gray-300">
            We use cookies to understand how customers browse and shop so we can
            recommend what you&apos;re looking for. You can accept analytics
            cookies or keep only the essentials.{" "}
            <Link
              href="/privacy"
              className="font-medium text-white underline underline-offset-2 hover:text-amber-200"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            onClick={reject}
            className="border-white/15 bg-transparent text-white hover:bg-white/10"
          >
            Essentials only
          </Button>
          <Button
            onClick={accept}
            className="bg-amber-400 text-neutral-950 hover:bg-amber-300"
          >
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
