import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

// ── Brand constants ───────────────────────────────────────────────────────────
const UNIFY_AI_ENDPOINT = "https://api.1commerce.online/v1";

// ── Animated ticker data ──────────────────────────────────────────────────────
const TICKER_INSIGHTS = [
  { label: "SHIFT INTELLIGENCE", value: "Tue evening Zone 4 avg $24.80/hr vs $18.20/hr in Zone 2", delta: "+$340/mo shifting 2hrs/wk" },
  { label: "TAX AUTOPILOT", value: "12,847 miles logged YTD at $0.67/mile IRS rate", delta: "$8,607 in deductions tracked" },
  { label: "EARNINGS FORECAST", value: "At current pace you'll finish April at $3,870", delta: "+$130 above your $3,740 goal" },
  { label: "PLATFORM COMPARE", value: "Uber Eats up 12% this month, DoorDash down 8%", delta: "Shift 3hrs to Uber = +$156/mo" },
  { label: "MULTI-MODEL AI", value: "Route to Claude for analysis, GPT for code, Gemini for speed", delta: "One API key. Zero lock-in." },
];

// ── Kai demo interactions by persona ─────────────────────────────────────────
const KAI_DEMOS: Record<string, { question: string; answer: string; color: string }> = {
  "Gig Worker": {
    question: "Which of my shifts this week were most profitable after expenses?",
    answer: "Your Thursday 5–9pm shifts averaged $31.20/hr after fuel — 42% higher than Monday mornings at $21.90/hr. Shifting those 3 Monday hours to Thursday evenings adds approximately $120/month to your net.",
    color: "#F0D080",
  },
  Freelancer: {
    question: "What should I charge Client X based on my last 6 months of similar work?",
    answer: "Based on 14 comparable projects, your effective rate averages $87/hr. Client X projects have historically run 18% over estimate. I'd quote $102/hr or add a 20% buffer to the fixed price.",
    color: "#6EE7B7",
  },
  "Small Business": {
    question: "Show me which products had the highest margin this quarter.",
    answer: "Your top 3 by margin: Digital Template Pack (91%), Coaching Bundle (78%), and Starter Kit (64%). Physical goods averaged 34%. Shifting 10% of ad spend to the top 3 would increase blended margin by ~8 points.",
    color: "#93C5FD",
  },
  Developer: {
    question: "Route this prompt to the lowest-latency model for code generation.",
    answer: "Routing to claude-sonnet-4-6 — 340ms avg latency for code tasks in your last 200 calls vs 890ms for gpt-4o. Your monthly cost at current volume: $0.38. Want me to set this as default for code tasks?",
    color: "#C4B5FD",
  },
};

// ── Feature pillars ───────────────────────────────────────────────────────────
const PILLARS = [
  {
    icon: "◈",
    name: "GigIQ",
    title: "Shift Intelligence",
    body: "See which hours, zones, and platforms actually pay the most. Real earnings data. Specific recommendations. Not generic advice.",
    color: "#F0D080",
  },
  {
    icon: "◎",
    name: "Tax Autopilot",
    title: "IRS Deduction Tracker",
    body: "Auto-captures mileage from every logged shift at the current IRS rate. Real-time YTD deduction figure. Quarterly estimate alerts.",
    color: "#6EE7B7",
  },
  {
    icon: "⬡",
    name: "UnifyAI",
    title: "Multi-Model API Router",
    body: "One set of credentials routes to Claude, GPT, Gemini and more. Credit-based billing. Full MCP config dashboard. Zero vendor lock-in.",
    color: "#93C5FD",
  },
  {
    icon: "◇",
    name: "MoneyPulse",
    title: "Money Manager",
    body: "Budgeting, goal tracking, earnings forecasts, and spending analysis — all connected to your actual gig income streams.",
    color: "#C4B5FD",
  },
  {
    icon: "▣",
    name: "1Commerce",
    title: "Commerce Engine",
    body: "Multi-tenant storefront management, Shopify sync, affiliate network tools, and order fulfillment under one dashboard.",
    color: "#FCA5A5",
  },
  {
    icon: "◉",
    name: "Kai",
    title: "AI Sidekick",
    body: "Powered by UnifyAI. Reads your actual data. Works whether you deliver food, run a store, or just want smarter money.",
    color: "#FCD34D",
  },
];

