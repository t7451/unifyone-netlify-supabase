import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  LineChart,
  ShieldCheck,
  Sparkles,
  Table as TableIcon,
} from "lucide-react";

import PageHead from "@/components/PageHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SITE_URL } from "@/lib/siteConfig";
import { trpc } from "@/lib/trpc";
import { trackCheckoutStart } from "@/lib/behaviorTracking";

const CANONICAL = `${SITE_URL}/clips`;
const TITLE = "1Commerce Gen AI Research Toolkit";
const DESCRIPTION =
  "Funding analysis of 41 generative AI video startups — $10.1B raised across 2022–2025. Instant download after checkout.";

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: TITLE,
    description: DESCRIPTION,
    brand: { "@type": "Organization", name: "1Commerce LLC" },
    category: "Market Research",
  },
];

const PREVIEW_ROWS: Array<{
  company: string;
  funding: string;
  category: string;
  year: number;
}> = [
  {
    company: "Runway",
    funding: "$237M",
    category: "Generative Video",
    year: 2023,
  },
  {
    company: "Pika Labs",
    funding: "$135M",
    category: "Text-to-Video",
    year: 2024,
  },
  {
    company: "Synthesia",
    funding: "$156M",
    category: "AI Avatars",
    year: 2023,
  },
  {
    company: "HeyGen",
    funding: "$60M",
    category: "AI Avatars",
    year: 2024,
  },
  {
    company: "Captions",
    funding: "$60M",
    category: "Mobile Video",
    year: 2024,
  },
];

const HIGHLIGHTS = [
  {
    icon: BarChart3,
    title: "41 companies analyzed",
    body: "Curated set of the most-funded generative AI video startups across the 2022–2025 cycle.",
  },
  {
    icon: LineChart,
    title: "$10.1B in tracked funding",
    body: "Round-by-round capital flow with stage, lead investor, and disclosed valuations.",
  },
  {
    icon: ShieldCheck,
    title: "1Commerce-verified sources",
    body: "Every row cross-checked against primary filings and reputable press — no scraped or AI-fabricated data.",
  },
];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default function ClipsToolkit() {
  const productQuery = trpc.clipsToolkit.getProduct.useQuery();
  const createCheckout = trpc.clipsToolkit.createCheckout.useMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "cancelled") {
      setErrorMessage("Checkout was cancelled. Your card was not charged.");
    }
  }, []);

  async function handleBuy() {
    setErrorMessage(null);
    trackCheckoutStart({
      value: (productQuery.data?.priceCents ?? 4900) / 100,
      itemCount: 1,
    });
    try {
      const { url } = await createCheckout.mutateAsync({
        origin: window.location.origin,
      });
      window.location.assign(url);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not start checkout. Please try again.";
      setErrorMessage(message);
    }
  }

  const priceCents = productQuery.data?.priceCents ?? 4900;
  const isLoading = createCheckout.isPending;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title={`${TITLE} | 1Commerce`}
        description={DESCRIPTION}
        canonical={CANONICAL}
        jsonLd={JSON_LD}
      />

      {/* Header */}
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/clips" className="font-semibold tracking-tight">
            <span className="text-[#00D9FF]">1Commerce</span> Research
          </Link>
          <Link
            href="/contact"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Contact
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00D9FF]/30 bg-[#00D9FF]/5 px-3 py-1 text-xs text-[#00D9FF]">
              <Sparkles className="h-3.5 w-3.5" />
              Instant delivery — download immediately after checkout
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              {TITLE}
            </h1>
            <p className="text-lg text-muted-foreground">
              The definitive funding map of the generative AI video wave.
              <span className="text-foreground">
                {" "}
                41 companies, $10.1B raised, 2022–2025
              </span>
              — formatted as a clean Excel workbook you can drop straight into
              your own models.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                onClick={handleBuy}
                disabled={isLoading || !productQuery.data}
                size="lg"
                className="bg-[#00D9FF] font-semibold text-black hover:bg-[#00B8D9]"
              >
                {isLoading
                  ? "Starting checkout…"
                  : `Buy now — ${formatPrice(priceCents)}`}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Download className="h-4 w-4" />
                Instant .xlsx download · No subscription
              </div>
            </div>

            {errorMessage ? (
              <p className="text-sm text-red-500" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </div>

          {/* Metric card */}
          <Card className="border-border/40 bg-card/60">
            <CardContent className="space-y-6 p-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Coverage
                </p>
                <p className="mt-1 text-3xl font-bold">41 companies</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Total funding tracked
                </p>
                <p className="mt-1 text-3xl font-bold">$10.1B</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Window
                </p>
                <p className="mt-1 text-3xl font-bold">2022 — 2025</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Single .xlsx workbook",
                  "Founders, stage, lead investor",
                  "Round amounts in USD",
                  "Citations for every entry",
                ].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#00D9FF]" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-t border-border/40 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="border-border/40">
                <CardContent className="space-y-3 p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00D9FF]/10">
                    <Icon className="h-5 w-5 text-[#00D9FF]" />
                  </div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-center gap-3">
          <TableIcon className="h-5 w-5 text-[#00D9FF]" />
          <h2 className="text-2xl font-semibold">Sample rows</h2>
        </div>
        <div className="overflow-hidden rounded-lg border border-border/40">
          <table className="w-full text-left text-sm">
            <thead className="bg-card/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Latest Round</th>
                <th className="px-4 py-3">Year</th>
              </tr>
            </thead>
            <tbody>
              {PREVIEW_ROWS.map(row => (
                <tr key={row.company} className="border-t border-border/40">
                  <td className="px-4 py-3 font-medium">{row.company}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.category}
                  </td>
                  <td className="px-4 py-3">{row.funding}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.year}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Preview rows are a small sample. The full workbook contains all 41
          companies with complete funding history and citations.
        </p>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold">Skip the spreadsheet assembly.</h2>
          <p className="mt-3 text-muted-foreground">
            One purchase. One workbook. Delivered the moment your payment clears
            — no email confirmations to wait on, no login to create.
          </p>
          <Button
            onClick={handleBuy}
            disabled={isLoading || !productQuery.data}
            size="lg"
            className="mt-6 bg-[#00D9FF] font-semibold text-black hover:bg-[#00B8D9]"
          >
            {isLoading
              ? "Starting checkout…"
              : `Buy now — ${formatPrice(priceCents)}`}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-muted-foreground">
          © 2026 1Commerce LLC. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
