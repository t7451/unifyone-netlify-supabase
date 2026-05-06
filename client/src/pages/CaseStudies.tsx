import { Helmet } from "react-helmet-async";
import PublicLayout from "@/components/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_URL } from "@/lib/siteConfig";

const BUSINESS_CASE_STUDIES = [
  {
    id: "ecommerce-studio",
    badge: "Scale Plan",
    headline: "E-commerce Studio Processes $240K in 6 Months",
    subtitle:
      "A multi-brand operator consolidated Stripe, PayPal, and affiliate operations into one revenue engine.",
    metrics: [
      { value: "$240K", label: "processed in 6 months" },
      { value: "2", label: "payment rails unified" },
      { value: "+34%", label: "affiliate-driven growth" },
    ],
  },
  {
    id: "gig-economy-platform",
    badge: "Automation",
    headline: "Gig Economy Platform Automates 80% of Order Fulfillment",
    subtitle:
      "n8n orchestration, Kai workflows, and AI credit metering replaced manual operations across the order queue.",
    metrics: [
      { value: "80%", label: "fulfillment automated" },
      { value: "14", label: "workflow steps orchestrated" },
      { value: "24/7", label: "AI-assisted triage" },
    ],
  },
  {
    id: "white-label-agency",
    badge: "White Label",
    headline: "White-label Agency Deploys 12 Client Stores in One Sprint",
    subtitle:
      "Unlimited tenants, custom domains, and a white-label control plane let the agency ship storefronts without operational drag.",
    metrics: [
      { value: "12", label: "client stores launched" },
      { value: "1", label: "sprint to deploy" },
      { value: "100%", label: "brand-controlled experiences" },
    ],
  },
] as const;

