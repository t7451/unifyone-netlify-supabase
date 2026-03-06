import { useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getLoginUrl } from "@/const";

const CATHEDRAL_FEATURES_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/cathedral-features-v2-TQVRMkNdoVVuwphEqVNwpV.webp";

const PILLARS = [
  {
    glyph: "I",
    title: "Multi-Tenant Foundation",
    subtitle: "Schema-level isolation",
    body: "Every store is an isolated vault. Tenant data, billing, and access controls are structurally separated at the schema level — not by convention, not by middleware, not by row-level filtering alone. Each tenant is a load-bearing wall in the system's foundation.",
    tech: ["Drizzle ORM", "MySQL/TiDB", "JWT sessions", "Role-based access control"],
  },
  {
    glyph: "II",
    title: "Commerce Infrastructure",
    subtitle: "Products, orders, inventory",
    body: "Products, orders, inventory, and fulfillment built as load-bearing walls. No plugin dependencies. No single points of failure. The catalog, order pipeline, and inventory system are first-class citizens of the schema — not afterthoughts bolted onto a CMS.",
    tech: ["tRPC procedures", "Optimistic UI", "Supabase Realtime", "Webhook events"],
  },
  {
    glyph: "III",
    title: "Payment Orchestration",
    subtitle: "Three rails, one roof",
    body: "Stripe, PayPal, and Shopify Checkout unified under one roof. Webhooks are verified, idempotent, and fire into your automation layer. Every payment event is logged, retried on failure, and linked to the order record — no orphaned transactions.",
    tech: ["Stripe Checkout + Portal", "PayPal Smart Buttons", "Shopify redirect", "Idempotent webhooks"],
  },
  {
    glyph: "IV",
    title: "Automation Nave",
    subtitle: "Event-driven, not polled",
    body: "n8n workflows, Zapier hooks, and Mailchimp drip sequences triggered by real commerce events — not scheduled polling. An order placed fires into your automation layer within 200ms. A subscription renewed triggers your fulfillment workflow before the customer closes the tab.",
    tech: ["n8n webhook triggers", "Zapier hooks", "Mailchimp drip", "Event queue"],
  },
  {
    glyph: "V",
    title: "Analytics Clerestory",
    subtitle: "Real-time illumination",
    body: "Revenue, orders, and customer data illuminated in real time. Supabase Realtime keeps every panel current without a page refresh. The analytics layer reads from the same schema as the commerce layer — no ETL pipeline, no data warehouse lag, no stale numbers.",
    tech: ["Recharts", "Supabase Realtime", "tRPC queries", "BigQuery-ready"],
  },
  {
    glyph: "VI",
    title: "Manus AI Spire",
    subtitle: "Context-aware intelligence",
    body: "An intelligent co-pilot built into every page. Context-aware insights drawn from your actual shift, earnings, and route data. The AI reads your operational data server-side and returns specific recommendations — not generic tips, not hallucinated metrics.",
    tech: ["Manus AI (invokeLLM)", "Context injection", "Conversation history", "Floating widget"],
  },
];

const TECH_STACK = [
  { layer: "Frontend", items: ["React 19", "Vite 6", "Tailwind CSS 4", "shadcn/ui", "Recharts"] },
  { layer: "API Layer", items: ["tRPC 11", "Superjson", "Zod validation", "Express 4"] },
  { layer: "Database", items: ["Drizzle ORM", "MySQL/TiDB", "Supabase Realtime", "Schema migrations"] },
  { layer: "Auth", items: ["Manus OAuth", "JWT sessions", "Role-based access", "Protected procedures"] },
  { layer: "Payments", items: ["Stripe Checkout", "PayPal SDK", "Shopify redirect", "Webhook verification"] },
  { layer: "Automation", items: ["n8n webhooks", "Zapier hooks", "Resend email", "Event queue"] },
  { layer: "AI", items: ["Manus AI (LLM)", "Context injection", "Streaming responses", "Conversation history"] },
  { layer: "Infrastructure", items: ["Node.js 22", "pnpm workspaces", "GitHub Actions CI", "Vitest 100 tests"] },
];

