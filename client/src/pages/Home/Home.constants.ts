import { SITE_URL } from "@/lib/siteConfig";

export const CANONICAL = `${SITE_URL}/`;

export const HOME_FAQ = [
  {
    q: "What is UnifyOne?",
    a: "UnifyOne is an earnings and tax app built for gig and 1099 workers. It tracks what every shift actually earns you across DoorDash, Uber, Lyft, Instacart, Amazon Flex, Grubhub, Shipt, Upwork, Fiverr and more, auto-logs your IRS mileage at the standard rate, and keeps you ahead of quarterly estimated taxes — all in one dashboard.",
  },
  {
    q: "Which gig platforms does UnifyOne work with?",
    a: "UnifyOne is built for the 76M+ US gig and 1099 workforce — DoorDash, Uber and Uber Eats, Lyft, Instacart, Amazon Flex, Grubhub, Shipt, Upwork, Fiverr and other delivery, rideshare, and freelance platforms. Track earnings from every app you work in one place.",
  },
  {
    q: "Is UnifyOne free to start?",
    a: "Yes. The Free plan includes the shift tracker, mileage log, tax calculators, and 25 AI requests a month — no card required. Pro is $4.99/mo (or $49/yr) and adds 250 AI requests a month, unlimited history, a year-round tax dashboard, priority support, and AI tools as they ship.",
  },
  {
    q: "What is GigIQ?",
    a: "GigIQ is UnifyOne's shift intelligence. It reads your real earnings data and identifies which working hours and delivery zones generate the highest net income after expenses — giving you specific, actionable scheduling recommendations instead of generic advice.",
  },
  {
    q: "How does Tax Autopilot handle mileage and quarterly taxes?",
    a: "Tax Autopilot automatically captures mileage from every logged shift at the current IRS standard rate, keeps a real-time year-to-date deduction total, and alerts you before quarterly estimated taxes are due — including the figures you need for Form 1040-ES. Workers track roughly $3,200 in deductions per year on average.",
  },
  {
    q: "Who is behind UnifyOne?",
    a: "UnifyOne is built by 1Commerce LLC (PNW Enterprises) in Canby, Oregon, founded in 2025. Questions? Reach the team at support@1commerce.online or visit 1commerce.online.",
  },
];

export const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    url: CANONICAL,
    name: "UnifyOne — Gig Earnings & Tax Tracker for 1099 Workers",
    description:
      "UnifyOne tracks what every gig shift actually earns you, auto-logs IRS mileage at the standard rate, and keeps you ahead of quarterly taxes. Built for DoorDash, Uber, Instacart, and freelance workers. Free to start.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-US",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "1Commerce / PNW Enterprises",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    sameAs: ["https://twitter.com/1CommerceSol"],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQ.map(item => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  },
];

export const MARKET_SIGNALS = [
  {
    value: "76M+",
    label: "US gig & 1099 workers underserved by existing tools",
  },
  {
    value: "$3,200",
    label: "avg deductions tracked per worker each year",
  },
  {
    value: "$556B",
    label: "US gig economy with no worker-first earnings layer",
  },
  {
    value: "$0",
    label: "to start — free shift tracker, mileage log & tax tools",
  },
];

export const LAUNCH_METRICS = [
  {
    key: "tenants",
    label: "workers onboarded",
    accent: "#B8872A",
  },
  {
    key: "ordersProcessed",
    label: "shifts & earnings logged",
    accent: "#1F9D6B",
  },
  {
    key: "integrations",
    label: "gig apps supported",
    accent: "#3B6FB0",
  },
] as const;

export const SOCIAL_PROOF = [
  {
    label: "Workers",
    numeric: 2400,
    accent: "#D4A843",
    format: "countPlus",
  },
  {
    label: "Earnings tracked",
    numeric: 1200000,
    accent: "#6EE7B7",
    format: "currencyCompact",
  },
  {
    label: "Gig apps",
    numeric: 8,
    accent: "#93C5FD",
    format: "plain",
  },
  {
    label: "Uptime",
    numeric: 999,
    accent: "#C4B5FD",
    format: "uptime",
  },
] as const;

