/**
 * routeSeo.ts — per-route SEO metadata for non-SEO-landing routes.
 *
 * These routes set their real <title>/<meta description> at runtime via React
 * Helmet / the SEO head component, which no-JS crawlers never execute — so the
 * static prerender (vite-plugin-prerender-seo) previously fell back to the
 * homepage's title + description on all of them (duplicate titles, generic
 * descriptions). This registry gives the prerender per-route meta so each
 * static HTML file ships its own accurate, aligned, ≤158-char description and a
 * unique title. Values mirror each page's real on-page meta.
 *
 * Keep every `description` ≤158 characters (Ahrefs/Google snippet limit).
 */
export interface RouteSeo {
  path: string;
  title: string;
  description: string;
}

export const ROUTE_SEO: RouteSeo[] = [
  {
    path: "/architecture",
    title: "Architecture | UnifyOne by 1Commerce",
    description:
      "Explore UnifyOne's structural pillars — multi-tenant foundation, payment orchestration, automation mesh, social intelligence, and Kai AI.",
  },
  {
    path: "/the-system",
    title: "The System | UnifyOne",
    description:
      "How UnifyOne works: four sequential build phases, ten integrations, and six features that replace three separate SaaS tools.",
  },
  {
    path: "/pricing",
    title: "Pricing | UnifyOne",
    description:
      "UnifyOne pricing: Starter (free forever), Pro ($19/mo), and Scale ($99/mo). Multi-tenant commerce, AI insights, and every payment rail.",
  },
  {
    path: "/about",
    title: "About | UnifyOne by 1Commerce",
    description:
      "UnifyOne is built by 1Commerce (PNW Enterprises) — AI-powered, multi-tenant commerce infrastructure for gig operators and e-commerce teams.",
  },
  {
    path: "/contact",
    title: "Contact | UnifyOne",
    description:
      "Get in touch with the UnifyOne team at 1Commerce — questions on multi-tenant commerce, pricing, integrations, partnerships, and support.",
  },
  {
    path: "/manus-ai",
    title: "Manus AI | UnifyOne by 1Commerce",
    description:
      "How UnifyOne uses agentic AI — Manus, Claude, and Kai — to automate commerce operations, earnings analysis, and workflow orchestration.",
  },
  {
    path: "/tithes",
    title: "Tithes | UnifyOne",
    description:
      "UnifyOne's Tithes program and transparent pricing — Starter free, Pro $19/mo, Scale $99/mo, all driven by one canonical catalog.",
  },
  {
    path: "/documents",
    title: "Documentation | UnifyOne",
    description:
      "UnifyOne documentation — guides, integrations, case studies, and the full build timeline for the multi-tenant commerce platform.",
  },
  {
    path: "/documents/case-studies",
    title: "Case Studies | UnifyOne",
    description:
      "Detailed case studies of UnifyOne platform features: Cathedral Framework, Kai, multi-tenant architecture, Stripe CAPI bridge, and scroll reveals.",
  },
  {
    path: "/documents/integrations",
    title: "Integration Guides | UnifyOne",
    description:
      "Complete integration guides for UnifyOne — Kai, Claude, n8n, Stripe, PayPal, Square, and Shopify connections for operators.",
  },
  {
    path: "/documents/work-proof",
    title: "Build Timeline & Work Proof | UnifyOne",
    description:
      "Complete timeline of 36 development phases, deliverables, and technical achievements for the UnifyOne platform.",
  },
  {
    path: "/tools",
    title: "Free Tools for Gig Workers & Sellers | UnifyOne",
    description:
      "Free tools for 1099 gig workers: mileage, quarterly tax, earnings consolidation, break-even pricing, and cash-flow tracking. No account required.",
  },
  {
    path: "/blog",
    title: "Blog | UnifyOne by 1Commerce",
    description:
      "UnifyOne blog — multi-tenant commerce, gig-economy earnings, AI automation, and digital retail strategy for operators and e-commerce teams.",
  },
  {
    path: "/blog/gig-worker-shift-intelligence",
    title: "Gig Worker Shift Intelligence | UnifyOne Blog",
    description:
      "How shift intelligence turns DoorDash, Uber Eats, and Instacart history into higher net pay — the data gig workers need to optimize shifts.",
  },
  {
    path: "/tools/mileage-deduction-calculator",
    title: "IRS Mileage Deduction Calculator for Gig Workers 2025 | UnifyOne",
    description:
      "Free IRS mileage deduction calculator for gig workers. Enter miles driven to see your $0.70/mile deduction and estimated tax savings at 4 federal brackets.",
  },
  {
    path: "/tools/quarterly-tax-estimator",
    title: "Quarterly Estimated Tax Calculator — 1099 Self-Employed | UnifyOne",
    description:
      "Free 1099 quarterly tax calculator for gig workers. See your SE tax + income tax and exact quarterly payment amounts with 2026 due dates.",
  },
  {
    path: "/tools/earnings-consolidator",
    title:
      "Multi-Platform Gig Earnings Consolidator | True Hourly Rate | UnifyOne",
    description:
      "Free gig earnings calculator. See your true hourly rate after expenses across DoorDash, Uber Eats, Instacart, and more — no account required.",
  },
  {
    path: "/tools/reseller-break-even",
    title:
      "Reseller Break-Even & Pricing Calculator — eBay, Etsy, Amazon | UnifyOne",
    description:
      "Free reseller pricing calculator. Enter item cost, fees, shipping, and return rate to find your break-even price and target margin on eBay, Etsy, or Amazon.",
  },
  {
    path: "/tools/cashflow-tracker",
    title:
      "Gig Payout Timing & Cash-Flow Tracker | DoorDash, Uber, Instacart | UnifyOne",
    description:
      "Free gig cash-flow tool. Model when DoorDash, Uber Eats, Instacart, and Lyft payouts hit your bank and forecast your 30-day income rhythm.",
  },
  {
    path: "/tools/se-tax-calculator",
    title:
      "Self-Employment Tax Calculator for 1099 Gig Workers 2025 | UnifyOne",
    description:
      "Free self-employment tax calculator for DoorDash, Uber, and Instacart 1099 workers. See your SE tax (Social Security + Medicare) and quarterly estimates.",
  },
  {
    path: "/tools/gig-hourly-rate",
    title:
      "Gig Worker Real Hourly Rate Calculator — DoorDash, Uber Eats, Instacart | UnifyOne",
    description:
      "Find your true hourly rate from DoorDash, Uber Eats, Instacart, and Grubhub after vehicle costs and miles. Free gig earnings optimizer — compare platforms.",
  },
  {
    path: "/tools/tax-set-aside",
    title:
      "1099 Tax Set-Aside Calculator — How Much to Save for Gig Taxes | UnifyOne",
    description:
      "Find the exact percentage of each gig payment to set aside for taxes. Free calculator for DoorDash, Uber, and Instacart 1099 workers — SE + federal tax.",
  },
  {
    path: "/gig-income-aggregator",
    title:
      "Gig Income Aggregator — Consolidate DoorDash, Uber, Instacart Earnings | UnifyOne",
    description:
      "Consolidate DoorDash, Uber Eats, Instacart, Stripe, PayPal, and Square income in one dashboard. See true net earnings after expenses and true hourly rate.",
  },
  {
    path: "/1099-tax-management",
    title:
      "1099 Tax Management for Gig Workers — Quarterly Estimates & Deductions | UnifyOne",
    description:
      "Automated 1099 tax management for gig workers: quarterly payments from live earnings, SE tax, mileage deductions, and IRS-ready records.",
  },
  {
    path: "/gig-earnings-optimizer",
    title:
      "Gig Earnings Optimizer — Maximize Net Pay Across DoorDash, Uber, Instacart | UnifyOne",
    description:
      "Find which gig apps and shifts generate the highest net pay after expenses. UnifyOne compares real net earnings per hour across all platforms.",
  },
  {
    path: "/financial-intelligence-gig-workers",
    title:
      "Financial Intelligence for Gig Workers — AI-Powered Earnings Analytics | UnifyOne",
    description:
      "AI-powered financial intelligence for gig workers: real-time earnings analysis, tax forecasting, and net income visibility across all platforms.",
  },
  {
    path: "/gig-route-intelligence",
    title:
      "Gig Route Intelligence — Optimize Delivery Zones for Higher Net Pay | UnifyOne",
    description:
      "Discover which delivery zones generate your highest net pay per hour. UnifyOne maps your actual earnings history to show where your time is worth most.",
  },
  {
    path: "/blog/gig-economy-commerce-platform",
    title: "Gig Economy Commerce Platform | UnifyOne Blog",
    description:
      "Why gig-economy operators need a unified commerce platform — consolidating earnings, orders, and analytics across DoorDash, Uber, and more.",
  },
  {
    path: "/blog/multi-tenant-ecommerce-saas",
    title: "Multi-Tenant Ecommerce SaaS | UnifyOne Blog",
    description:
      "What multi-tenant ecommerce SaaS means, how tenant isolation and RBAC work, and how UnifyOne runs many stores from one secure backend.",
  },
  {
    path: "/blog/manus-ai-gig-workers",
    title: "Manus AI for Gig Workers | UnifyOne Blog",
    description:
      "How agentic AI like Manus and Kai helps gig workers track earnings, forecast taxes, and optimize routes across every delivery platform.",
  },
  {
    path: "/blog/digital-retail-guide",
    title: "Digital Retail Guide | UnifyOne Blog",
    description:
      "A practical digital retail guide for operators — unifying storefronts, marketplaces, and POS into one multi-tenant commerce system.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | UnifyOne",
    description:
      "UnifyOne Privacy Policy — how 1Commerce LLC collects, uses, and protects your data in compliance with CCPA and GDPR. Last updated March 2026.",
  },
  {
    path: "/terms",
    title: "Terms of Service | UnifyOne",
    description:
      "UnifyOne Terms of Service — usage terms, subscription billing, the Promote & Earn program, data ownership, and liability limits. 1Commerce LLC.",
  },
  {
    path: "/themes",
    title: "Theme Store | UnifyOne — Commerce Themes & Storefront Designs",
    description:
      "Browse free and paid themes for your UnifyOne storefront. Professionally designed for e-commerce and gig worker platforms — preview and install in minutes.",
  },
  {
    path: "/docs-chat",
    title: "Docs Chat | UnifyOne",
    description:
      "Ask questions about UnifyOne documentation — answered instantly by Kai, the built-in Claude-powered AI assistant.",
  },
  {
    path: "/resources",
    title: "Resources | UnifyOne",
    description:
      "Operating excellence resources for gig operators and commerce teams — playbooks, templates, analytics guides, and video walkthroughs. Download free.",
  },
  {
    path: "/sovereign",
    title: "The Sovereign Stack | 1Commerce",
    description:
      "The Sovereign Stack gives gig operators legal protection, financial independence, and resilience. Break free from platform lock-in. Waitlist open.",
  },
  {
    path: "/design-system",
    title: "Design System | UnifyOne",
    description:
      "The UnifyOne design system — Cathedral Framework tokens for color, typography, spacing, and radii, plus the full component library used in the product.",
  },
  {
    path: "/login",
    title: "Sign In | UnifyOne",
    description:
      "Sign in to your UnifyOne workspace — multi-tenant commerce, AI earnings insights, and all your connected stores in one place.",
  },
  {
    path: "/register",
    title: "Create Your Account | UnifyOne",
    description:
      "Start free on UnifyOne — the multi-tenant commerce platform for gig operators and e-commerce teams. No credit card required.",
  },
];
