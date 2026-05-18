import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

/**
 * UnifyOne Design System — public reference page documenting the
 * Cathedral Framework design tokens that power the product UI. Tokens
 * themselves live in `client/src/index.css`; this page is the canonical
 * human-readable view of them.
 */

const CANONICAL = `${SITE_URL}/design-system`;

const STONE_PALETTE: Array<{
  token: string;
  value: string;
  description: string;
}> = [
  {
    token: "--stone-void",
    value: "#020202",
    description: "Absolute void — deepest background",
  },
  {
    token: "--stone-crypt",
    value: "#080808",
    description: "Crypt level — section backgrounds",
  },
  {
    token: "--stone-nave",
    value: "#0e0e0e",
    description: "Nave floor — card backgrounds",
  },
  {
    token: "--stone-wall",
    value: "#161616",
    description: "Wall stone — elevated surfaces",
  },
  {
    token: "--stone-mortar",
    value: "#242424",
    description: "Mortar lines — borders",
  },
  {
    token: "--stone-carved",
    value: "#3a3a3a",
    description: "Carved detail — muted borders",
  },
  {
    token: "--stone-worn",
    value: "#5a5a5a",
    description: "Worn stone — secondary text",
  },
  {
    token: "--stone-pale",
    value: "#9a9a9a",
    description: "Pale stone — muted text",
  },
];

const GOLD_PALETTE: Array<{
  token: string;
  value: string;
  description: string;
}> = [
  {
    token: "--gold-apex",
    value: "#f0d080",
    description: "Apex light — brightest gold, top of arch",
  },
  {
    token: "--gold-illuminate",
    value: "#d4a843",
    description: "Illuminated — primary gold",
  },
  {
    token: "--gold-warm",
    value: "#b8872a",
    description: "Warm gold — hover states",
  },
  {
    token: "--gold-deep",
    value: "#8a6018",
    description: "Deep gold — pressed states",
  },
  {
    token: "--gold-ember",
    value: "#4a3008",
    description: "Ember — very subtle gold tint",
  },
  {
    token: "--gold-trace",
    value: "#2a1c04",
    description: "Trace — barely-there gold background",
  },
];

const SEMANTIC_TOKENS: Array<{
  name: string;
  swatchClass: string;
  usage: string;
}> = [
  {
    name: "background",
    swatchClass: "bg-background border-border",
    usage: "App canvas",
  },
  {
    name: "foreground",
    swatchClass: "bg-foreground",
    usage: "Primary text on background",
  },
  {
    name: "card",
    swatchClass: "bg-card border-border",
    usage: "Card / popover surfaces",
  },
  {
    name: "primary",
    swatchClass: "bg-primary",
    usage: "Primary CTAs, focus rings",
  },
  {
    name: "secondary",
    swatchClass: "bg-secondary",
    usage: "Secondary buttons, chips",
  },
  {
    name: "muted",
    swatchClass: "bg-muted",
    usage: "Muted backgrounds and dividers",
  },
  {
    name: "accent",
    swatchClass: "bg-accent",
    usage: "Highlights, active nav, hover",
  },
  {
    name: "destructive",
    swatchClass: "bg-destructive",
    usage: "Destructive actions, errors",
  },
  {
    name: "border",
    swatchClass: "bg-border",
    usage: "Default border color",
  },
  {
    name: "ring",
    swatchClass: "bg-ring",
    usage: "Focus-visible ring",
  },
];

const SPACING_SCALE: Array<{ token: string; rem: string; px: string }> = [
  { token: "1", rem: "0.25rem", px: "4px" },
  { token: "2", rem: "0.5rem", px: "8px" },
  { token: "3", rem: "0.75rem", px: "12px" },
  { token: "4", rem: "1rem", px: "16px" },
  { token: "6", rem: "1.5rem", px: "24px" },
  { token: "8", rem: "2rem", px: "32px" },
  { token: "12", rem: "3rem", px: "48px" },
  { token: "16", rem: "4rem", px: "64px" },
];

const RADII: Array<{ token: string; value: string; note: string }> = [
  {
    token: "--radius",
    value: "0px",
    note: "Base — Cathedral geometry favors squared corners",
  },
  { token: "--radius-sm", value: "calc(var(--radius) - 4px)", note: "Inputs" },
  { token: "--radius-md", value: "calc(var(--radius) - 2px)", note: "Buttons" },
  { token: "--radius-lg", value: "var(--radius)", note: "Cards" },
  {
    token: "--radius-xl",
    value: "calc(var(--radius) + 4px)",
    note: "Hero panels",
  },
];