const CASE_STUDIES = [
  {
    id: "cathedral-framework",
    title: "Cathedral Framework: Design System Architecture",
    subtitle: "From Generic SaaS to Architectural Authority",
    metrics: [
      { label: "Design Tokens", value: "47" },
      { label: "CSS Keyframes", value: "12" },
      { label: "Asset Generation", value: "4 HD backgrounds" },
    ],
    description: `The Cathedral Framework is not a copy of existing design systems. It is an original architectural language that translates gothic cathedral geometry into digital UI — void-black backgrounds, manuscript gold illumination, Cinzel serif typography, and apex-light radial gradients. Every component reflects structural permanence: zero border-radius, stone-surface textures, illuminated medallions, and arch-top card borders.

The system was built iteratively: first by extracting design tokens from 1Commerce, then by recognizing the pattern was too generic. The rebuild started from first principles — what does "cathedral" mean in software? Answer: weight, permanence, light sourcing from a single apex point, and a sense of being inside a constructed space.

Result: A design language that is immediately recognizable, defensible, and impossible to confuse with any other SaaS platform.`,
    achievements: [
      "Original design system (not a copy)",
      "47 CSS variables (stone, illumination, typography)",
      "4 AI-generated cathedral background assets",
      "12 keyframe animations (apex-pulse, illuminate, rise, gold-beam)",
      "Responsive design: mobile-first with 480px/768px breakpoints",
      "Accessibility: prefers-reduced-motion, prefers-color-scheme support",
    ],
  },
  {
    id: "kai-ai-integration",
    title: "Kai AI Integration: Context-Aware Copilot",
    subtitle: "AI as a Structural Component, Not an Afterthought",
    metrics: [
      { label: "AI Contexts", value: "10" },
      { label: "Drip Emails", value: "5" },
      { label: "Insight Panels", value: "3 pages" },
    ],
    description: `Kai was integrated not as a chatbot overlay, but as a structural component of the platform. The integration spans three layers:

1. **Floating Chat Widget** (DashboardLayout): Context-aware from current route (Dashboard, Money Manager, Gig Command). Injects live user data (earnings, shift count, miles, tax deduction) into AI prompts.

2. **Dedicated /ai-assistant Page**: Full-screen chat with conversation history sidebar, context selector (10 contexts), suggested prompts, and new/delete/clear controls.

3. **Embedded Insight Panels** (Money Manager, Gig Command): Collapsible "AI Insights" cards that pull live suggestions from user data without leaving the page.

The system uses \`invokeLLM\` server-side with system context that changes per page. Dashboard gets earnings summary context. Gig Command gets platform/mileage context. Money Manager gets tax deduction context.

Result: AI that feels native to the platform, not bolted on. Every page can surface AI insights without requiring a dedicated chat page.`,
    achievements: [
      "10 context-aware AI prompts (Dashboard, Money Manager, Gig Command, etc.)",
      "Floating chat widget with unread badge and context detection",
      "Full /ai-assistant page with conversation history and suggested prompts",
      "AIInsightsCard reusable component (3 pages integrated)",
      "5-email drip sequence (welcome, platform overview, getting started, success stories, limited offer)",
      "Server-side LLM invocation with system context injection",
    ],
  },
  {
    id: "multi-tenant-commerce",
    title: "Multi-Tenant Commerce Platform: Isolation & Scale",
    subtitle: "SaaS Architecture That Doesn't Compromise Security",
    metrics: [
      { label: "Tenants Supported", value: "Unlimited" },
      { label: "Isolation Layers", value: "4" },
      { label: "Schema Tables", value: "19" },
    ],
    description: `Multi-tenancy is not just a database feature — it is an architectural decision that affects every layer of the platform. UnifyOne implements four isolation layers:

1. **Database Layer**: Tenants table with unique slug. All data tables include tenant_id foreign key. Row-level security (RLS) policies enforce tenant isolation at the database level.

2. **Authentication Layer**: Users belong to tenants. JWT tokens include tenant_id. Every tRPC procedure checks ctx.user.tenantId against requested resource.

3. **API Layer**: All tRPC procedures are tenant-scoped. No procedure returns data from other tenants, even if a user somehow bypasses the frontend.

4. **UI Layer**: DashboardLayout includes Tenant Switcher. Users can switch between tenants they own or have been invited to. Active tenant is stored in localStorage and passed to all tRPC calls.

The schema includes 19 tables: tenants, users, products, orders, customers, subscriptions, webhooks, analytics, social_posts, referrals, leads, automations, and more. Each table is tenant-scoped.

Result: A platform that can scale to thousands of tenants without compromising security or data isolation.`,
    achievements: [
      "4-layer isolation: database, auth, API, UI",
      "19 schema tables with tenant_id foreign keys",
      "Tenant Switcher in sidebar (multi-tenant support)",
      "Row-level security (RLS) policies at database level",
      "JWT tokens include tenant_id for server-side verification",
      "tRPC procedures enforce tenant scoping on every call",
    ],
  },
  {
    id: "stripe-capi-bridge",
    title: "Stripe → Meta CAPI Purchase Event Bridge",
    subtitle: "Closing the Loop: Transactions to Algorithm",
    metrics: [
      { label: "Event Latency", value: "<500ms" },
      { label: "Webhook Coverage", value: "3 events" },
      { label: "Event Validation", value: "Configured" },
    ],
    description: `The Stripe → Meta CAPI bridge is the critical link between commerce transactions and Meta's advertising algorithm. Without this bridge, every paid conversion is invisible to Meta, which means higher CPM and CPL over time.

The implementation:

1. **Stripe Webhook Handler** (/api/stripe/webhook): Listens for \`checkout.session.completed\` events. Extracts customer email, order amount, and metadata (user_id, customer_name).

2. **CAPI Event Fire** (firePurchase): Calls Meta's Conversions API with:
   - event_name: "Purchase"
   - event_id: Stripe session ID (deduplication)
   - user_data: email, phone, first/last name, city, state, zip
   - custom_data: value (order amount), currency (USD)
   - test_event_code: Configured via environment variable for event validation

3. **Webhook Signature Verification**: Stripe signs all webhooks with HMAC-SHA256. The handler verifies the signature before processing to prevent spoofing.

4. **Idempotency**: Event IDs are Stripe session IDs, so duplicate webhooks don't create duplicate CAPI events.

Result: Every paid conversion is immediately fed to Meta's algorithm, which learns your customer profile and optimizes future ad delivery. This is the highest-leverage integration for paid acquisition.`,
    achievements: [
      "Stripe webhook handler with signature verification",
      "firePurchase() function calling Meta CAPI",
      "Event validation code configured via environment variable",
      "Event deduplication via Stripe session ID",
      "User data enrichment (email, name, location)",
      "Custom data (value, currency) for conversion tracking",
    ],
  },
  {
    id: "scroll-reveals",
    title: "Scroll-Triggered Reveals: IntersectionObserver Pattern",
    subtitle: "Performance-First Animation Without Jank",
    metrics: [
      { label: "Custom Hook", value: "useScrollReveal<T>" },
      { label: "Animated Elements", value: "10+" },
      { label: "Performance Impact", value: "Negligible" },
    ],
    description: `Scroll-triggered animations are a common UX pattern, but they are often implemented poorly — using scroll event listeners that fire hundreds of times per second, causing jank and battery drain.

UnifyOne uses the modern IntersectionObserver API, which is performant and declarative:

1. **useScrollReveal<T> Hook**: Accepts a ref to a container and an array of child elements. Sets up an IntersectionObserver with threshold 0.1 and rootMargin -40px (bottom). When an element enters the viewport, it adds the \`reveal-visible\` class, which triggers the \`animate-rise\` keyframe.

2. **CSS Keyframes**: \`@keyframes animate-rise\` moves elements from \`transform: translateY(40px); opacity: 0\` to \`transform: translateY(0); opacity: 1\` over 0.6s with cubic-bezier easing.

3. **Accessibility**: Respects \`prefers-reduced-motion\` media query. If the user has enabled reduced motion, animations are skipped entirely.

4. **Staggered Delays**: Each child element has a \`data-reveal-delay\` attribute (in milliseconds). The hook applies a CSS custom property \`--reveal-delay\` which is used in the animation-delay property.

Result: Smooth, performant animations that enhance the "cathedral being constructed" narrative without causing performance issues.`,
    achievements: [
      "useScrollReveal<T> custom hook with IntersectionObserver",
      "Threshold 0.1, rootMargin -40px (bottom)",
      "Fires once per element (not on every scroll)",
      "Staggered delays (100-600ms per element)",
      "Respects prefers-reduced-motion for accessibility",
      "animate-rise keyframe (0.6s cubic-bezier)",
    ],
  },
];