// ── Pricing tiers ─────────────────────────────────────────────────────────────
const TIERS = [
  {
    id: "starter",
    name: "Starter",
    price: "$0",
    period: "forever",
    tagline: "See what you're missing.",
    features: [
      "2 gig platform connections",
      "Full shift earnings history",
      "Auto mileage deduction tracking",
      "50 Kai queries / month",
      "Money Manager dashboard",
      "MoneyGenerator gig tools",
    ],
    cta: "Start Free",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "per month",
    tagline: "Pay for itself in week one.",
    features: [
      "Unlimited gig connections",
      "Advanced zone / time optimization",
      "Quarterly estimates + 1099 prep",
      "500 Kai queries / month",
      "UnifyAI API — 1,000 credits included",
      "Full MCP config dashboard",
      "1 commerce storefront",
      "Priority support",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: "$99",
    period: "per month",
    tagline: "For operators building at scale.",
    features: [
      "Multi-tenant management",
      "Affiliate storefront network",
      "UnifyAI API — 10,000 credits",
      "API reselling + white-label",
      "Custom MCP routing rules",
      "Role-based team access",
      "Slack support + 4hr SLA",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

// ── Platform stats (live feel) ────────────────────────────────────────────────
const STATS = [
  { value: "76M+", label: "US gig workers underserved by existing tools" },
  { value: "$3,200", label: "avg additional deductions tracked per user annually" },
  { value: "300+", label: "AI models accessible through one UnifyAI key" },
  { value: "$556B", label: "gig economy market with no unified intelligence layer" },
];

// ── Nav links ─────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Platform", href: "/#platform" },
  { label: "Kai", href: "/#kai" },
  { label: "UnifyAI", href: "/#unifyai" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/integration-guides" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [tickerIdx, setTickerIdx] = useState(0);
  const [tickerVisible, setTickerVisible] = useState(true);
  const [activePersona, setActivePersona] = useState<keyof typeof KAI_DEMOS>("Gig Worker");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const heroRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nav scroll shadow
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Ticker rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerVisible(false);
      setTimeout(() => {
        setTickerIdx((i) => (i + 1) % TICKER_INSIGHTS.length);
        setTickerVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Kai typewriter
  const typeAnswer = useCallback((text: string) => {
    if (typeRef.current) clearTimeout(typeRef.current);
    setTypedAnswer("");
    setIsTyping(true);
    let i = 0;
    const type = () => {
      if (i < text.length) {
        setTypedAnswer(text.slice(0, i + 1));
        i++;
        typeRef.current = setTimeout(type, 18);
      } else {
        setIsTyping(false);
      }
    };
    typeRef.current = setTimeout(type, 300);
  }, []);

  useEffect(() => {
    typeAnswer(KAI_DEMOS[activePersona].answer);
    return () => { if (typeRef.current) clearTimeout(typeRef.current); };
  }, [activePersona, typeAnswer]);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const reveal = (id: string) =>
    visibleSections.has(id)
      ? "opacity-100 translate-y-0 transition-all duration-700"
      : "opacity-0 translate-y-8";

  const currentTicker = TICKER_INSIGHTS[tickerIdx];
  const currentDemo = KAI_DEMOS[activePersona];

  return (
    <div
      style={{
        background: "#020202",
        color: "#E8E0D0",
        fontFamily: "'Sora', 'DM Sans', system-ui, sans-serif",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&family=Cinzel:wght@600;700&display=swap');

        * { box-sizing: border-box; }

        ::selection { background: #F0D08033; color: #F0D080; }

        .kai-cursor::after {
          content: '▋';
          animation: blink 1s step-end infinite;
          color: #F0D080;
        }
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }

        .ticker-slide-enter { animation: tickerSlide 0.4s ease forwards; }
        @keyframes tickerSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .grid-bg {
          background-image:
            linear-gradient(rgba(240,208,128,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(240,208,128,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .glow-gold { box-shadow: 0 0 40px rgba(240,208,128,0.12), 0 0 80px rgba(240,208,128,0.05); }
        .glow-green { box-shadow: 0 0 40px rgba(110,231,183,0.1); }
        .glow-blue  { box-shadow: 0 0 40px rgba(147,197,253,0.1); }

        .pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 12px; border-radius: 99px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .stat-card:hover { transform: translateY(-2px); }
        .pillar-card:hover { border-color: rgba(240,208,128,0.3) !important; transform: translateY(-3px); }
        .tier-card:hover { transform: translateY(-4px); }
        .transition-all { transition: all 0.25s ease; }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .float { animation: float 6s ease-in-out infinite; }

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .pulse-ring::after {
          content: '';
          position: absolute; inset: -8px; border-radius: 50%;
          border: 1px solid #F0D080;
          animation: pulse-ring 2s ease-out infinite;
        }

        .data-line {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #5A5A5A;
          letter-spacing: 0.05em;
        }

        .hero-headline {
          font-family: 'Cinzel', serif;
          line-height: 1.05;
          letter-spacing: -0.01em;
        }

        @media (max-width: 768px) {
          .hero-headline { font-size: 2.4rem !important; }
          .hero-sub { font-size: 1rem !important; }
          .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .pillar-grid { grid-template-columns: 1fr !important; }
          .tier-grid { grid-template-columns: 1fr !important; }
          .kai-grid { grid-template-columns: 1fr !important; }
          .nav-links { display: none !important; }
        }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "0 32px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: navScrolled
            ? "rgba(2,2,2,0.92)"
            : "transparent",
          backdropFilter: navScrolled ? "blur(12px)" : "none",
          borderBottom: navScrolled ? "1px solid rgba(240,208,128,0.08)" : "none",
          transition: "all 0.3s ease",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #F0D080, #B8872A)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "Cinzel, serif", fontSize: 14, fontWeight: 700, color: "#020202",
            }}
          >U1</div>
          <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: 16, color: "#F0D080", letterSpacing: "0.05em" }}>
            UnifyOne
          </span>
          <span
            className="pill"
            style={{ background: "rgba(240,208,128,0.1)", color: "#F0D080", border: "1px solid rgba(240,208,128,0.2)", marginLeft: 4 }}
          >
            Beta
          </span>
        </div>

        {/* Nav links */}
        <div className="nav-links" style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href}>
              <span
                style={{
                  fontSize: 13, fontWeight: 500, color: "#9A9A9A",
                  cursor: "pointer", letterSpacing: "0.02em",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#E8E0D0")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9A9A9A")}
              >
                {link.label}
              </span>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href={getLoginUrl()}>
            <span
              style={{
                fontSize: 13, fontWeight: 600, color: "#9A9A9A",
                cursor: "pointer", letterSpacing: "0.02em",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#E8E0D0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9A9A9A")}
            >
              Sign in
            </span>
          </Link>
          <Link href={getLoginUrl()}>
            <span
              style={{
                padding: "8px 20px", borderRadius: 8, cursor: "pointer",
                background: "linear-gradient(135deg, #F0D080, #D4A843)",
                color: "#020202", fontSize: 13, fontWeight: 700,
                letterSpacing: "0.02em",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Start Free
            </span>
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="grid-bg"
        style={{
          paddingTop: 140,
          paddingBottom: 120,
          paddingLeft: 32,
          paddingRight: 32,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: "absolute", top: "20%", left: "50%",
            transform: "translateX(-50%)",
            width: 800, height: 400,
            background: "radial-gradient(ellipse, rgba(240,208,128,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 840, margin: "0 auto", position: "relative" }}>
          {/* Badge */}
          <div
            className="pill"
            style={{
              background: "rgba(240,208,128,0.08)",
              border: "1px solid rgba(240,208,128,0.25)",
              color: "#F0D080",
              marginBottom: 32,
              display: "inline-flex",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6EE7B7", display: "inline-block" }} />
            Kai is live — your AI sidekick is ready
          </div>

          {/* Headline */}
          <h1
            className="hero-headline"
            style={{
              fontSize: "clamp(2.8rem, 6vw, 5rem)",
              fontWeight: 700,
              marginBottom: 28,
              background: "linear-gradient(135deg, #FFFFFF 0%, #E8E0D0 40%, #D4A843 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Your AI knows<br />what you actually earn
          </h1>

          {/* Subheadline */}
          <p
            className="hero-sub"
            style={{
              fontSize: "1.15rem",
              lineHeight: 1.7,
              color: "#9A9A9A",
              maxWidth: 620,
              margin: "0 auto 48px",
              fontWeight: 400,
            }}
          >
            UnifyOne reads your real shift data, tracks every deduction, and tells you exactly where you're leaving money on the table.{" "}
            <span style={{ color: "#E8E0D0" }}>Not generic advice — intelligence built on YOUR numbers.</span>
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
            <Link href={getLoginUrl()}>
              <span
                style={{
                  padding: "14px 32px", borderRadius: 10, cursor: "pointer",
                  background: "linear-gradient(135deg, #F0D080, #D4A843)",
                  color: "#020202", fontSize: 15, fontWeight: 700,
                  letterSpacing: "0.02em", display: "inline-block",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  boxShadow: "0 8px 32px rgba(240,208,128,0.25)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 40px rgba(240,208,128,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(240,208,128,0.25)";
                }}
              >
                Start free — connect in 60 seconds
              </span>
            </Link>
            <Link href="/integration-guides">
              <span
                style={{
                  padding: "14px 32px", borderRadius: 10, cursor: "pointer",
                  border: "1px solid rgba(240,208,128,0.25)",
                  color: "#F0D080", fontSize: 15, fontWeight: 600,
                  letterSpacing: "0.02em", display: "inline-block",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(240,208,128,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                See developer tools →
              </span>
            </Link>
          </div>

          {/* Live Ticker */}
          <div
            style={{
              background: "#0E0E0E",
              border: "1px solid #242424",
              borderRadius: 12,
              padding: "20px 28px",
              maxWidth: 680,
              margin: "0 auto",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6EE7B7", animation: "pulse-ring 2s ease-out infinite", position: "relative" }} />
              <span className="data-line">KAI LIVE INSIGHT</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#3A3A3A", fontFamily: "'DM Mono', monospace" }}>
                {tickerIdx + 1}/{TICKER_INSIGHTS.length}
              </span>
            </div>
            <div
              className={tickerVisible ? "ticker-slide-enter" : ""}
              style={{ minHeight: 52 }}
            >
              <div
                className="pill"
                style={{
                  background: "rgba(240,208,128,0.08)",
                  border: "1px solid rgba(240,208,128,0.15)",
                  color: "#F0D080",
                  marginBottom: 8,
                  fontSize: 10,
                }}
              >
                {currentTicker.label}
              </div>
              <div style={{ fontSize: 14, color: "#E8E0D0", marginBottom: 6, fontWeight: 500 }}>
                {currentTicker.value}
              </div>
              <div style={{ fontSize: 13, color: "#6EE7B7", fontFamily: "'DM Mono', monospace" }}>
                → {currentTicker.delta}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAND ───────────────────────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid #161616", borderBottom: "1px solid #161616", padding: "48px 32px" }}>
        <div
          className="stat-grid"
          style={{
            maxWidth: 1100, margin: "0 auto",
            display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24,
          }}
        >
          {STATS.map((stat, i) => (
            <div
              key={i}
              className="stat-card transition-all"
              style={{
                textAlign: "center", padding: "24px 16px",
                borderRadius: 10,
                border: "1px solid #161616",
                background: "#0A0A0A",
              }}
            >
              <div
                style={{
                  fontFamily: "Cinzel, serif", fontSize: "2.2rem", fontWeight: 700,
                  color: "#F0D080", marginBottom: 8, letterSpacing: "-0.02em",
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: "#5A5A5A", lineHeight: 1.5, maxWidth: 180, margin: "0 auto" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINANCIAL INTELLIGENCE (deductions) ──────────────────────────────── */}
      <section
        id="money-section"
        data-reveal
        style={{ padding: "100px 32px" }}
      >
        <div
          className={reveal("money-section")}
          style={{ maxWidth: 1100, margin: "0 auto" }}
        >
          {/* Section label */}
          <div className="data-line" style={{ marginBottom: 20, textAlign: "center" }}>
            ── FINANCIAL INTELLIGENCE ──
          </div>

          <h2
            style={{
              fontFamily: "Cinzel, serif", fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 700, textAlign: "center", marginBottom: 16,
              color: "#E8E0D0",
            }}
          >
            The average gig worker leaves{" "}
            <span style={{ color: "#F0D080" }}>$2,000–$4,000</span>{" "}
            in deductions<br />on the table every year
          </h2>

          <p style={{ textAlign: "center", color: "#5A5A5A", maxWidth: 580, margin: "0 auto 64px", lineHeight: 1.7 }}>
            Most drivers use spreadsheets or nothing at all. The IRS standard mileage deduction ($0.67/mile) means a driver doing
            15,000 miles/year has <strong style={{ color: "#E8E0D0" }}>$10,050 in potential deductions</strong> — but only if every mile is tracked.
          </p>

          {/* Feature cards */}
          <div
            className="pillar-grid"
            id="platform"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 20,
            }}
          >
            {PILLARS.map((p, i) => (
              <div
                key={i}
                className="pillar-card transition-all"
                style={{
                  background: "#0A0A0A",
                  border: "1px solid #161616",
                  borderRadius: 14,
                  padding: "28px 24px",
                  cursor: "default",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <span
                    style={{
                      fontSize: 22, width: 44, height: 44, borderRadius: 10,
                      background: `${p.color}12`,
                      border: `1px solid ${p.color}25`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: p.color,
                    }}
                  >
                    {p.icon}
                  </span>
                  <div>
                    <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: p.color, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#E8E0D0" }}>{p.title}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "#5A5A5A", lineHeight: 1.7, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KAI DEMO ─────────────────────────────────────────────────────────── */}
      <section
        id="kai"
        data-reveal
        style={{
          padding: "100px 32px",
          background: "#080808",
          borderTop: "1px solid #161616",
          borderBottom: "1px solid #161616",
        }}
      >
        <div className={reveal("kai")} style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="data-line" style={{ marginBottom: 20, textAlign: "center" }}>── KAI AI SIDEKICK ──</div>

          <h2
            style={{
              fontFamily: "Cinzel, serif", fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 700, textAlign: "center", marginBottom: 16, color: "#E8E0D0",
            }}
          >
            Works whether you deliver food,{" "}
            <span style={{ color: "#F0D080" }}>run a store,</span>
            <br />or just want smarter money
          </h2>
          <p style={{ textAlign: "center", color: "#5A5A5A", maxWidth: 520, margin: "0 auto 56px", lineHeight: 1.7 }}>
            Not a chatbot. An intelligence layer that reads your actual data and responds in specific numbers.
          </p>

          <div
            className="kai-grid"
            style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 32, alignItems: "start" }}
          >
            {/* Persona selector */}
            <div>
              <div style={{ marginBottom: 16, fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#3A3A3A", letterSpacing: "0.08em" }}>
                SELECT PERSONA
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(Object.keys(KAI_DEMOS) as Array<keyof typeof KAI_DEMOS>).map((persona) => {
                  const active = persona === activePersona;
                  const demo = KAI_DEMOS[persona];
                  return (
                    <button
                      key={persona}
                      onClick={() => setActivePersona(persona)}
                      style={{
                        background: active ? `${demo.color}10` : "#0A0A0A",
                        border: `1px solid ${active ? demo.color + "40" : "#161616"}`,
                        borderRadius: 10,
                        padding: "16px 20px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: active ? demo.color : "#3A3A3A",
                          transition: "background 0.2s",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? demo.color : "#5A5A5A" }}>
                        {persona}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Tagline */}
              <div
                style={{
                  marginTop: 32, padding: "20px",
                  background: "#0A0A0A", border: "1px solid #161616", borderRadius: 10,
                }}
              >
                <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#3A3A3A", marginBottom: 8 }}>POWERED BY</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#E8E0D0", marginBottom: 4 }}>UnifyAI</div>
                <div style={{ fontSize: 12, color: "#5A5A5A", lineHeight: 1.5 }}>
                  Routes to Claude, GPT, Gemini, and future models through one credential set.
                </div>
              </div>
            </div>

            {/* Chat window */}
            <div
              className="glow-gold"
              style={{
                background: "#080808",
                border: "1px solid #242424",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              {/* Chat header */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #161616",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ position: "relative" }} className="pulse-ring">
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "linear-gradient(135deg, #F0D080, #D4A843)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "Cinzel, serif", fontSize: 13, fontWeight: 700, color: "#020202",
                    }}
                  >K</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#E8E0D0" }}>Kai</div>
                  <div style={{ fontSize: 11, color: "#6EE7B7", fontFamily: "'DM Mono', monospace" }}>● online</div>
                </div>
                <div style={{ marginLeft: "auto", fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#3A3A3A" }}>
                  UnifyAI /{" "}
                  <span style={{ color: currentDemo.color }}>
                    {activePersona.toLowerCase().replace(" ", "-")} mode
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div style={{ padding: "24px 20px", minHeight: 260 }}>
                {/* User message */}
                <div
                  style={{
                    background: "#0E0E0E",
                    border: "1px solid #242424",
                    borderRadius: "12px 12px 4px 12px",
                    padding: "12px 16px",
                    marginBottom: 20,
                    marginLeft: "auto",
                    maxWidth: "85%",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#E8E0D0", lineHeight: 1.6 }}>
                    {currentDemo.question}
                  </div>
                </div>

                {/* Kai response */}
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #F0D080, #D4A843)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "Cinzel, serif", fontSize: 11, fontWeight: 700, color: "#020202",
                    }}
                  >K</div>
                  <div
                    style={{
                      background: `${currentDemo.color}08`,
                      border: `1px solid ${currentDemo.color}20`,
                      borderRadius: "12px 12px 12px 4px",
                      padding: "12px 16px",
                      maxWidth: "90%",
                    }}
                  >
                    <div
                      className={isTyping ? "kai-cursor" : ""}
                      style={{ fontSize: 13, color: "#E8E0D0", lineHeight: 1.7 }}
                    >
                      {typedAnswer}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fake input */}
              <div
                style={{
                  padding: "12px 20px",
                  borderTop: "1px solid #161616",
                  display: "flex",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    flex: 1, background: "#0A0A0A", border: "1px solid #242424",
                    borderRadius: 8, padding: "10px 14px",
                    fontSize: 13, color: "#3A3A3A",
                  }}
                >
                  Ask Kai anything about your data...
                </div>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 8, cursor: "pointer",
                    background: "linear-gradient(135deg, #F0D080, #D4A843)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, color: "#020202",
                  }}
                >
                  ↑
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── UNIFYAI DEVELOPER SECTION ─────────────────────────────────────────── */}
      <section
        id="unifyai"
        data-reveal
        style={{ padding: "100px 32px" }}
      >
        <div className={reveal("unifyai")} style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="data-line" style={{ marginBottom: 20, textAlign: "center" }}>── UNIFYAI API ROUTER ──</div>

          <h2
            style={{
              fontFamily: "Cinzel, serif", fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 700, textAlign: "center", marginBottom: 16, color: "#E8E0D0",
            }}
          >
            One API key.{" "}
            <span style={{ color: "#93C5FD" }}>Every major model.</span>
            <br />Zero vendor lock-in.
          </h2>
          <p style={{ textAlign: "center", color: "#5A5A5A", maxWidth: 520, margin: "0 auto 64px", lineHeight: 1.7 }}>
            UnifyAI routes to Claude, GPT, Gemini, and future models through a single endpoint. Credit-based billing. Full MCP config dashboard. Production-ready from day one.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
            {/* Code block */}
            <div
              style={{
                background: "#080808",
                border: "1px solid #242424",
                borderRadius: 14,
                overflow: "hidden",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              <div
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid #161616",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F56" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#27C93F" }} />
                <span style={{ marginLeft: 8, fontSize: 11, color: "#3A3A3A" }}>unifyai_example.ts</span>
              </div>
              <div style={{ padding: "24px 20px", fontSize: 12, lineHeight: 2 }}>
                <div style={{ color: "#5A5A5A" }}>// One endpoint. Any model.</div>
                <div>
                  <span style={{ color: "#C4B5FD" }}>const</span>{" "}
                  <span style={{ color: "#93C5FD" }}>response</span>{" "}
                  <span style={{ color: "#9A9A9A" }}>= await </span>
                  <span style={{ color: "#6EE7B7" }}>fetch</span>
                  <span style={{ color: "#9A9A9A" }}>(</span>
                </div>
                <div style={{ paddingLeft: 20 }}>
                  <span style={{ color: "#FCD34D" }}>"https://api.1commerce.online/v1/chat"</span>
                  <span style={{ color: "#9A9A9A" }}>,</span>
                </div>
                <div style={{ paddingLeft: 20 }}>
                  <span style={{ color: "#9A9A9A" }}>{"{"}</span>
                </div>
                <div style={{ paddingLeft: 40 }}>
                  <span style={{ color: "#E8E0D0" }}>method</span>
                  <span style={{ color: "#9A9A9A" }}>: </span>
                  <span style={{ color: "#FCD34D" }}>"POST"</span><span style={{ color: "#9A9A9A" }}>,</span>
                </div>
                <div style={{ paddingLeft: 40 }}>
                  <span style={{ color: "#E8E0D0" }}>headers</span>
                  <span style={{ color: "#9A9A9A" }}>: {"{"}</span>
                </div>
                <div style={{ paddingLeft: 60 }}>
                  <span style={{ color: "#E8E0D0" }}>Authorization</span>
                  <span style={{ color: "#9A9A9A" }}>: </span>
                  <span style={{ color: "#FCD34D" }}>`Bearer ${"{"}YOUR_KEY{"}"}`</span>
                </div>
                <div style={{ paddingLeft: 40 }}>
                  <span style={{ color: "#9A9A9A" }}>{"}"}</span><span style={{ color: "#9A9A9A" }}>,</span>
                </div>
                <div style={{ paddingLeft: 40 }}>
                  <span style={{ color: "#E8E0D0" }}>body</span>
                  <span style={{ color: "#9A9A9A" }}>: </span>
                  <span style={{ color: "#6EE7B7" }}>JSON.stringify</span>
                  <span style={{ color: "#9A9A9A" }}>({"{"}</span>
                </div>
                <div style={{ paddingLeft: 60 }}>
                  <span style={{ color: "#E8E0D0" }}>model</span>
                  <span style={{ color: "#9A9A9A" }}>: </span>
                  <span style={{ color: "#FCD34D" }}>"auto"</span>
                  <span style={{ color: "#5A5A5A" }}>{" "}// or "claude", "gpt-4o", "gemini"</span>
                </div>
                <div style={{ paddingLeft: 60 }}>
                  <span style={{ color: "#E8E0D0" }}>messages</span>
                  <span style={{ color: "#9A9A9A" }}>: [...]</span>
                </div>
                <div style={{ paddingLeft: 40 }}>
                  <span style={{ color: "#9A9A9A" }}>{"}),"}</span>
                </div>
                <div style={{ paddingLeft: 20 }}>
                  <span style={{ color: "#9A9A9A" }}>{"}"}</span>
                </div>
                <div><span style={{ color: "#9A9A9A" }}>);</span></div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #161616" }}>
                  <span style={{ color: "#5A5A5A" }}>// Response includes model used, tokens, cost</span>
                </div>
                <div style={{ color: "#6EE7B7" }}>
                  {`// { model: "claude-sonnet-4-6", cost: 0.0012, tokens: 840 }`}
                </div>
              </div>
            </div>

            {/* Feature list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { icon: "⬡", label: "Multi-model routing", desc: "Claude, GPT, Gemini, and 300+ models through one endpoint. Smart routing by task type, cost, or latency.", color: "#93C5FD" },
                { icon: "◈", label: "MCP config dashboard", desc: "Visual Model Context Protocol configuration. Set routing rules, context limits, and tool permissions from the UI.", color: "#C4B5FD" },
                { icon: "◎", label: "Credit-based billing", desc: "Pay per call at transparent per-token rates. No subscriptions. Full usage analytics by model and task.", color: "#6EE7B7" },
                { icon: "▣", label: "Rate limiting + key management", desc: "Production-grade API keys with per-tenant rate limits and real-time usage monitoring.", color: "#FCA5A5" },
              ].map((feat, i) => (
                <div
                  key={i}
                  style={{
                    background: "#0A0A0A",
                    border: "1px solid #161616",
                    borderRadius: 12,
                    padding: "20px",
                    display: "flex",
                    gap: 16,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      fontSize: 20, width: 40, height: 40, borderRadius: 8,
                      background: `${feat.color}12`,
                      border: `1px solid ${feat.color}25`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: feat.color, flexShrink: 0,
                    }}
                  >
                    {feat.icon}
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#E8E0D0", marginBottom: 6 }}>{feat.label}</div>
                    <div style={{ fontSize: 12, color: "#5A5A5A", lineHeight: 1.6 }}>{feat.desc}</div>
                  </div>
                </div>
              ))}

              <Link href={getLoginUrl()}>
                <span
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "14px 24px", borderRadius: 10, cursor: "pointer",
                    border: "1px solid rgba(147,197,253,0.3)",
                    color: "#93C5FD", fontSize: 14, fontWeight: 600,
                    transition: "background 0.2s",
                    gap: 8,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(147,197,253,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  Get API credentials → 100 free credits to start
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST / PRIVACY BAND ─────────────────────────────────────────────── */}
      <section
        style={{
          padding: "64px 32px",
          background: "#080808",
          borderTop: "1px solid #161616",
          borderBottom: "1px solid #161616",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "1.4rem", fontWeight: 700, color: "#E8E0D0", marginBottom: 10 }}>
              Your data trains your insights,<br />
              <span style={{ color: "#6EE7B7" }}>not our models.</span>
            </div>
            <p style={{ fontSize: 13, color: "#5A5A5A", maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
              82% of consumers see AI data handling as a serious personal threat. We agree. Bank-grade encryption. You control every connection. Disconnect any platform in one click.
            </p>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { label: "End-to-end encrypted", icon: "🔒" },
              { label: "You own your data", icon: "◈" },
              { label: "No model training on your data", icon: "⊘" },
              { label: "Disconnect any time", icon: "↩" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9A9A9A" }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section
        id="pricing-section"
        data-reveal
        style={{ padding: "100px 32px" }}
      >
        <div className={reveal("pricing-section")} style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="data-line" style={{ marginBottom: 20, textAlign: "center" }}>── PRICING ──</div>

          <h2
            style={{
              fontFamily: "Cinzel, serif", fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 700, textAlign: "center", marginBottom: 12, color: "#E8E0D0",
            }}
          >
            Start free. Upgrade when{" "}
            <span style={{ color: "#F0D080" }}>UnifyOne pays for itself.</span>
          </h2>
          <p style={{ textAlign: "center", color: "#5A5A5A", marginBottom: 56, lineHeight: 1.7 }}>
            Gig workers who track deductions claim an average of $3,200 more per year. That's 168× the cost of Pro.
          </p>

          <div
            className="tier-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}
          >
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className="tier-card transition-all"
                style={{
                  background: tier.highlight ? "#0E0E0E" : "#0A0A0A",
                  border: tier.highlight ? "1px solid rgba(240,208,128,0.35)" : "1px solid #161616",
                  borderRadius: 16,
                  padding: "32px 28px",
                  position: "relative",
                  ...(tier.highlight ? { boxShadow: "0 0 60px rgba(240,208,128,0.08)" } : {}),
                }}
              >
                {tier.highlight && (
                  <div
                    className="pill"
                    style={{
                      position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                      background: "linear-gradient(135deg, #F0D080, #D4A843)",
                      color: "#020202", fontSize: 10,
                    }}
                  >
                    Most Popular
                  </div>
                )}

                <div style={{ marginBottom: 8, fontSize: 12, fontFamily: "'DM Mono', monospace", color: "#3A3A3A", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {tier.name}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: "Cinzel, serif", fontSize: "2.5rem", fontWeight: 700, color: tier.highlight ? "#F0D080" : "#E8E0D0" }}>
                    {tier.price}
                  </span>
                  <span style={{ fontSize: 13, color: "#5A5A5A" }}>/{tier.period}</span>
                </div>
                <div style={{ fontSize: 13, color: "#5A5A5A", marginBottom: 28, lineHeight: 1.5 }}>{tier.tagline}</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                  {tier.features.map((feat, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#9A9A9A" }}>
                      <span style={{ color: "#6EE7B7", marginTop: 2, flexShrink: 0 }}>✓</span>
                      {feat}
                    </div>
                  ))}
                </div>

                <Link href={tier.id === "scale" ? "/contact" : getLoginUrl()}>
                  <span
                    style={{
                      display: "block", textAlign: "center",
                      padding: "13px 20px", borderRadius: 9, cursor: "pointer",
                      ...(tier.highlight
                        ? { background: "linear-gradient(135deg, #F0D080, #D4A843)", color: "#020202", fontWeight: 700 }
                        : { border: "1px solid #242424", color: "#9A9A9A", fontWeight: 600 }
                      ),
                      fontSize: 14,
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {tier.cta}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────────── */}
      <section
        className="grid-bg"
        style={{
          padding: "120px 32px",
          textAlign: "center",
          borderTop: "1px solid #161616",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600, height: 300,
            background: "radial-gradient(ellipse, rgba(240,208,128,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>
          <div
            className="float"
            style={{
              width: 80, height: 80, borderRadius: 20,
              background: "linear-gradient(135deg, #F0D080, #D4A843)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "Cinzel, serif", fontSize: 28, fontWeight: 700, color: "#020202",
              margin: "0 auto 32px",
            }}
          >
            K
          </div>

          <h2
            style={{
              fontFamily: "Cinzel, serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 700,
              marginBottom: 20,
              background: "linear-gradient(135deg, #FFFFFF 0%, #F0D080 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Your money. Your AI.<br />One platform.
          </h2>

          <p style={{ fontSize: "1.1rem", color: "#5A5A5A", marginBottom: 48, lineHeight: 1.7 }}>
            The gig economy runs on fragmented tools. UnifyOne is the intelligence layer that connects them.
            <br />
            <span style={{ color: "#9A9A9A" }}>Start tracking your first shift in 60 seconds.</span>
          </p>

          <Link href={getLoginUrl()}>
            <span
              style={{
                padding: "16px 40px", borderRadius: 12, cursor: "pointer",
                background: "linear-gradient(135deg, #F0D080, #D4A843)",
                color: "#020202", fontSize: 16, fontWeight: 700,
                letterSpacing: "0.02em", display: "inline-block",
                boxShadow: "0 12px 48px rgba(240,208,128,0.3)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 18px 60px rgba(240,208,128,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 12px 48px rgba(240,208,128,0.3)";
              }}
            >
              Start free — no credit card required
            </span>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid #161616",
          padding: "48px 32px",
          display: "flex",
          flexWrap: "wrap",
          gap: 32,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: "linear-gradient(135deg, #F0D080, #B8872A)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "Cinzel, serif", fontSize: 12, fontWeight: 700, color: "#020202",
            }}
          >U1</div>
          <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: 14, color: "#F0D080" }}>UnifyOne</span>
          <span style={{ fontSize: 12, color: "#3A3A3A", marginLeft: 8 }}>© 2025 1Commerce LLC / PNW Enterprises</span>
        </div>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {[
            { label: "Privacy", href: "/privacy-policy" },
            { label: "Terms", href: "/terms-of-service" },
            { label: "API Docs", href: "/integration-guides" },
            { label: "About", href: "/about" },
            { label: "Contact", href: "/contact" },
          ].map((link) => (
            <Link key={link.label} href={link.href}>
              <span style={{ fontSize: 13, color: "#3A3A3A", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#9A9A9A")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#3A3A3A")}
              >{link.label}</span>
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