const JSON_LD = buildWebPageJsonLd({
  canonical: CANONICAL,
  name: "UnifyOne Design System",
  description:
    "The UnifyOne design system documents the Cathedral Framework — color palette, typography, spacing, radii, and component library — for designers and engineers building on UnifyOne.",
  breadcrumbs: [{ name: "Design System", item: CANONICAL }],
});

function ColorSwatch({
  token,
  value,
  description,
}: {
  token: string;
  value: string;
  description: string;
}) {
  return (
    <div className="stone-card flex flex-col">
      <div
        aria-hidden="true"
        className="h-20 w-full"
        style={{ backgroundColor: value }}
      />
      <div className="p-4 space-y-1">
        <code className="text-xs text-gold font-mono">{token}</code>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          {value}
        </div>
        <p className="text-sm text-foreground/80">{description}</p>
      </div>
    </div>
  );
}

function SemanticSwatch({
  name,
  swatchClass,
  usage,
}: {
  name: string;
  swatchClass: string;
  usage: string;
}) {
  return (
    <div className="stone-card flex flex-col">
      <div
        aria-hidden="true"
        className={`h-16 w-full border-b border-border ${swatchClass}`}
      />
      <div className="p-4 space-y-1">
        <code className="text-xs text-gold font-mono">{name}</code>
        <p className="text-sm text-foreground/80">{usage}</p>
      </div>
    </div>
  );
}

const SECTIONS: Array<{ id: string; label: string }> = [
  { id: "principles", label: "Principles" },
  { id: "color", label: "Color" },
  { id: "typography", label: "Typography" },
  { id: "layout", label: "Layout" },
  { id: "motion", label: "Motion" },
  { id: "components", label: "Components" },
  { id: "implementation", label: "Implementation" },
];

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-10 max-w-3xl">
      <div className="inscription mb-3">{eyebrow}</div>
      <h2 className="font-cinzel text-3xl md:text-4xl text-foreground mb-3">
        {title}
      </h2>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </header>
  );
}