export const TRUST_BADGES = [
  "DoorDash",
  "Uber",
  "Lyft",
  "Instacart",
  "Amazon Flex",
  "Upwork",
] as const;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PILLARS = [
  {
    glyph: "◈",
    name: "GigIQ",
    title: "Shift & Earnings Intelligence",
    body: "See which hours and zones actually pay the most across every app. Real earnings data. Specific recommendations. Not generic advice.",
    color: "#F0D080",
  },
  {
    glyph: "◎",
    name: "Tax Autopilot",
    title: "IRS Mileage & Quarterly Taxes",
    body: "Auto-captures mileage from every logged shift at the IRS standard rate. Real-time YTD deduction total. Quarterly estimated-tax alerts and Form 1040-ES figures.",
    color: "#6EE7B7",
  },
  {
    glyph: "◇",
    name: "Money Manager",
    title: "Budgeting on Real Income",
    body: "Budgeting, goals, and spending analysis built on your real after-expense gig income — so your plan matches what you actually take home.",
    color: "#C4B5FD",
  },
  {
    glyph: "◉",
    name: "Kai",
    title: "Your AI Sidekick",
    body: "Kai is your in-house sidekick for tax, route, and scheduling questions on your own numbers. AI tools are included when they ship.",
    color: "#FCD34D",
  },
];

export const HOW_IT_WORKS = [
  {
    step: "01",
    heading: "Log Your Shifts & Apps",
    body: "Track earnings from DoorDash, Uber, Lyft, Instacart, Amazon Flex, Grubhub, Shipt, Upwork and more in one place. Start a shift and your mileage logs automatically.",
    color: "#D4A843",
  },
  {
    step: "02",
    heading: "See Your Real Take-Home",
    body: "UnifyOne reads your actual earnings and mileage — not industry benchmarks — to show what every shift nets you after fuel and expenses, and the IRS deductions you're racking up.",
    color: "#6EE7B7",
  },
  {
    step: "03",
    heading: "Stay Ahead of Taxes",
    body: "Get your real-time year-to-date write-off total and quarterly estimated-tax alerts with Form 1040-ES figures — so tax time is never a surprise.",
    color: "#93C5FD",
  },
];

export const WHO_IT_FOR = [
  {
    icon: "◈",
    audience: "Delivery & Rideshare Drivers",
    body: "Driving for DoorDash, Uber, Uber Eats, Lyft, Instacart, Amazon Flex, Grubhub, or Shipt? GigIQ shows which hours and zones generate the highest net pay after fuel and expenses — no spreadsheets required.",
    color: "#F0D080",
  },
  {
    icon: "◇",
    audience: "Freelancers & 1099 Contractors",
    body: "Upwork, Fiverr, contract, or self-employed? Track income across clients, see your true after-expense earnings, and budget on the money you actually take home.",
    color: "#C4B5FD",
  },
  {
    icon: "◎",
    audience: "Anyone Dreading Tax Season",
    body: "Auto-log mileage at the IRS standard rate, watch your year-to-date deductions add up, and get quarterly estimated-tax alerts with Form 1040-ES figures — so April is never a surprise.",
    color: "#6EE7B7",
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "GigIQ showed me I was burning $340/month in dead zones. Shifted my schedule in two weeks and my net is up 22% without working more hours.",
    name: "Marcus D.",
    role: "DoorDash & Instacart Driver",
    initials: "MD",
    accent: "#F0D080",
  },
  {
    quote:
      "I drive Uber and Lyft and never tracked my miles right. UnifyOne logs them automatically — first quarter it found over $1,900 in deductions I'd have missed.",
    name: "Priya S.",
    role: "Uber & Lyft Driver",
    initials: "PS",
    accent: "#6EE7B7",
  },
  {
    quote:
      "Between Upwork gigs my income is all over the place. Now I finally know my real after-expense take-home and I'm not panicking every quarter about taxes.",
    name: "Jordan T.",
    role: "Freelancer, Upwork & Fiverr",
    initials: "JT",
    accent: "#93C5FD",
  },
  {
    quote:
      "Tax Autopilot caught 11 months of mileage deductions I had completely missed. That was a $2,800 write-off I almost lost.",
    name: "Carmen R.",
    role: "Freelance Contractor",
    initials: "CR",
    accent: "#C4B5FD",
  },
  {
    quote:
      "Amazon Flex pays differently every block. UnifyOne tells me which delivery windows actually clear the most after gas — I stopped taking the bad ones.",
    name: "Derek L.",
    role: "Amazon Flex Driver",
    initials: "DL",
    accent: "#FCA5A5",
  },
  {
    quote:
      "The quarterly tax alert is the whole reason I stay. I used to get blindsided every spring. Now I set money aside all year and there are no surprises.",
    name: "Aisha M.",
    role: "Grubhub & Shipt Driver",
    initials: "AM",
    accent: "#FCD34D",
  },
] as const;
