import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getLoginUrl } from "@/const";

const CANONICAL = "https://1commerce.online/manus-ai";

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    "url": CANONICAL,
    "name": "Manus AI — Your Gig Commerce Co-Pilot | UnifyOne",
    "description": "Manus AI embedded in UnifyOne: context-aware insights on every dashboard page, route optimization, tax intelligence, and a full conversational assistant powered by your actual operational data.",
    "isPartOf": { "@id": "https://1commerce.online/#website" },
    "inLanguage": "en-US"
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://1commerce.online/" },
      { "@type": "ListItem", "position": 2, "name": "Manus AI", "item": CANONICAL }
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Manus AI for UnifyOne",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": CANONICAL,
    "description": "Context-aware AI co-pilot embedded in UnifyOne commerce platform. Provides route optimization, earnings projections, tax intelligence, and conversational assistance powered by live operational data.",
    "featureList": [
      "Context-aware AI insights on every dashboard page",
      "Route optimization for gig delivery workers",
      "Tax deduction intelligence and mileage tracking",
      "Earnings projections and platform comparison",
      "Full conversational chat with conversation history",
      "Floating AI widget accessible from any page"
    ],
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Included in all UnifyOne plans"
    }
  }
];

const CATHEDRAL_MANUS_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/cathedral-manus-v2-LMRaCZwgmBR3hoFULMA6gG.webp";
const MANUS_AI_BANNER    = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663412766662/NtFplUgYjHyrzGzn.jpg";

const AI_SURFACES = [
  {
    glyph: "①",
    title: "Gig Command Panel",
    context: "Route · Earnings · Platform",
    body: "Reads your platform, average $/hr, YTD miles, tax deduction, and current shift status. Generates route optimization recommendations, platform comparison analysis, and shift scheduling suggestions based on your historical peak performance windows.",
    prompts: [
      "Which zone should I drive tonight?",
      "Compare my DoorDash vs Uber earnings",
      "How many miles until I hit $1,000 deduction?",
    ],
  },
  {
    glyph: "②",
    title: "Money Manager Panel",
    context: "Earnings · Tax · Trends",
    body: "Reads your earnings total, shift count, total hours, average $/hr, total miles, and YTD tax deduction. Generates tax strategy insights, earnings trend analysis, and platform diversification recommendations based on your financial data.",
    prompts: [
      "What's my effective hourly rate this month?",
      "How much should I set aside for taxes?",
      "Which platform is most profitable per hour?",
    ],
  },
  {
    glyph: "③",
    title: "Full AI Assistant",
    context: "10 contexts · Full history",
    body: "A full conversational interface with persistent conversation history, 10 context modes (Dashboard, Gig Command, Money Manager, Challenges, Social, Referrals, Products, Orders, Analytics, Settings), and suggested prompts. Ask anything about your operation.",
    prompts: [
      "Summarize my last 30 days of performance",
      "What's my best strategy for the weekend?",
      "Help me write a social post about my earnings",
    ],
  },
  {
    glyph: "④",
    title: "Floating Widget",
    context: "Every page · One click",
    body: "A gold cross icon in the bottom-right corner of every dashboard page. Expands into a full chat panel without leaving your current page. Automatically detects your current context and pre-loads the relevant data before you type your first message.",
    prompts: [
      "Always present, always context-aware",
      "No page navigation required",
      "Unread badge for proactive insights",
    ],
  },
];

