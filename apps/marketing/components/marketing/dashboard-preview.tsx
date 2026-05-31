"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Clock,
  MapPin,
  Sparkles,
  Receipt,
  Car,
  Brain,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight, on-brand interactive dashboard mock with tab simulation.
 * Pure CSS/SVG — loads instantly, no images required.
 *
 * TODO(real-assets): when real product screenshots are exported, swap each
 * panel body for a Next/Image keyed off the same `tab` state.
 */

type TabId = "gigiq" | "tax" | "kai";

const TABS: { id: TabId; label: string; icon: typeof Sparkles }[] = [
  { id: "gigiq", label: "GigIQ", icon: TrendingUp },
  { id: "tax", label: "Tax Autopilot", icon: Receipt },
  { id: "kai", label: "Kai", icon: Sparkles },
];

export function DashboardPreview() {
  const [tab, setTab] = useState<TabId>("gigiq");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="relative"
    >
      <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-brand-200/40 via-white to-growth-400/20 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-lift">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-ink-900/10 bg-ink-900/[.02] px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <span className="hidden text-xs font-medium text-ink-500 sm:inline">
            app.1commerce.online / dashboard
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-growth-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-growth-500" />
            Live
          </span>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Dashboard preview"
          className="flex gap-1 border-b border-ink-900/10 bg-white px-2 pt-2"
        >
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              data-analytics-cta={`dashboard-tab-${t.id}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold transition",
                tab === t.id
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-500 hover:bg-ink-900/[.03] hover:text-ink-900"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="min-h-[360px] p-5">
          <AnimatePresence mode="wait">
            {tab === "gigiq" && <GigIqPanel key="gigiq" />}
            {tab === "tax" && <TaxPanel key="tax" />}
            {tab === "kai" && <KaiPanel key="kai" />}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {children}
    </motion.div>
  );
}

function GigIqPanel() {
  return (
    <Panel>
      <div className="grid grid-cols-3 gap-3">
        <Kpi
          icon={<DollarSign className="h-4 w-4" />}
          label="This week"
          value="$1,284.50"
          delta="+18% WoW"
        />
        <Kpi
          icon={<Clock className="h-4 w-4" />}
          label="Best hour"
          value="6–8 PM"
          delta="$32/hr"
          accent
        />
        <Kpi
          icon={<MapPin className="h-4 w-4" />}
          label="Top zone"
          value="Downtown"
          delta="DoorDash"
        />
      </div>

      <div className="rounded-xl border border-ink-900/10 bg-gradient-to-b from-white to-brand-50/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-900">
              Earnings · 7 days
            </p>
            <p className="text-xs text-ink-500">
              All platforms · normalized to $/hour
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-growth-500/10 px-2 py-0.5 text-xs font-semibold text-growth-600">
            <TrendingUp className="h-3 w-3" /> +22%
          </span>
        </div>
        <Sparkline />
      </div>

      <InsightCard
        tone="brand"
        icon={<Sparkles className="h-4 w-4" />}
        title="Kai insight"
        body={
          <>
            Skip Tuesday lunch shifts. Last 4 weeks averaged{" "}
            <strong>$11/hr</strong> vs <strong>$28/hr</strong> Thursday
            dinners.
          </>
        }
      />
    </Panel>
  );
}

function TaxPanel() {
  return (
    <Panel>
      <div className="grid grid-cols-2 gap-3">
        <Kpi
          icon={<Car className="h-4 w-4" />}
          label="Auto-tracked miles · Q3"
          value="2,310 mi"
          delta="$1,547 deduction"
        />
        <Kpi
          icon={<Receipt className="h-4 w-4" />}
          label="Est. quarterly owed"
          value="$1,247"
          delta="Updated weekly"
          accent
        />
      </div>

      <div className="rounded-xl border border-ink-900/10 bg-white p-4">
        <p className="text-sm font-semibold text-ink-900">
          Quarterly progress
        </p>
        <p className="text-xs text-ink-500">
          Auto-set aside · 24.6% of net income
        </p>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink-900/[.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-growth-500"
            style={{ width: "62%" }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-ink-500">
          <span>$772 saved</span>
          <span>Goal $1,247 by Sep 15</span>
        </div>
      </div>

      <InsightCard
        tone="growth"
        icon={<Receipt className="h-4 w-4" />}
        title="Ready for your CPA"
        body={
          <>
            One-click <strong>Schedule C export</strong> with mileage,
            platform 1099s reconciled, and category totals.
          </>
        }
      />
    </Panel>
  );
}

function KaiPanel() {
  return (
    <Panel>
      <div className="space-y-3 text-sm">
        <ChatBubble who="you">
          Which DoorDash hours actually paid me $25+/hr last month?
        </ChatBubble>
        <ChatBubble who="kai">
          Thursday & Friday <strong>6–9 PM</strong> averaged{" "}
          <strong>$28.40/hr</strong>. Sunday mornings averaged{" "}
          <strong>$11.20/hr</strong> — I’d skip those.
        </ChatBubble>
        <ChatBubble who="you">What did I owe in Q2?</ChatBubble>
        <ChatBubble who="kai">
          Estimated <strong>$1,247 federal + $310 state</strong>, after 2,310
          deductible miles. Want me to export it for your CPA?
        </ChatBubble>
      </div>

      <InsightCard
        tone="brand"
        icon={<Brain className="h-4 w-4" />}
        title="Powered by your real data"
        body={
          <>
            Kai is grounded in your actual income, mileage, orders & tenants —
            not generic LLM advice.
          </>
        }
      />
    </Panel>
  );
}

function Kpi({
  icon,
  label,
  value,
  delta,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-ink-900/10 bg-white p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-ink-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-base font-bold text-ink-900">{value}</p>
      <p
        className={cn(
          "text-xs font-semibold",
          accent ? "text-brand-600" : "text-growth-600"
        )}
      >
        {delta}
      </p>
    </div>
  );
}

function InsightCard({
  tone,
  icon,
  title,
  body,
}: {
  tone: "brand" | "growth";
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  const tones = {
    brand: "border-brand-200 bg-brand-50/60 text-brand-800",
    growth: "border-growth-500/30 bg-growth-500/10 text-growth-600",
  };
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4",
        tones[tone]
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white",
          tone === "brand" ? "bg-brand-600" : "bg-growth-500"
        )}
      >
        {icon}
      </span>
      <div>
        <p className="flex items-center gap-1 text-sm font-semibold">
          {title}
          <ArrowUpRight className="h-3 w-3" />
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-700">{body}</p>
      </div>
    </div>
  );
}

function ChatBubble({
  who,
  children,
}: {
  who: "you" | "kai";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "max-w-[92%] rounded-xl p-3 text-sm leading-relaxed",
        who === "you"
          ? "bg-ink-900/[.04] text-ink-700"
          : "ml-auto bg-brand-600 text-white"
      )}
    >
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide opacity-70">
        {who === "you" ? "You" : "Kai"}
      </span>
      <p>{children}</p>
    </div>
  );
}

function Sparkline() {
  const pts = [12, 22, 18, 30, 26, 38, 44];
  const max = Math.max(...pts);
  const w = 320;
  const h = 80;
  const step = w / (pts.length - 1);
  const path = pts
    .map((p, i) => {
      const x = i * step;
      const y = h - (p / max) * (h - 10) - 5;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const fill = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-3 h-20 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#g)" />
      <path d={path} fill="none" stroke="#4f46e5" strokeWidth="2.5" />
    </svg>
  );
}
