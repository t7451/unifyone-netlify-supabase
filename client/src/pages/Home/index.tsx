import { Helmet } from "react-helmet-async";
import PublicLayout from "@/components/PublicLayout";
import LandingPricing from "@/components/landing/LandingPricing";
import StickyCTA from "@/components/landing/StickyCTA";
import { CANONICAL, JSON_LD } from "./Home.constants";
import { useHome } from "./useHome";
import { HeroSection } from "./sections/HeroSection";
import {
  BuildProcessSection,
  FaqSection,
  HowItWorksSection,
  KaiSection,
  PlatformPillarsSection,
  SeoAside,
  TestimonialsSection,
  WhatYouGetSection,
  WhoItsForSection,
  WhyUnifyOneSection,
} from "./sections/MarketingSections";
import { SocialProofCounter } from "./sections/SocialProofCounter";
import { StatsSection } from "./sections/StatsSection";
import { EmailCapture } from "./sections/EmailCapture";
import { FinalCtaSection } from "./sections/FinalCtaSection";

export default function Home() {
  const {
    heroRef,
    statsRef,
    pillarsRef,
    ctaRef,
    launchStats,
    scrollToSection,
    liveMetricValues,
  } = useHome();

  return (
    <PublicLayout>
      <Helmet>
        <title>UnifyOne by 1Commerce — Gig Earnings & Tax Tracker for 1099 Workers</title>
        <meta
          name="description"
          content="Know exactly what every shift earns you. UnifyOne tracks earnings across DoorDash, Uber, Instacart and more, auto-logs IRS mileage, and keeps you ahead of quarterly taxes. Free to start."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta
          property="og:title"
          content="UnifyOne by 1Commerce — Gig Earnings & Tax Tracker for 1099 Workers"
        />
        <meta
          property="og:description"
          content="Know exactly what every shift earns you. UnifyOne tracks earnings across DoorDash, Uber, Instacart and more, auto-logs IRS mileage, and keeps you ahead of quarterly taxes. Free to start."
        />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <HeroSection heroRef={heroRef} />

      {/* ── WHY UNIFYONE (DIFFERENTIATORS) ───────────────────────────────── */}
      <WhyUnifyOneSection />

      {/* ── WHAT YOU GET ─────────────────────────────────────────────────── */}
      <WhatYouGetSection />

      {/* ── SOCIAL PROOF COUNTERS ────────────────────────────────────────── */}
      <section
        className="parchment-alt-bg"
        style={{
          padding: "3rem 0 4rem",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <SocialProofCounter />
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <StatsSection
        statsRef={statsRef}
        liveMetricValues={liveMetricValues}
        isLoading={launchStats.isLoading}
      />

      {/* ── BUILD PROCESS ANIMATION (dark terminal inset) ────────────────── */}
      <BuildProcessSection />

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <HowItWorksSection />

      {/* ── PLATFORM PILLARS ─────────────────────────────────────────────── */}
      <PlatformPillarsSection pillarsRef={pillarsRef} />

      {/* ── WHO IT'S FOR ─────────────────────────────────────────────────── */}
      <WhoItsForSection />

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <TestimonialsSection />

      {/* ── KAI / AI SIDEKICK (dark AI showcase band) ────────────────────── */}
      <KaiSection />

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <LandingPricing />

      {/* ── EMAIL CAPTURE ────────────────────────────────────────────────── */}
      <EmailCapture />

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <FaqSection />

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <FinalCtaSection ctaRef={ctaRef} scrollToSection={scrollToSection} />
      <StickyCTA />

      {/* Static reference links — visible to AI crawlers in initial HTML */}
      <SeoAside />
    </PublicLayout>
  );
}