const AI_CAPABILITIES = [
  { title: "Route Optimization", body: "Zone-level performance analysis based on your historical earnings data. Not generic surge pricing tips — your specific zones, your specific hours." },
  { title: "Tax Intelligence", body: "Real-time IRS standard mileage deduction calculation. YTD tracking, quarterly projections, and set-aside recommendations based on your actual income." },
  { title: "Platform Comparison", body: "Side-by-side analysis of your earnings across DoorDash, Uber Eats, Instacart, and other platforms. Identifies which platform is most profitable per hour for your specific market." },
  { title: "Challenge Strategy", body: "Competitive intelligence for the social challenge system. Recommends which challenges to enter, how many shifts you need to win, and what zone to prioritize to close the gap." },
  { title: "Earnings Projection", body: "Forward-looking earnings estimates based on your historical performance patterns. Accounts for seasonality, platform changes, and your current trajectory." },
  { title: "Shift Scheduling", body: "Optimal shift timing recommendations based on your peak performance windows. Identifies the hours and days where your earnings per hour are consistently highest." },
];

const CHAT_DEMO = [
  {
    role: "user",
    message: "Which zone should I drive tonight? I'm on DoorDash in Seattle.",
  },
  {
    role: "ai",
    message: "Based on your last 30 days, your Capitol Hill zone averages $24.80/hr on Thursday evenings (6–10pm), which is 38% above your overall average of $17.95/hr. South Lake Union runs $22.10/hr on Thursdays. I'd start in Capitol Hill at 6pm and shift to Belltown after 9pm when Capitol Hill volume drops. Your highest single-shift earnings ($187) came from this exact pattern on March 2nd.",
  },
  {
    role: "user",
    message: "How close am I to my $1,000 mileage deduction target?",
  },
  {
    role: "ai",
    message: "You've logged 1,847 miles YTD at the 2026 IRS rate of $0.70/mile, giving you a current deduction of $1,292.90 — already $292.90 past your $1,000 target. At your current pace of ~312 miles/month, you'll finish the year at approximately 5,591 miles and a $3,913.70 deduction. I'd recommend setting aside 28% of your net earnings for quarterly estimated taxes given your current trajectory.",
  },
];

