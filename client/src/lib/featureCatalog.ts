import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bell,
  Code2,
  CreditCard,
  DollarSign,
  FileText,
  Film,
  Gift,
  Key,
  LayoutDashboard,
  Link2,
  MessageSquareText,
  Navigation,
  Package,
  Plug,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Tag,
  Target,
  TerminalSquare,
  TrendingUp,
  Trophy,
  UserPlus,
  UserRound,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

export type FeatureTone =
  | "cyan"
  | "emerald"
  | "amber"
  | "violet"
  | "rose"
  | "slate";

export type FeatureModule = {
  label: string;
  path: string;
  description: string;
  outcome: string;
  firstAction: string;
  icon: LucideIcon;
};

export type FeatureCategory = {
  id: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  tone: FeatureTone;
  features: FeatureModule[];
};

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: "command-center",
    title: "Command Center",
    summary:
      "Run the workspace, invite the team, set policies, and keep the daily operating picture in view.",
    icon: LayoutDashboard,
    tone: "cyan",
    features: [
      {
        label: "Dashboard",
        path: "/dashboard",
        description:
          "The daily operating view for revenue, orders, customers, products, and system health.",
        outcome:
          "Know what needs attention before you open any individual module.",
        firstAction:
          "Review KPIs, recent orders, and the module health badges.",
        icon: LayoutDashboard,
      },
      {
        label: "Master Control",
        path: "/master-control",
        description:
          "A cross-platform control room for tenant posture, core actions, and operator priorities.",
        outcome:
          "Coordinate the bigger operating system from one command view.",
        firstAction:
          "Scan active rails, unlocked systems, and recommended control actions.",
        icon: SlidersHorizontal,
      },
      {
        label: "Team",
        path: "/team",
        description:
          "Invite operators and coordinate who helps run commerce, fulfillment, and support.",
        outcome: "Move work out of one inbox and into a shared operating team.",
        firstAction: "Invite your first teammate and confirm their role.",
        icon: UserPlus,
      },
      {
        label: "Notifications",
        path: "/notifications",
        description:
          "Track alerts, operational events, and workspace messages that need attention.",
        outcome:
          "Keep high-signal events visible without living in every page.",
        firstAction: "Review unread alerts and tune notification preferences.",
        icon: Bell,
      },
      {
        label: "Settings",
        path: "/settings",
        description:
          "Manage account, security, appearance, advanced settings, and store-level preferences.",
        outcome:
          "Keep the workspace configured for your team and operating style.",
        firstAction:
          "Confirm profile, security, timezone, and notification settings.",
        icon: Settings,
      },
    ],
  },
  {
    id: "commerce-core",
    title: "Commerce Core",
    summary:
      "Create the catalog, capture checkout demand, fulfill orders, and understand your customer base.",
    icon: ShoppingCart,
    tone: "emerald",
    features: [
      {
        label: "Products",
        path: "/products",
        description:
          "Create and maintain sellable products, pricing, inventory, and catalog details.",
        outcome:
          "Give customers something clear to buy and teams a catalog to operate.",
        firstAction: "Add or review the first product in your active catalog.",
        icon: ShoppingBag,
      },
      {
        label: "Orders",
        path: "/orders",
        description:
          "Review incoming orders, statuses, buyers, totals, and fulfillment momentum.",
        outcome:
          "Turn purchases into tracked work with visible status and value.",
        firstAction:
          "Open the order queue and confirm the next fulfillment action.",
        icon: ShoppingCart,
      },
      {
        label: "Customers",
        path: "/customers",
        description:
          "See customer records, contact context, order history, and relationship health.",
        outcome: "Understand who buys, returns, and deserves follow-up.",
        firstAction: "Review your newest customers and customer segments.",
        icon: Users,
      },
      {
        label: "Checkout",
        path: "/checkout",
        description:
          "Exercise the protected checkout flow and payment return paths.",
        outcome: "Verify the purchase experience before sending traffic to it.",
        firstAction:
          "Run a test checkout after products and payments are configured.",
        icon: CreditCard,
      },
      {
        label: "Discounts",
        path: "/discounts",
        description:
          "Create promotional codes and incentive rules for campaigns or customer recovery.",
        outcome:
          "Give growth work a controlled lever without manually editing orders.",
        firstAction: "Create a launch or retention discount with clear limits.",
        icon: Tag,
      },
      {
        label: "Billing",
        path: "/billing",
        description:
          "Review subscription status, plan posture, billing actions, and payment account context.",
        outcome: "Keep platform access, paid plans, and billing state visible.",
        firstAction: "Confirm the active plan and billing status.",
        icon: CreditCard,
      },
    ],
  },
  {
    id: "payments-channels",
    title: "Payments And Channels",
    summary:
      "Connect payment providers, Shopify rails, storefront themes, and sync monitoring.",
    icon: Plug,
    tone: "amber",
    features: [
      {
        label: "Integrations",
        path: "/integrations",
        description:
          "Connect and monitor Stripe, PayPal, Square, Shopify, automation, and external rails.",
        outcome:
          "Make the platform useful by wiring it into the systems that move money and data.",
        firstAction: "Connect the first payment or commerce provider.",
        icon: Zap,
      },
      {
        label: "Connect Shopify",
        path: "/shopify/install",
        description:
          "Install or reconnect Shopify so products, checkout, and store operations can sync.",
        outcome:
          "Bring Shopify into the same operating layer as the rest of commerce.",
        firstAction: "Start the Shopify connection flow for the target store.",
        icon: Plug,
      },
      {
        label: "Sync Monitor",
        path: "/sync-monitor",
        description:
          "Watch data sync status, provider events, and operational freshness signals.",
        outcome:
          "Spot broken integrations before they become customer-facing problems.",
        firstAction: "Check the most recent sync event and any retry state.",
        icon: Activity,
      },
      {
        label: "Theme Store",
        path: "/themes",
        description:
          "Browse storefront themes and templates that can shape a commerce experience.",
        outcome:
          "Move from backend setup to a storefront customers can understand.",
        firstAction: "Browse available themes for a matching store format.",
        icon: Store,
      },
      {
        label: "My Themes",
        path: "/my-themes",
        description:
          "Manage installed or saved themes tied to the current workspace.",
        outcome: "Keep storefront design assets organized after installation.",
        firstAction: "Review the active theme library and install status.",
        icon: Package,
      },
      {
        label: "Shopify Theme",
        path: "/dashboard/shopify-theme",
        description:
          "Work on Shopify theme assets and theme-specific commerce presentation.",
        outcome:
          "Tune the Shopify-facing storefront after the commerce rail is connected.",
        firstAction:
          "Open the Shopify theme workspace and inspect current assets.",
        icon: ShoppingBag,
      },
    ],
  },
  {
    id: "growth-revenue",
    title: "Growth And Revenue",
    summary:
      "Track performance, generate demand, manage referral loops, and build new revenue lines.",
    icon: TrendingUp,
    tone: "violet",
    features: [
      {
        label: "Analytics",
        path: "/analytics",
        description:
          "Explore deeper performance reporting for revenue, customers, conversion, and operations.",
        outcome: "Turn raw commerce events into decisions and next actions.",
        firstAction:
          "Compare current revenue and customer growth against prior periods.",
        icon: BarChart3,
      },
      {
        label: "Leads",
        path: "/leads",
        description:
          "Capture, qualify, and track prospects before they become customers.",
        outcome: "Give sales and nurture work a place to live before checkout.",
        firstAction: "Review lead sources and define the next follow-up stage.",
        icon: Target,
      },
      {
        label: "Social",
        path: "/social",
        description:
          "Coordinate social commerce activity and customer-facing community signals.",
        outcome: "Make growth less isolated from the rest of store operations.",
        firstAction: "Review connected social flows and campaign context.",
        icon: Share2,
      },
      {
        label: "Friends And Social",
        path: "/friends",
        description:
          "Manage social relationships, community activity, and lightweight network growth.",
        outcome:
          "Keep people-powered growth visible alongside paid and automated channels.",
        firstAction:
          "Review friend and community activity tied to the workspace.",
        icon: UserRound,
      },
      {
        label: "Promote And Earn",
        path: "/referrals",
        description:
          "Manage referral motion for advocates, partners, and audience-driven growth.",
        outcome: "Turn happy users into a tracked acquisition channel.",
        firstAction: "Open referral settings and confirm the active offer.",
        icon: Gift,
      },
      {
        label: "Affiliate Hub",
        path: "/affiliates",
        description:
          "Track affiliate programs, payouts, partner sources, and performance.",
        outcome: "Keep external partner revenue measurable and accountable.",
        firstAction: "Add or review an affiliate program and payout status.",
        icon: Link2,
      },
      {
        label: "Revenue Command",
        path: "/revenue-command",
        description:
          "Prioritize revenue actions, channels, and cash-generating plays.",
        outcome: "Convert scattered growth ideas into an operating sequence.",
        firstAction: "Review the top recommended revenue actions.",
        icon: TrendingUp,
      },
      {
        label: "Revenue Streams",
        path: "/revenue-streams",
        description:
          "Map recurring, one-time, affiliate, service, and product revenue lines.",
        outcome:
          "See how the business earns across more than one product path.",
        firstAction: "Add or review the current active revenue streams.",
        icon: DollarSign,
      },
      {
        label: "Rewards Keys",
        path: "/rewards",
        description:
          "Manage reward keys, unlockable perks, and gamified access paths.",
        outcome: "Create incentive mechanics that reward action and loyalty.",
        firstAction: "Review available keys and the next unlock condition.",
        icon: Key,
      },
      {
        label: "Achievements",
        path: "/achievements",
        description:
          "Track milestones, progress markers, and achievement-based engagement.",
        outcome:
          "Make progress visible for operators, customers, or community members.",
        firstAction:
          "Review unlocked achievements and the nearest next milestone.",
        icon: Trophy,
      },
      {
        label: "Ad Copy Hub",
        path: "/marketing/ad-copy",
        description:
          "Draft positioning, offer language, and campaign copy for growth work.",
        outcome: "Move from platform setup to messages that can pull demand.",
        firstAction: "Generate or review copy for the next campaign.",
        icon: MessageSquareText,
      },
    ],
  },
  {
    id: "automation-ai",
    title: "Automation And AI",
    summary:
      "Use Kai, workflows, mobile automation, agents, knowledge tools, and builder workspaces.",
    icon: Sparkles,
    tone: "rose",
    features: [
      {
        label: "Automations",
        path: "/automations",
        description:
          "Design workflow automations for commerce events, team operations, and customer motion.",
        outcome:
          "Reduce repeated manual work while keeping each action observable.",
        firstAction:
          "Review existing automations and activate one low-risk workflow.",
        icon: Workflow,
      },
      {
        label: "AI Assistant",
        path: "/ai-assistant",
        description:
          "Use Kai for guided support, workspace context, and operator assistance.",
        outcome:
          "Ask natural-language questions while staying inside the operating system.",
        firstAction: "Ask Kai what to fix first in your current workspace.",
        icon: Sparkles,
      },
      {
        label: "Mobile Automation",
        path: "/mobile-automation",
        description:
          "Coordinate phone-first workflows, mobile worker actions, and on-the-go execution.",
        outcome: "Bring field or mobile work into the same operating loop.",
        firstAction: "Review mobile-ready actions and worker handoffs.",
        icon: Smartphone,
      },
      {
        label: "Gig Command",
        path: "/gig-command",
        description:
          "Manage gig-style work streams, operator tasks, and command routing.",
        outcome:
          "Turn flexible work into visible assignments and measurable execution.",
        firstAction: "Review active gig commands and worker readiness.",
        icon: Navigation,
      },
      {
        label: "Gig Worker Plans",
        path: "/gig-worker-plans",
        description:
          "Review plan structures, gig worker packages, and monetization paths.",
        outcome: "Package work and services into clear tiers.",
        firstAction:
          "Compare plans and pick the first package to operationalize.",
        icon: Star,
      },
      {
        label: "DealFlow",
        path: "/dashboard/dealflow",
        description:
          "Track business opportunities, deals, and pipeline-oriented execution.",
        outcome:
          "Keep high-value opportunities from disappearing into chat or notes.",
        firstAction: "Open the pipeline and add or review the next deal stage.",
        icon: Target,
      },
      {
        label: "TerpForge",
        path: "/dashboard/terpforge",
        description:
          "Use the TerpForge builder workspace for specialized product or content workflows.",
        outcome: "Move niche operating work into a structured builder surface.",
        firstAction:
          "Open the workspace and review the active builder modules.",
        icon: Plug,
      },
      {
        label: "Knowledge Graph",
        path: "/dashboard/knowledge-graph",
        description:
          "Map relationships between documents, entities, data, and operating concepts.",
        outcome: "Make institutional knowledge easier to navigate and reuse.",
        firstAction:
          "Inspect the current graph and identify missing source material.",
        icon: Share2,
      },
      {
        label: "PixelForge",
        path: "/dashboard/pixelforge",
        description:
          "Work on creative assets, visual production, or media-adjacent builder flows.",
        outcome:
          "Support product and campaign visuals from inside the platform.",
        firstAction: "Open PixelForge and review the active project surface.",
        icon: Store,
      },
      {
        label: "Manus AI",
        path: "/manus-ai",
        description:
          "Review AI-worker positioning, use cases, and agentic automation context.",
        outcome:
          "Understand how AI workers fit into the platform's operating model.",
        firstAction: "Read the active AI worker use-case map.",
        icon: Sparkles,
      },
      {
        label: "Docs Chat",
        path: "/docs-chat",
        description:
          "Ask questions against documentation and platform knowledge.",
        outcome: "Find answers without scanning every document manually.",
        firstAction: "Ask a question about setup, integrations, or operations.",
        icon: MessageSquareText,
      },
      {
        label: "NLWeb Chat",
        path: "/chat",
        description:
          "Use a natural-language web chat surface for discovery and answer-finding.",
        outcome:
          "Let users explore platform knowledge in a conversational interface.",
        firstAction: "Open chat and test a real user-facing question.",
        icon: MessageSquareText,
      },
    ],
  },
  {
    id: "finance-governance-dev",
    title: "Finance, Governance, And Developer Ops",
    summary:
      "Control money, platform governance, developer tooling, documentation, proof, and media workflows.",
    icon: ShieldCheck,
    tone: "slate",
    features: [
      {
        label: "Money Manager",
        path: "/money-manager",
        description:
          "Track money movement, financial posture, and operating finance views.",
        outcome:
          "See the money system around the commerce system, not only orders.",
        firstAction:
          "Review balances, categories, and the next financial action.",
        icon: DollarSign,
      },
      {
        label: "Governance Dashboard",
        path: "/master-control",
        description:
          "Review platform governance, policies, risk controls, and operational constraints.",
        outcome:
          "Keep scale from outrunning rules, approvals, and accountability.",
        firstAction: "Check active policies and governance alerts.",
        icon: ShieldCheck,
      },
      {
        label: "Developer Hub",
        path: "/developer",
        description:
          "Access developer-facing platform tools, integration context, and technical surfaces.",
        outcome: "Give builders a place to inspect and extend the system.",
        firstAction: "Open developer tooling and review integration status.",
        icon: Code2,
      },
      {
        label: "Terminal",
        path: "/terminal",
        description:
          "Use the in-app terminal-style workspace for command-driven operations.",
        outcome:
          "Support technical workflows without leaving the platform context.",
        firstAction: "Open terminal and review available commands.",
        icon: TerminalSquare,
      },
      {
        label: "Documents",
        path: "/documents",
        description:
          "Browse platform documents, technical architecture, guides, and operating material.",
        outcome: "Keep reference knowledge visible for operators and builders.",
        firstAction: "Open the getting-started or integration documents.",
        icon: FileText,
      },
      {
        label: "Work Proof",
        path: "/documents/work-proof",
        description:
          "Review proof of completed platform work, phases, and shipped capabilities.",
        outcome: "See what has been built and what it supports.",
        firstAction: "Scan the completed phases and current proof points.",
        icon: FileText,
      },
      {
        label: "Sovereign",
        path: "/sovereign",
        description:
          "Review sovereignty-oriented platform positioning, architecture, and control philosophy.",
        outcome: "Understand the platform's independence and control posture.",
        firstAction:
          "Read the current sovereignty model and operational commitments.",
        icon: ShieldCheck,
      },
      {
        label: "Video Production",
        path: "/video-production",
        description:
          "Coordinate video-oriented production and media workflow context.",
        outcome: "Support content creation as part of the same growth system.",
        firstAction: "Review the production surface and next asset to create.",
        icon: Film,
      },
      {
        label: "Tithes",
        path: "/tithes",
        description:
          "Review giving, allocation, or contribution-oriented financial flows.",
        outcome:
          "Keep contribution logic visible alongside financial operations.",
        firstAction: "Open the tithe view and review configured flows.",
        icon: Gift,
      },
    ],
  },
];

export const FEATURE_MODULES = FEATURE_CATEGORIES.flatMap(
  category => category.features
);

export const FEATURE_COUNT = FEATURE_MODULES.length;

export const ONBOARDING_GOALS = [
  "Sell products",
  "Connect payments",
  "Grow demand",
  "Automate operations",
  "Govern access",
  "Build with AI",
] as const;
