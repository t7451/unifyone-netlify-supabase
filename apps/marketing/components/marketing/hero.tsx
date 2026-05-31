"use client";

import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_URLS } from "@/lib/utils";
import { DashboardPreview } from "./dashboard-preview";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-hero-grid [background-size:24px_24px] opacity-50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[800px] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl"
      />

      <div className="container relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:gap-10 lg:py-24">
        <div className="lg:col-span-6">
          <span className="eyebrow">
            <ShieldCheck className="h-3 w-3" />
            New · GigIQ for DoorDash, Uber Eats & Instacart
          </span>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="headline mt-5"
          >
            Earn more.{" "}
            <span className="text-brand-600">Owe less.</span> Stop juggling
            apps.
          </motion.h1>

          <p className="subheadline max-w-xl">
            UnifyOne syncs real earnings from DoorDash, Uber Eats, Shopify,
            Stripe and 10+ more — then{" "}
            <strong className="text-ink-900">Kai</strong> tells you which hours
            actually pay,{" "}
            <strong className="text-ink-900">Tax Autopilot</strong> handles
            mileage and quarterlies, and one dashboard runs the whole show.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="xl">
              <a href={APP_URLS.signup} data-analytics-cta="hero-primary">
                Start Free — No Credit Card
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="xl" variant="secondary">
              <Link href="#demo" data-analytics-cta="hero-secondary">
                <PlayCircle className="h-4 w-4" />
                Watch 60-Second Demo
              </Link>
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-growth-500" />
              Free forever for 1 tenant
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex text-amber-400" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </span>
              Loved by 1,200+ operators
            </span>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
            {[
              { k: "+$430", v: "avg. monthly earnings lift" },
              { k: "12+", v: "gig & commerce integrations" },
              { k: "5 min", v: "to your first insight" },
            ].map(s => (
              <div key={s.v}>
                <dt className="text-2xl font-bold text-ink-900">{s.k}</dt>
                <dd className="text-xs text-ink-500">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-6">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