export default function DesignSystem() {
  return (
    <PublicLayout>
      <PageHead
        title="Design System | UnifyOne"
        description="The UnifyOne design system — Cathedral Framework tokens for color, typography, spacing, and radii, plus the full component library used across the product."
        canonical={CANONICAL}
        jsonLd={JSON_LD}
      />

      {/* Hero */}
      <section className="relative cathedral-bg border-b border-border">
        <div className="apex-light absolute inset-0 pointer-events-none" />
        <div className="container mx-auto px-6 py-20 md:py-28 relative">
          <div className="max-w-3xl">
            <div className="inscription mb-4">The Cathedral Framework</div>
            <h1 className="font-cinzel text-4xl md:text-6xl leading-tight mb-6">
              <span className="gradient-gold">UnifyOne</span> Design System
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              The canonical reference for color, typography, spacing, motion,
              and components that power the UnifyOne product surface. Every
              token here is wired into Tailwind and consumed by the component
              library — change a token, change the system.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/components">Browse component library</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="#principles">Jump to tokens</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              <Badge variant="outline">Tailwind CSS 4</Badge>
              <Badge variant="outline">shadcn/ui · Radix</Badge>
              <Badge variant="outline">OKLCH color space</Badge>
              <Badge variant="outline">Dark-first</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* In-page TOC */}
      <nav
        aria-label="Design system sections"
        className="sticky top-16 z-30 border-b border-border bg-background/85 backdrop-blur"
      >
        <div className="container mx-auto px-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 py-3 text-xs">
            {SECTIONS.map(s => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inscription text-muted-foreground hover:text-gold transition-colors"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Principles */}
      <section
        id="principles"
        className="container mx-auto px-6 py-16 md:py-20 scroll-mt-24"
      >
        <SectionHeader
          eyebrow="Principles"
          title="Sequential, structural, built to endure"
          description="UnifyOne's interface is dark-first and gold-led. Surfaces are stone — quiet, layered, load-bearing. Color is structural, not decorative. Motion is restrained. Geometry is squared, like cathedral stone."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Dark by default",
              body: "Backgrounds descend from void to nave, building visual hierarchy through depth rather than borders. Tokens are defined once and reused everywhere.",
            },
            {
              title: "Gold is intent",
              body: "Illuminated gold marks action, focus, and brand. Use it sparingly so it always reads as a signal — never as a decoration.",
            },
            {
              title: "Geometry over ornament",
              body: "Squared corners, hairline borders, and Cinzel inscriptions echo the architectural identity. Avoid arbitrary radii and gradients.",
            },
          ].map(p => (
            <Card key={p.title} className="stone-card">
              <CardHeader>
                <CardTitle className="font-cinzel text-xl text-gold-apex">
                  {p.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {p.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Color */}
      <section
        id="color"
        className="container mx-auto px-6 py-16 md:py-20 scroll-mt-24"
      >
        <SectionHeader
          eyebrow="Color"
          title="Stone & illumination"
          description="Two palettes anchor the system. Stone provides the structural neutrals; gold provides the illuminated highlights. Both are exposed as CSS custom properties and as semantic Tailwind tokens."
        />

        <h3 className="font-cinzel text-xl text-foreground mb-4">
          Stone palette
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {STONE_PALETTE.map(c => (
            <ColorSwatch key={c.token} {...c} />
          ))}
        </div>

        <h3 className="font-cinzel text-xl text-foreground mb-4">
          Illumination palette
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
          {GOLD_PALETTE.map(c => (
            <ColorSwatch key={c.token} {...c} />
          ))}
        </div>

        <h3 className="font-cinzel text-xl text-foreground mb-4">
          Semantic tokens
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
          These are the day-to-day tokens consumed by components via Tailwind
          utilities (e.g. <code className="text-gold">bg-card</code>,{" "}
          <code className="text-gold">text-muted-foreground</code>,{" "}
          <code className="text-gold">ring-ring</code>). They map to the
          underlying palettes above.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SEMANTIC_TOKENS.map(s => (
            <SemanticSwatch key={s.name} {...s} />
          ))}
        </div>
      </section>

      <Separator />

      {/* Typography */}
      <section
        id="typography"
        className="container mx-auto px-6 py-16 md:py-20 scroll-mt-24"
      >
        <SectionHeader
          eyebrow="Typography"
          title="Three voices, one stack"
          description="Cinzel inscribes — used for headings, eyebrows, and brand moments. Inter speaks — the default UI face for buttons, labels, and body. Crimson Pro reads — reserved for long-form editorial."
        />

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="stone-card">
            <CardHeader>
              <CardTitle className="font-cinzel text-2xl text-gold-apex">
                Cinzel
              </CardTitle>
              <CardDescription>
                Display / inscriptions · serif
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="font-cinzel text-4xl tracking-wider">
                UnifyOne
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                .font-cinzel · letter-spacing 0.04em
              </p>
            </CardContent>
          </Card>
          <Card className="stone-card">
            <CardHeader>
              <CardTitle className="text-2xl">Inter</CardTitle>
              <CardDescription>UI / body · sans-serif</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl">The quick brown fox</div>
              <p className="text-xs text-muted-foreground font-mono">
                default body — bg-background text-foreground
              </p>
            </CardContent>
          </Card>
          <Card className="stone-card">
            <CardHeader>
              <CardTitle className="font-crimson text-2xl">
                Crimson Pro
              </CardTitle>
              <CardDescription>Editorial / longform · serif</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-crimson text-lg leading-relaxed">
                Sequential. Structural. Built to endure.
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                .font-crimson
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 stone-card p-6 space-y-4">
          <div className="inscription">Type scale</div>
          <div className="space-y-3">
            <div>
              <h1 className="font-cinzel text-5xl">
                <span className="gradient-gold">Heading 1</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                text-5xl font-cinzel
              </p>
            </div>
            <div>
              <h2 className="font-cinzel text-3xl">Heading 2</h2>
              <p className="text-xs text-muted-foreground font-mono">
                text-3xl font-cinzel
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Heading 3</h3>
              <p className="text-xs text-muted-foreground font-mono">
                text-xl font-semibold
              </p>
            </div>
            <div>
              <p className="text-base">
                Body — the default reading size. Inter, 16px, line-height
                relaxed.
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                text-base
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Muted — supporting copy, captions, helper text.
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                text-sm text-muted-foreground
              </p>
            </div>
            <div>
              <p className="inscription">Inscription · eyebrow label</p>
              <p className="text-xs text-muted-foreground font-mono">
                .inscription
              </p>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Spacing & Radii */}
      <section
        id="layout"
        className="container mx-auto px-6 py-16 md:py-20 scroll-mt-24"
      >
        <SectionHeader
          eyebrow="Layout"
          title="Spacing & geometry"
          description="Spacing follows Tailwind's 4px base scale. Radii are deliberately small — Cathedral geometry favors squared corners that read as carved stone, not soft plastic."
        />

        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="font-cinzel text-xl text-foreground mb-4">
              Spacing scale
            </h3>
            <div className="stone-card p-6 space-y-3">
              {SPACING_SCALE.map(s => (
                <div key={s.token} className="flex items-center gap-4">
                  <code className="text-xs text-gold font-mono w-12">
                    {s.token}
                  </code>
                  <div
                    aria-hidden="true"
                    className="h-3 bg-primary/70"
                    style={{ width: s.rem }}
                  />
                  <div className="text-xs text-muted-foreground font-mono">
                    {s.rem} · {s.px}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-cinzel text-xl text-foreground mb-4">
              Radii
            </h3>
            <div className="stone-card p-6 space-y-3">
              {RADII.map(r => (
                <div key={r.token} className="flex items-center gap-4">
                  <code className="text-xs text-gold font-mono w-32 shrink-0">
                    {r.token}
                  </code>
                  <div className="flex-1 text-xs text-muted-foreground font-mono break-all">
                    {r.value}
                  </div>
                  <div className="text-xs text-foreground/80 hidden sm:block">
                    {r.note}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-3 border-t border-border">
                The base radius is <code className="text-gold">0px</code> by
                design. Components like <code className="text-gold">Card</code>{" "}
                and <code className="text-gold">Button</code> reference these
                tokens so the entire system reshapes from a single value.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Motion */}
      <section
        id="motion"
        className="container mx-auto px-6 py-16 md:py-20 scroll-mt-24"
      >
        <SectionHeader
          eyebrow="Motion"
          title="Restrained, purposeful, never decorative"
          description="Motion in UnifyOne signals state changes and draws the eye toward illumination. Durations are short, easings are gentle, and ambient animation is reserved for loading and brand moments. Honor reduced-motion preferences."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="stone-card">
            <CardHeader>
              <CardTitle className="font-cinzel text-lg text-gold-apex">
                Durations
              </CardTitle>
              <CardDescription>Tailwind transition tokens</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <code className="text-gold font-mono text-xs">
                    duration-150
                  </code>
                  <span className="text-muted-foreground">
                    Hover &amp; focus
                  </span>
                </li>
                <li className="flex justify-between">
                  <code className="text-gold font-mono text-xs">
                    duration-200
                  </code>
                  <span className="text-muted-foreground">
                    Button / link states
                  </span>
                </li>
                <li className="flex justify-between">
                  <code className="text-gold font-mono text-xs">
                    duration-300
                  </code>
                  <span className="text-muted-foreground">
                    Surface transitions
                  </span>
                </li>
                <li className="flex justify-between">
                  <code className="text-gold font-mono text-xs">
                    duration-500
                  </code>
                  <span className="text-muted-foreground">
                    Reveal on scroll
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="stone-card">
            <CardHeader>
              <CardTitle className="font-cinzel text-lg text-gold-apex">
                Easings
              </CardTitle>
              <CardDescription>Standard curves only</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <code className="text-gold font-mono text-xs">
                    ease-out
                  </code>
                  <span className="text-muted-foreground">
                    Default — enter
                  </span>
                </li>
                <li className="flex justify-between">
                  <code className="text-gold font-mono text-xs">
                    ease-in
                  </code>
                  <span className="text-muted-foreground">Exit / dismiss</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-gold font-mono text-xs">
                    ease-in-out
                  </code>
                  <span className="text-muted-foreground">
                    Loops &amp; floats
                  </span>
                </li>
                <li className="flex justify-between">
                  <code className="text-gold font-mono text-xs">linear</code>
                  <span className="text-muted-foreground">
                    Spinners &amp; grids
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="stone-card overflow-hidden">
            <CardHeader>
              <CardTitle className="font-cinzel text-lg text-gold-apex">
                Brand animations
              </CardTitle>
              <CardDescription>
                Reserved for loading &amp; hero moments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative h-16 overflow-hidden border border-border">
                <div className="loading-grid absolute inset-0" aria-hidden />
              </div>
              <ul className="space-y-1 text-xs font-mono">
                <li>
                  <code className="text-gold">.loading-grid</code>
                  <span className="text-muted-foreground"> — ambient pan</span>
                </li>
                <li>
                  <code className="text-gold">.loading-orbit</code>
                  <span className="text-muted-foreground">
                    {" "}
                    — rotation 10s
                  </span>
                </li>
                <li>
                  <code className="text-gold">.loading-float</code>
                  <span className="text-muted-foreground"> — drift 3.8s</span>
                </li>
                <li>
                  <code className="text-gold">.loading-shimmer</code>
                  <span className="text-muted-foreground">
                    {" "}
                    — sweep 2.8s
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground mt-6 max-w-2xl">
          Animations live in <code className="text-gold">client/src/index.css</code>{" "}
          alongside the tokens. Always wrap new motion in a{" "}
          <code className="text-gold">prefers-reduced-motion</code> guard if it
          loops or moves significantly.
        </p>
      </section>

      <Separator />

      {/* Components */}
      <section
        id="components"
        className="container mx-auto px-6 py-16 md:py-20 scroll-mt-24"
      >
        <SectionHeader
          eyebrow="Components"
          title="A library of stone blocks"
          description="The component library is built on shadcn/ui + Radix primitives, restyled with the Cathedral tokens. Every component consumes the semantic tokens above — there is no per-component color."
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="stone-card">
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>
                Primary, secondary, outline, ghost, destructive.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </CardContent>
          </Card>

          <Card className="stone-card">
            <CardHeader>
              <CardTitle>Badges</CardTitle>
              <CardDescription>
                Status chips for plans, states, and labels.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </CardContent>
          </Card>

          <Card className="stone-card">
            <CardHeader>
              <CardTitle>Form controls</CardTitle>
              <CardDescription>
                Input, checkbox, switch — all inherit ring &amp; border tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ds-email">Email</Label>
                <Input
                  id="ds-email"
                  type="email"
                  placeholder="you@1commerce.online"
                />
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="ds-check" defaultChecked />
                <Label htmlFor="ds-check" className="text-sm font-normal">
                  Subscribe to release notes
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="ds-switch" defaultChecked />
                <Label htmlFor="ds-switch" className="text-sm font-normal">
                  Enable automation
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card className="stone-card">
            <CardHeader>
              <CardTitle>Interaction states</CardTitle>
              <CardDescription>
                Hover, focus-visible, disabled — driven entirely by tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button>Default</Button>
                <Button className="hover:bg-primary/90">Hover</Button>
                <Button className="ring-2 ring-ring ring-offset-2 ring-offset-background">
                  Focus
                </Button>
                <Button disabled>Disabled</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Focus rings use <code className="text-gold">--ring</code> with
                an offset against <code className="text-gold">--background</code>{" "}
                for accessibility against any surface.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 stone-card p-8 text-center">
          <div className="inscription mb-3">Full library</div>
          <h3 className="font-cinzel text-2xl mb-3">
            70+ components, one canonical showcase
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6">
            Accordion, alert, avatar, breadcrumb, calendar, carousel, command,
            dialog, dropdown, form, input, popover, sheet, tabs, toast, tooltip
            — every interactive primitive lives in the component library.
          </p>
          <Button asChild>
            <Link href="/components">Open component library →</Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* Implementation */}
      <section
        id="implementation"
        className="container mx-auto px-6 py-16 md:py-24 scroll-mt-24"
      >
        <SectionHeader
          eyebrow="Implementation"
          title="Where the tokens live"
          description="The system is intentionally small and file-local. There is no design-tokens package — Tailwind reads CSS custom properties directly."
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="stone-card">
            <CardHeader>
              <CardTitle className="font-cinzel text-lg text-gold-apex">
                client/src/index.css
              </CardTitle>
              <CardDescription>
                Source of truth for tokens, palettes, and base layer styles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Defines the stone / gold palettes, the semantic mapping
                (background, foreground, primary, etc.), radii, and Cathedral
                utilities like <code className="text-gold">.font-cinzel</code>,{" "}
                <code className="text-gold">.gradient-gold</code>, and{" "}
                <code className="text-gold">.stone-card</code>.
              </p>
            </CardContent>
          </Card>
          <Card className="stone-card">
            <CardHeader>
              <CardTitle className="font-cinzel text-lg text-gold-apex">
                components.json
              </CardTitle>
              <CardDescription>
                shadcn/ui config — New York variant, neutral base, CSS
                variables.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Generated components live under{" "}
                <code className="text-gold">client/src/components/ui/</code>{" "}
                and consume the semantic tokens above. Add new components with
                the standard shadcn workflow — the theme follows automatically.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