export default function CaseStudies() {
  return (
    <PublicLayout>
      <Helmet>
        <title>Case Studies | UnifyOne Documentation</title>
        <meta
          name="description"
          content="Detailed case studies of UnifyOne platform features: Cathedral Framework, Kai, multi-tenant architecture, Stripe CAPI bridge, and scroll reveals."
        />
        <link rel="canonical" href={`${SITE_URL}/documents/case-studies`} />
        <meta
          property="og:title"
          content="Case Studies | UnifyOne Documentation"
        />
        <meta
          property="og:description"
          content="Detailed case studies of major platform features and integrations."
        />
        <meta
          property="og:url"
          content={`${SITE_URL}/documents/case-studies`}
        />
        <meta
          name="twitter:title"
          content="Case Studies | UnifyOne Documentation"
        />
        <meta
          name="twitter:description"
          content="Detailed case studies of major platform features and integrations."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "UnifyOne Case Studies",
            description:
              "Detailed case studies of major platform features and integrations.",
            url: `${SITE_URL}/documents/case-studies`,
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: SITE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Documentation",
                  item: `${SITE_URL}/documents`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "Case Studies",
                  item: `${SITE_URL}/documents/case-studies`,
                },
              ],
            },
          })}
        </script>
      </Helmet>

      <section
        style={{
          backgroundColor: "#020202",
          minHeight: "100vh",
          paddingTop: "6rem",
          paddingBottom: "4rem",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="inscription block mb-4">CASE STUDIES</span>
            <h1
              className="font-cinzel text-4xl sm:text-5xl font-bold mb-6"
              style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
            >
              How businesses scale with UnifyOne
            </h1>
            <p
              className="font-crimson text-lg max-w-2xl mx-auto"
              style={{ color: "#9A9A9A", lineHeight: 1.8 }}
            >
              Detailed technical case studies of major platform features,
              architectural decisions, and integrations.
            </p>
          </div>

          <div id="featured-case-studies" className="mb-16">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p
                  className="font-cinzel text-xs font-bold"
                  style={{ color: "#7A7A7A", letterSpacing: "0.16em" }}
                >
                  OPERATOR OUTCOMES
                </p>
                <h2
                  className="font-cinzel text-2xl font-bold mt-2"
                  style={{ color: "#D4A843" }}
                >
                  Featured business case studies
                </h2>
              </div>
              <p
                className="font-crimson max-w-2xl text-sm"
                style={{ color: "#A0A0A0", lineHeight: 1.7 }}
              >
                High-signal teasers for the operators, agencies, and
                automation-heavy teams using UnifyOne to scale faster.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {BUSINESS_CASE_STUDIES.map(study => (
                <Card
                  key={study.id}
                  id={study.id}
                  className="border-[#d4a84333] bg-[#0d0d0d] text-left"
                >
                  <CardHeader className="space-y-4">
                    <Badge className="w-fit bg-[#d4a8431a] text-[#D4A843] hover:bg-[#d4a8431a]">
                      {study.badge}
                    </Badge>
                    <div className="space-y-2">
                      <CardTitle
                        className="font-cinzel text-xl leading-snug"
                        style={{ color: "#F0E8D0" }}
                      >
                        {study.headline}
                      </CardTitle>
                      <p
                        className="font-crimson text-sm"
                        style={{ color: "#A0A0A0", lineHeight: 1.7 }}
                      >
                        {study.subtitle}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-3">
                      {study.metrics.map(metric => (
                        <div
                          key={metric.label}
                          className="rounded-lg border border-[#d4a84322] bg-[#121212] px-4 py-3 font-crimson text-sm"
                          style={{ color: "#C0C0C0" }}
                        >
                          <span
                            className="font-semibold"
                            style={{ color: "#F0E8D0" }}
                          >
                            {metric.value}
                          </span>{" "}
                          {metric.label}
                        </div>
                      ))}
                    </div>
                    <Button asChild className="font-cinzel tracking-[0.08em]">
                      <a href={`#${study.id}`}>Read Full Story →</a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Case Studies */}
          <div className="space-y-12">
            {CASE_STUDIES.map(study => (
              <div
                key={study.id}
                style={{
                  backgroundColor: "rgba(212,168,67,0.02)",
                  border: "1px solid rgba(212,168,67,0.1)",
                  padding: "2.5rem",
                }}
              >
                {/* Title */}
                <h2
                  className="font-cinzel text-2xl font-bold mb-2"
                  style={{ color: "#D4A843" }}
                >
                  {study.title}
                </h2>
                <p
                  className="font-crimson text-sm mb-6"
                  style={{ color: "#7A7A7A" }}
                >
                  {study.subtitle}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {study.metrics.map((metric, idx) => (
                    <div key={idx} style={{ textAlign: "center" }}>
                      <div
                        className="font-cinzel text-xl font-bold"
                        style={{ color: "#D4A843" }}
                      >
                        {metric.value}
                      </div>
                      <div
                        className="font-crimson text-xs mt-1"
                        style={{ color: "#7A7A7A" }}
                      >
                        {metric.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div
                  className="font-crimson text-base mb-8"
                  style={{
                    color: "#C0C0C0",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {study.description}
                </div>

                {/* Achievements */}
                <div>
                  <h3
                    className="font-cinzel text-sm font-bold mb-4"
                    style={{
                      color: "#D4A843",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Key Achievements
                  </h3>
                  <ul className="space-y-2">
                    {study.achievements.map((achievement, idx) => (
                      <li
                        key={idx}
                        className="font-crimson text-sm"
                        style={{ color: "#A0A0A0" }}
                      >
                        <span style={{ color: "#D4A843", marginRight: "8px" }}>
                          ✓
                        </span>
                        {achievement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
