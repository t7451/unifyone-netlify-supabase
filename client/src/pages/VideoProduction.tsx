import { useState } from "react";
import {
  Play,
  Zap,
  Film,
  Award,
  Download,
  Clipboard,
  FileText,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { toast } from "sonner";

const VP_CANONICAL = `${SITE_URL}/video-production`;

type Showcase = {
  id: string;
  title: string;
  description: string;
  duration: string;
  format: string;
  tags: string[];
  category: string;
  thumbnail: string;
  videoUrl?: string;
  storyboard: StoryboardFrame[];
};

type StoryboardFrame = {
  timecode: string;
  title: string;
  visual: string;
  narration: string;
};

const PRIMARY_SHOWCASES: Showcase[] = [
  {
    id: "onestack-cinematic",
    title: "OneStack Cinematic Reel",
    description:
      "Professional cinematic footage showcasing OneStack enterprise AI capabilities. Ultra-realistic production quality demonstrating autonomous operations at scale.",
    duration: "30 seconds",
    format: "4K Cinematic",
    tags: ["Enterprise AI", "Cinematic", "Autonomous Operations"],
    category: "Featured Reel",
    thumbnail: "🎬",
    videoUrl:
      "https://cdn.1commerce.online/videos/Ultra-realistic_cinematic_foot_Kling_30__37390(1).mp4",
    storyboard: [
      {
        timecode: "0:00-0:05",
        title: "Command room opens",
        visual:
          "A dark commerce command floor wakes up with order, payment, and automation panels lighting in sequence.",
        narration:
          "OneStack brings fragmented commerce operations into one live operating layer.",
      },
      {
        timecode: "0:06-0:14",
        title: "Autonomous execution",
        visual:
          "AI agents move cards from research to fulfillment while payment rails verify in the background.",
        narration:
          "Kai handles the repetitive operational work while operators keep final control.",
      },
      {
        timecode: "0:15-0:24",
        title: "Multi-tenant scale",
        visual:
          "Multiple branded storefronts branch from the same platform core, each with isolated data and revenue flows.",
        narration:
          "Each tenant gets its own commerce system without duplicating infrastructure.",
      },
      {
        timecode: "0:25-0:30",
        title: "Final lockup",
        visual:
          "The OneStack mark resolves over a clean dashboard with revenue, fulfillment, and automation signals stable.",
        narration: "One stack. Every channel. Built to operate at scale.",
      },
    ],
  },
];

const ADDITIONAL_SHOWCASES: Showcase[] = [
  {
    id: "multi-tenant-showcase",
    title: "Multi-Tenant Commerce Demo",
    description:
      "Visual walkthrough of multi-tenant isolation, tenant switching, and SaaS scalability features built into the UnifyOne platform.",
    duration: "45 seconds",
    format: "Product Demo",
    tags: ["Multi-Tenant", "SaaS", "Commerce"],
    category: "Platform Story",
    thumbnail: "🏢",
    storyboard: [
      {
        timecode: "0:00-0:07",
        title: "Tenant map",
        visual:
          "A clean operations map shows three storefronts entering UnifyOne through separate tenant lanes.",
        narration:
          "Each brand can run independently while sharing the same commerce backbone.",
      },
      {
        timecode: "0:08-0:18",
        title: "Data isolation",
        visual:
          "Orders, customers, products, and analytics lock into tenant-specific vaults with distinct accent colors.",
        narration:
          "Tenant scoping keeps every customer, order, and report tied to the correct business.",
      },
      {
        timecode: "0:19-0:32",
        title: "Operator dashboard",
        visual:
          "An operator switches from fulfillment to analytics to billing without leaving the dashboard shell.",
        narration:
          "Operators get one command surface for products, payments, team access, and reporting.",
      },
      {
        timecode: "0:33-0:45",
        title: "Scale moment",
        visual:
          "New tenant tiles activate as revenue counters rise and integration badges settle into place.",
        narration:
          "The platform scales by adding tenants, not by rebuilding the business each time.",
      },
    ],
  },
  {
    id: "ai-automation-reel",
    title: "AI Automation Reel",
    description:
      "Showcase of Kai AI executing autonomous tasks: affiliate research, order fulfillment, and n8n workflow automation at enterprise scale.",
    duration: "60 seconds",
    format: "Feature Highlight",
    tags: ["Kai AI", "Automation", "n8n"],
    category: "Automation",
    thumbnail: "🤖",
    storyboard: [
      {
        timecode: "0:00-0:10",
        title: "Morning queue",
        visual:
          "A packed operations inbox is sorted into orders, leads, refunds, content, and follow-up tasks.",
        narration:
          "Kai starts with the queue, separates urgent work, and prepares the next best actions.",
      },
      {
        timecode: "0:11-0:25",
        title: "Workflow handoff",
        visual:
          "n8n workflow cards trigger in sequence: lead capture, fulfillment ping, Meta CAPI event, notification.",
        narration:
          "Automation handles the handoffs that usually disappear between tools.",
      },
      {
        timecode: "0:26-0:45",
        title: "Human approval",
        visual:
          "Kai presents a concise action summary with approve, edit, and hold controls beside the workflow timeline.",
        narration:
          "The system moves fast, but operators keep approval over revenue-sensitive actions.",
      },
      {
        timecode: "0:46-1:00",
        title: "Closed loop",
        visual:
          "Task cards collapse into completed states while analytics update with saved hours and revenue impact.",
        narration: "Every completed automation feeds the next decision loop.",
      },
    ],
  },
  {
    id: "payment-integration",
    title: "Payment Infrastructure Demo",
    description:
      "End-to-end payment flow demonstration across Stripe, PayPal, Shopify, and Square — unified under a single dashboard with real-time analytics.",
    duration: "30 seconds",
    format: "Integration Demo",
    tags: ["Stripe", "Payments", "Analytics"],
    category: "Payments",
    thumbnail: "💳",
    storyboard: [
      {
        timecode: "0:00-0:05",
        title: "Checkout start",
        visual:
          "A customer begins checkout while Stripe, PayPal, Square, and Shopify rails appear as selectable routes.",
        narration:
          "UnifyOne lets operators support the payment rails customers already trust.",
      },
      {
        timecode: "0:06-0:14",
        title: "Provider verification",
        visual:
          "Payment IDs validate against provider APIs, then flow into an order record with audit metadata attached.",
        narration:
          "Captured payments are connected back to provider records for reconciliation and support.",
      },
      {
        timecode: "0:15-0:23",
        title: "Webhook confirmation",
        visual:
          "Webhook events arrive, signature checks pass, and payment status changes from pending to paid.",
        narration:
          "Verified webhooks keep the order book aligned with real payment events.",
      },
      {
        timecode: "0:24-0:30",
        title: "Revenue dashboard",
        visual:
          "The dashboard updates revenue, payment status, fulfillment queue, and attribution metrics in one view.",
        narration:
          "Finance, fulfillment, and marketing see the same source of truth.",
      },
    ],
  },
];

const SHOWCASE_LIBRARY: Showcase[] = [
  ...PRIMARY_SHOWCASES,
  ...ADDITIONAL_SHOWCASES,
];

export default function VideoProduction() {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [storyboardOpen, setStoryboardOpen] = useState(false);
  const [activeShowcaseId, setActiveShowcaseId] =
    useState("onestack-cinematic");

  const activeShowcase: Showcase =
    SHOWCASE_LIBRARY.find(showcase => showcase.id === activeShowcaseId) ??
    SHOWCASE_LIBRARY[0];
  const videoUrl = activeShowcase.videoUrl ?? undefined;
  const isPlayable = Boolean(videoUrl);

  const storyboardText = buildStoryboardText(activeShowcase);

  const handleSelectShowcase = (id: string) => {
    setActiveShowcaseId(id);
    setVideoPlaying(false);
  };

  const handleDownload = () => {
    if (!videoUrl) {
      const blob = new Blob([storyboardText], {
        type: "text/markdown;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeShowcase.title.replace(/\s+/g, "-").toLowerCase()}-storyboard.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${activeShowcase.title.replace(/\s+/g, "-").toLowerCase()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyEmbed = () => {
    if (!videoUrl) {
      navigator.clipboard.writeText(storyboardText).then(
        () => toast.success("Storyboard copied to clipboard!"),
        () => toast.error("Failed to copy storyboard")
      );
      return;
    }

    const embedCode = `<video src="${videoUrl}" autoplay loop muted playsinline style="width:100%;height:auto"></video>`;
    navigator.clipboard.writeText(embedCode).then(
      () => toast.success("Embed code copied to clipboard!"),
      () => toast.error("Failed to copy embed code")
    );
  };

  function buildStoryboardText(showcase: Showcase) {
    return [
      `# ${showcase.title}`,
      "",
      showcase.description,
      "",
      `- Duration: ${showcase.duration}`,
      `- Format: ${showcase.format}`,
      `- Category: ${showcase.category}`,
      `- Tags: ${showcase.tags.join(", ")}`,
      "",
      "## Shot List",
      "",
      ...showcase.storyboard.flatMap(frame => [
        `### ${frame.timecode} - ${frame.title}`,
        `Visual: ${frame.visual}`,
        `Narration: ${frame.narration}`,
        "",
      ]),
    ].join("\n");
  }

  const productionStats = [
    {
      label: "Production Quality",
      value: isPlayable ? "4K Ultra-Realistic" : "Storyboard Preview",
    },
    { label: "Format", value: activeShowcase.format },
    { label: "Duration", value: activeShowcase.duration },
    { label: "Category", value: activeShowcase.category },
  ];

  const useCases = [
    {
      title: "Landing Page Hero",
      description:
        "Embed the cinematic reel as an autoplay hero video on product landing pages to demonstrate OneStack capabilities in real-time.",
      icon: "🎯",
    },
    {
      title: "Social Media",
      description:
        "Repurpose for Instagram Reels, TikTok, and LinkedIn video posts. Ultra-realistic footage captures attention and drives engagement.",
      icon: "📱",
    },
    {
      title: "Pitch Decks",
      description:
        "Include in investor presentations and sales decks to showcase enterprise-grade production quality and autonomous operations.",
      icon: "💼",
    },
    {
      title: "Email Campaigns",
      description:
        "Embed in email campaigns with animated GIF fallback for maximum reach across email clients.",
      icon: "📧",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHead
        title="Video Production | UnifyOne"
        description="OneStack Cinematic — professional AI-generated video assets for landing pages, social media, pitch decks, and email campaigns. Ultra-realistic quality."
        canonical={VP_CANONICAL}
        jsonLd={buildWebPageJsonLd({
          canonical: VP_CANONICAL,
          name: "Video Production | UnifyOne",
          description:
            "OneStack Cinematic — professional AI-generated video assets for landing pages, social media, pitch decks, and email campaigns.",
          breadcrumbs: [{ name: "Video Production", item: VP_CANONICAL }],
        })}
      />
      <section className="relative bg-gradient-to-b from-card to-background py-16">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black shadow-2xl">
                {isPlayable ? (
                  !videoPlaying ? (
                    <>
                      <video
                        src={videoUrl}
                        className="h-full w-full object-cover"
                        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'%3E%3Crect fill='%23000' width='1920' height='1080'/%3E%3C/svg%3E"
                      />
                      <button
                        onClick={() => setVideoPlaying(true)}
                        className="group absolute inset-0 flex items-center justify-center bg-black/40 transition-colors hover:bg-black/50"
                      >
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary transition-transform group-hover:scale-110">
                          <Play className="ml-1 h-8 w-8 fill-black text-black" />
                        </div>
                      </button>
                    </>
                  ) : (
                    <video
                      src={videoUrl}
                      autoPlay
                      controls
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full flex-col justify-center gap-4 bg-gradient-to-br from-muted via-card to-background px-6 py-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                        <ListChecks className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-foreground">
                          Storyboard ready
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Review the shot list, narration, and production beats
                          while the final video asset is being published.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {activeShowcase.storyboard.slice(0, 3).map(frame => (
                        <button
                          key={frame.timecode}
                          onClick={() => setStoryboardOpen(true)}
                          className="w-full rounded-md border border-border bg-background/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-background"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {frame.timecode}
                            </Badge>
                            <span className="truncate text-sm font-semibold text-foreground">
                              {frame.title}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {frame.visual}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="border-primary/40 bg-primary/20 text-primary">
                  <Film className="mr-1 h-3 w-3" />
                  {activeShowcase.format}
                </Badge>
                <Badge variant="outline">{activeShowcase.duration}</Badge>
                <Badge variant="outline">{activeShowcase.category}</Badge>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <div>
                <h1 className="mb-4 text-4xl font-bold text-foreground">
                  {activeShowcase.title}
                </h1>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  {activeShowcase.description}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">
                  Production Specifications
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {productionStats.map(stat => (
                    <div
                      key={stat.label}
                      className="bg-card border border-border rounded-lg p-3"
                    >
                      <p className="text-xs text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="font-semibold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button size="lg" className="gap-2" onClick={handleDownload}>
                  <Download className="w-4 h-4" />
                  {isPlayable ? "Download Video" : "Download Storyboard"}
                </Button>
                <Button variant="outline" size="lg" onClick={handleCopyEmbed}>
                  <Clipboard className="mr-2 h-4 w-4" />
                  {isPlayable ? "Copy Embed Code" : "Copy Shot List"}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setStoryboardOpen(true)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Storyboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase Library */}
      <section className="py-16 border-t border-border">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Showcase Library
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Production-grade video assets ready to deploy across your
              marketing channels.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SHOWCASE_LIBRARY.map(showcase => {
              const isActive = showcase.id === activeShowcaseId;
              const isShowcasePlayable = Boolean(showcase.videoUrl);

              return (
                <Card
                  key={showcase.id}
                  className={`cursor-pointer p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${
                    isActive ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleSelectShowcase(showcase.id)}
                >
                  <div className="relative mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border bg-gradient-to-br from-muted via-card to-background">
                    <div className="absolute left-3 top-3 rounded-full border border-primary/20 bg-background/80 px-2 py-1 text-sm">
                      {showcase.thumbnail}
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-black shadow-lg">
                      <Play className="ml-0.5 h-5 w-5 fill-current" />
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <Badge variant="outline" className="bg-background/80">
                        {isShowcasePlayable ? "Playable" : "Storyboard"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge className="border-primary/40 bg-primary/15 text-primary">
                      {showcase.category}
                    </Badge>
                    <Badge variant="outline">{showcase.format}</Badge>
                    <Badge variant="outline">{showcase.duration}</Badge>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {showcase.title}
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {showcase.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {showcase.tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-primary/10 text-primary"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-5 w-full gap-2"
                    onClick={event => {
                      event.stopPropagation();
                      handleSelectShowcase(showcase.id);
                      setStoryboardOpen(true);
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View Storyboard
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <Dialog open={storyboardOpen} onOpenChange={setStoryboardOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {activeShowcase.title} Storyboard
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                {activeShowcase.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{activeShowcase.duration}</Badge>
                <Badge variant="outline">{activeShowcase.format}</Badge>
                <Badge variant="outline">{activeShowcase.category}</Badge>
              </div>
            </div>

            <div className="space-y-3">
              {activeShowcase.storyboard.map(frame => (
                <div
                  key={frame.timecode}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge className="bg-primary/15 font-mono text-primary">
                      {frame.timecode}
                    </Badge>
                    <h3 className="text-base font-semibold text-foreground">
                      {frame.title}
                    </h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Visual
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {frame.visual}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Narration
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {frame.narration}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={handleCopyEmbed}>
                <Clipboard className="mr-2 h-4 w-4" />
                {isPlayable ? "Copy Embed Code" : "Copy Shot List"}
              </Button>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                {isPlayable ? "Download Video" : "Download Storyboard"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Use Cases */}
      <section className="py-16 border-t border-border">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Use Cases
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Deploy the OneStack cinematic reel across your marketing channels
              to showcase enterprise-grade production quality and autonomous
              capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map(useCase => (
              <Card
                key={useCase.title}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-3xl mb-4">{useCase.icon}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {useCase.title}
                </h3>
                <p className="text-muted-foreground">{useCase.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Production Details */}
      <section className="py-16 bg-card border-t border-border">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Award className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">
                Premium Quality
              </h3>
              <p className="text-sm text-muted-foreground">
                Ultra-realistic 4K cinematic production showcasing
                enterprise-grade visual standards.
              </p>
            </div>
            <div className="text-center">
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">
                Optimized Format
              </h3>
              <p className="text-sm text-muted-foreground">
                Compressed for web delivery while maintaining visual fidelity
                across all platforms.
              </p>
            </div>
            <div className="text-center">
              <Film className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">
                Versatile Asset
              </h3>
              <p className="text-sm text-muted-foreground">
                Deploy on landing pages, social media, email campaigns, and
                pitch decks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-border">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Showcase OneStack?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Download the cinematic reel and integrate it into your marketing
            channels. This production-grade asset is ready to deploy
            immediately.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2" onClick={handleDownload}>
              <Film className="w-4 h-4" />
              Download Video (5 MB)
            </Button>
            <Button variant="outline" size="lg" onClick={handleCopyEmbed}>
              Copy Embed Code
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