export default function ManusAIPage() {
  return (
    <PublicLayout>
      <Helmet>
        <title>Manus AI — Your Gig Commerce Co-Pilot | UnifyOne</title>
        <meta name="description" content="Manus AI embedded in UnifyOne: context-aware insights on every dashboard page, route optimization, tax intelligence, and a full conversational assistant — all powered by your actual operational data." />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Manus AI — Your Gig Commerce Co-Pilot | UnifyOne" />
        <meta property="og:description" content="Context-aware AI insights, route optimization, and tax intelligence — powered by your live operational data." />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="article" />
        <meta name="twitter:title" content="Manus AI — Your Gig Commerce Co-Pilot | UnifyOne" />
        <meta name="twitter:description" content="Context-aware AI insights, route optimization, and tax intelligence — powered by your live operational data." />
        {JSON_LD.map((schema, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
        ))}
      </Helmet>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${CATHEDRAL_MANUS_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.22,
          }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(2,2,2,0.2) 0%, rgba(2,2,2,0.6) 50%, #020202 100%)" }} />
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
          <span className="inscription block mb-6">Manus AI · The Spire</span>
          <h1 className="font-cinzel text-4xl sm:text-6xl lg:text-7xl font-black mb-6" style={{ color: "#F0E8D0", lineHeight: 1.05, letterSpacing: "0.01em" }}>
            Your Gig Commerce<br />Co-Pilot
          </h1>
          <p className="font-crimson text-xl sm:text-2xl max-w-2xl" style={{ color: "#9A9A9A", fontStyle: "italic", lineHeight: 1.6 }}>
            Context-aware intelligence on every page. Route optimization, tax tracking, and earnings analysis — powered by your actual data, not generic advice.
          </p>
          <div className="h-px mt-10 max-w-xs" style={{ background: "linear-gradient(to right, #D4A843, transparent)" }} />
        </div>
      </section>

      {/* ── BANNER IMAGE ────────────────────────────────────────────────── */}
      <section className="py-0">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="relative overflow-hidden" style={{ border: "1px solid rgba(212,168,67,0.1)" }}>
            <img
              src={MANUS_AI_BANNER}
              alt="Manus AI — Powered by UnifyOne"
              className="w-full object-cover"
              style={{ maxHeight: "320px", objectPosition: "center" }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(2,2,2,0.6) 0%, transparent 40%, transparent 60%, rgba(2,2,2,0.6) 100%)" }} />
          </div>
        </div>
      </section>

      {/* ── WHAT MAKES IT DIFFERENT ─────────────────────────────────────── */}
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <span className="inscription block mb-4">The Difference</span>
              <h2 className="font-cinzel text-3xl sm:text-4xl font-bold mb-6" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>
                Not a Chatbot.<br />A Co-Pilot.
              </h2>
              <div className="font-crimson text-lg space-y-5" style={{ color: "#9A9A9A", lineHeight: 1.8 }}>
                <p>Generic AI assistants answer questions about gig work in general. Manus AI inside UnifyOne answers questions about <em>your</em> gig operation specifically — because it reads your actual data before generating a response.</p>
                <p>When you ask "Which zone should I drive tonight?", Manus AI has already read your last 30 days of zone-level earnings, identified your peak performance windows, and cross-referenced tonight's day of week against your historical patterns. The answer is specific to you, not to the average DoorDash driver in your city.</p>
                <p>This is the difference between a search engine and a co-pilot. One retrieves information. The other applies your information to your situation.</p>
              </div>
            </div>
            <div className="space-y-0">
              {[
                { label: "Generic AI", items: ["General gig work advice", "No access to your data", "Same answer for everyone", "No operational context"] },
                { label: "Manus AI in UnifyOne", items: ["Your specific zone performance", "Reads your last 30 days of data", "Personalized to your operation", "Context-aware on every page"], gold: true },
              ].map((col, i) => (
                <div key={i} className="p-8" style={{ border: col.gold ? "1px solid rgba(212,168,67,0.25)" : "1px solid rgba(212,168,67,0.06)", backgroundColor: col.gold ? "rgba(212,168,67,0.03)" : "transparent", marginBottom: "1rem" }}>
                  <span className="inscription block mb-4" style={{ color: col.gold ? "#D4A843" : "#3A3A3A" }}>{col.label}</span>
                  <div className="space-y-2">
                    {col.items.map((item, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <div className="w-1 h-1 shrink-0" style={{ backgroundColor: col.gold ? "#D4A843" : "#3A3A3A" }} />
                        <span className="font-crimson text-base" style={{ color: col.gold ? "#C0B090" : "#3A3A3A" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOUR AI SURFACES ────────────────────────────────────────────── */}
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)", backgroundColor: "rgba(212,168,67,0.015)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">Where AI Lives</span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>Four AI Surfaces</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {AI_SURFACES.map((surface, i) => (
              <div
                key={i}
                className="p-10"
                style={{
                  borderTop: "1px solid rgba(212,168,67,0.08)",
                  borderLeft: i % 2 !== 0 ? "1px solid rgba(212,168,67,0.08)" : "none",
                }}
              >
                <div className="flex items-start gap-4 mb-6">
                  <span className="font-cinzel text-3xl font-black" style={{ color: "rgba(212,168,67,0.3)", lineHeight: 1 }}>{surface.glyph}</span>
                  <div>
                    <span className="inscription block mb-1">{surface.context}</span>
                    <h3 className="font-cinzel text-lg font-bold" style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}>{surface.title}</h3>
                  </div>
                </div>
                <p className="font-crimson text-base mb-6" style={{ color: "#7A7A7A", lineHeight: 1.8 }}>{surface.body}</p>
                <div className="space-y-2">
                  {surface.prompts.map((prompt, j) => (
                    <div key={j} className="flex items-start gap-2 px-4 py-2" style={{ backgroundColor: "rgba(212,168,67,0.04)", border: "1px solid rgba(212,168,67,0.08)" }}>
                      <span className="font-crimson text-xs" style={{ color: "#5A5A5A", fontStyle: "italic" }}>"</span>
                      <span className="font-crimson text-sm" style={{ color: "#7A7A7A", fontStyle: "italic" }}>{prompt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHAT DEMO ───────────────────────────────────────────────────── */}
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">Live Example</span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>A Real Conversation</h2>
          </div>
          <div className="space-y-4" style={{ border: "1px solid rgba(212,168,67,0.1)", padding: "2rem" }}>
            <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: "1px solid rgba(212,168,67,0.08)" }}>
              <div className="w-6 h-6 flex items-center justify-center" style={{ border: "1px solid rgba(212,168,67,0.3)" }}>
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <line x1="7" y1="1" x2="7" y2="13" stroke="#D4A843" strokeWidth="1.5"/>
                  <line x1="1" y1="5" x2="13" y2="5" stroke="#D4A843" strokeWidth="1.5"/>
                </svg>
              </div>
              <span className="font-cinzel text-xs tracking-widest" style={{ color: "#D4A843", letterSpacing: "0.15em" }}>MANUS AI · GIG COMMAND CONTEXT</span>
            </div>
            {CHAT_DEMO.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] px-5 py-4"
                  style={{
                    backgroundColor: msg.role === "user" ? "rgba(212,168,67,0.08)" : "rgba(212,168,67,0.03)",
                    border: msg.role === "user" ? "1px solid rgba(212,168,67,0.2)" : "1px solid rgba(212,168,67,0.08)",
                  }}
                >
                  <span className="inscription block mb-2" style={{ color: msg.role === "user" ? "#D4A843" : "#3A3A3A" }}>
                    {msg.role === "user" ? "You" : "Manus AI"}
                  </span>
                  <p className="font-crimson text-base" style={{ color: msg.role === "user" ? "#C0B090" : "#9A9A9A", lineHeight: 1.7 }}>{msg.message}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="font-crimson text-sm text-center mt-4" style={{ color: "#3A3A3A", fontStyle: "italic" }}>
            Responses are generated from your actual operational data — not simulated.
          </p>
        </div>
      </section>

      {/* ── AI CAPABILITIES ─────────────────────────────────────────────── */}
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)", backgroundColor: "rgba(212,168,67,0.015)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">Intelligence Layer</span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>Six AI Capabilities</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
            {AI_CAPABILITIES.map((cap, i) => (
              <div
                key={i}
                className="p-8"
                style={{
                  borderTop: "1px solid rgba(212,168,67,0.08)",
                  borderLeft: i % 3 !== 0 ? "1px solid rgba(212,168,67,0.08)" : "none",
                }}
              >
                <h3 className="font-cinzel text-sm font-700 mb-4" style={{ color: "#D4A843", letterSpacing: "0.1em" }}>{cap.title}</h3>
                <p className="font-crimson text-base" style={{ color: "#7A7A7A", lineHeight: 1.8 }}>{cap.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIVACY NOTE ────────────────────────────────────────────────── */}
      <section className="py-16" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
          <span className="inscription block mb-4">Data Sovereignty</span>
          <p className="font-crimson text-lg" style={{ color: "#5A5A5A", lineHeight: 1.8 }}>
            Your earnings data never leaves UnifyOne's infrastructure. Manus AI processes your data server-side — your shift history, mileage, and earnings are never transmitted to a third-party AI provider in raw form. The AI receives only the structured context object you can see in the UI. You own your data.
          </p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
          <span className="inscription block mb-4">Activate the Spire</span>
          <h2 className="font-cinzel text-3xl sm:text-4xl font-bold mb-6" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>
            Your Co-Pilot Is Ready.<br />Your Data Is Waiting.
          </h2>
          <p className="font-crimson text-xl mb-10" style={{ color: "#9A9A9A", fontStyle: "italic" }}>
            Manus AI is included in the Architect tier and above. Start free, upgrade when your operation demands it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={getLoginUrl()} className="btn-illuminate">Begin Construction — Free</a>
            <Link href="/tithes">
              <span className="btn-ghost-gold cursor-pointer">View Pricing →</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