export default function Architecture() {
  useEffect(() => {
    document.title = "Architecture — Cathedral Framework | UnifyOne";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "The Six Pillars of UnifyOne's Cathedral Framework: multi-tenant foundation, commerce infrastructure, payment orchestration, automation nave, analytics clerestory, and Manus AI spire.");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", "https://1commerce.online/architecture");
  }, []);

  return (
    <PublicLayout>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${CATHEDRAL_FEATURES_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            opacity: 0.18,
          }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(2,2,2,0.3) 0%, rgba(2,2,2,0.7) 60%, #020202 100%)" }} />
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
          <span className="inscription block mb-6">The Cathedral Framework</span>
          <h1 className="font-cinzel text-4xl sm:text-6xl lg:text-7xl font-black mb-6" style={{ color: "#F0E8D0", lineHeight: 1.05, letterSpacing: "0.01em" }}>
            Architecture
          </h1>
          <p className="font-crimson text-xl sm:text-2xl max-w-2xl" style={{ color: "#9A9A9A", fontStyle: "italic", lineHeight: 1.6 }}>
            Six structural pillars. Zero plugin dependencies. Built to outlast every platform trend.
          </p>
          <div className="h-px mt-10 max-w-xs" style={{ background: "linear-gradient(to right, #D4A843, transparent)" }} />
        </div>
      </section>

      {/* ── CATHEDRAL PRINCIPLE ─────────────────────────────────────────── */}
      <section className="py-20" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <span className="inscription block mb-4">The Principle</span>
              <h2 className="font-cinzel text-3xl sm:text-4xl font-bold mb-6" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>
                Sequential Construction.<br />Permanent Foundation.
              </h2>
              <div className="font-crimson text-lg space-y-5" style={{ color: "#9A9A9A", lineHeight: 1.8 }}>
                <p>Medieval cathedral builders did not decorate before the foundation was sealed. They did not install stained glass before the vault was load-tested. They built in sequence — crypt, nave, transept, clerestory, spire — because each layer depended on the structural integrity of the one below it.</p>
                <p>UnifyOne is built on the same principle. Multi-tenant isolation before commerce features. Commerce features before payment rails. Payment rails before automation. Automation before analytics. Analytics before AI. Each pillar is a load-bearing wall, not a decorative facade.</p>
                <p>The result is a platform that does not collapse under production load, does not require manual intervention at scale, and does not accumulate technical debt that compounds into operational drag.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {["Foundation First", "Structure Before Scale", "Automation Before Traffic", "Proven Before Promoted"].map((principle, i) => (
                <div key={i} className="stone-card p-6">
                  <div className="font-cinzel text-2xl font-black mb-3" style={{ color: "rgba(212,168,67,0.2)" }}>{String(i + 1).padStart(2, "0")}</div>
                  <div className="font-cinzel text-xs font-600 tracking-widest" style={{ color: "#D4A843", letterSpacing: "0.1em" }}>{principle}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SIX PILLARS ─────────────────────────────────────────────────── */}
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">Structural Elements</span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>The Six Pillars</h2>
          </div>
          <div className="space-y-0">
            {PILLARS.map((pillar, i) => (
              <div
                key={i}
                className="grid grid-cols-1 lg:grid-cols-12 gap-0"
                style={{ borderTop: "1px solid rgba(212,168,67,0.08)" }}
              >
                {/* Glyph */}
                <div className="lg:col-span-1 flex items-start pt-8 pb-4 lg:pb-8">
                  <span className="font-cinzel text-4xl font-black" style={{ color: "rgba(212,168,67,0.15)", lineHeight: 1 }}>{pillar.glyph}</span>
                </div>
                {/* Content */}
                <div className="lg:col-span-5 pt-0 lg:pt-8 pb-8 lg:pr-12">
                  <span className="inscription block mb-2">{pillar.subtitle}</span>
                  <h3 className="font-cinzel text-xl sm:text-2xl font-bold mb-4" style={{ color: "#F0E8D0", letterSpacing: "0.03em" }}>{pillar.title}</h3>
                  <p className="font-crimson text-lg" style={{ color: "#9A9A9A", lineHeight: 1.8 }}>{pillar.body}</p>
                </div>
                {/* Tech tags */}
                <div className="lg:col-span-6 pt-0 lg:pt-8 pb-8 flex flex-wrap gap-2 content-start">
                  {pillar.tech.map((t, j) => (
                    <span key={j} className="font-cinzel text-xs px-3 py-1.5" style={{ color: "#5A5A5A", border: "1px solid rgba(212,168,67,0.1)", letterSpacing: "0.1em" }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ──────────────────────────────────────────────────── */}
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)", backgroundColor: "rgba(212,168,67,0.015)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">The Materials</span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>Full Stack</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
            {TECH_STACK.map((layer, i) => (
              <div key={i} className="p-8" style={{ borderTop: "1px solid rgba(212,168,67,0.08)", borderLeft: i % 4 !== 0 ? "1px solid rgba(212,168,67,0.08)" : "none" }}>
                <span className="inscription block mb-4">{layer.layer}</span>
                <div className="space-y-2">
                  {layer.items.map((item, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className="w-1 h-1 shrink-0" style={{ backgroundColor: "#D4A843" }} />
                      <span className="font-crimson text-sm" style={{ color: "#9A9A9A" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
          <span className="inscription block mb-4">Begin Construction</span>
          <h2 className="font-cinzel text-3xl sm:text-4xl font-bold mb-6" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>
            The Foundation Is Ready.<br />Your Nave Awaits.
          </h2>
          <p className="font-crimson text-xl mb-10" style={{ color: "#9A9A9A", fontStyle: "italic" }}>
            Start with the Acolyte tier — free forever. Upgrade when your commerce volume demands it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={getLoginUrl()} className="btn-illuminate">Begin Construction — Free</a>
            <Link href="/the-system">
              <span className="btn-ghost-gold cursor-pointer">View The System →</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
