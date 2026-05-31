"use client";

import { PlayCircle } from "lucide-react";
import { APP_URLS } from "@/lib/utils";

/**
 * Renders the demo video iframe when NEXT_PUBLIC_DEMO_VIDEO_URL is set,
 * otherwise shows a graceful placeholder with a "Get notified" CTA.
 *
 * TODO(real-assets): Record a 60-second Loom or YouTube demo of GigIQ →
 * Tax Autopilot → Kai and set NEXT_PUBLIC_DEMO_VIDEO_URL.
 */
export function DemoEmbed() {
  const src = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL;

  if (!src) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center text-ink-500">
        <PlayCircle className="h-12 w-12 text-brand-400" />
        <p className="max-w-sm text-sm">
          Our new 60-second product walkthrough drops shortly. Want it in your
          inbox the day it lands?
        </p>
        <a
          href={APP_URLS.signup}
          data-analytics-cta="demo-notify-signup"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Start free instead
        </a>
      </div>
    );
  }

  return (
    <iframe
      title="UnifyOne 60-second product demo"
      src={src}
      className="h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  );
}
