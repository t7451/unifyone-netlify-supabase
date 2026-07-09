import { useState } from "react";
import { Copy, Download, Filter, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const AD_COPY_CANONICAL = `${SITE_URL}/marketing/ad-copy`;

interface AdCopy {
  id: string;
  campaign: string;
  platform: string;
  format: string;
  headline: string;
  subheadline: string;
  body: string;
  cta: string;
  charCount: number;
  voiceRatio: string;
  element: string;
  hook: string;
}

const AD_COPIES: AdCopy[] = [
  {
    id: "awareness-chaos-google",
    campaign: "AWARENESS_CHAOS",
    platform: "Google",
    format: "Search",
    headline: "Unified Commerce Infrastructure | UnifyOne",
    subheadline: "Know what you earn. Keep what you owe.",
    body: "Stop duct-taping Shopify to QuickBooks to Mailchimp. UnifyOne is the unified commerce infrastructure built for mid-market & enterprise operators who refuse to be limited.",
    cta: "Start Free — No Card",
    charCount: 980,
    voiceRatio: "50S/50C",
    element: "Full 4-Phase",
    hook: "Direct solution",
  },
  {
    id: "consideration-cathedral-meta",
    campaign: "CONSIDERATION_CATHEDRAL",
    platform: "Meta",
    format: "Carousel",
    headline: "4 Phases to Quit Manual.",
    subheadline: "Foundation → Revenue → Systems → Scale.",
    body: "Slide 1: FOUNDATION—Stop the duct tape. Infrastructure setup. MCP connections. Security hooks. Slide 2: REVENUE—Automate the flow. Client mesh. Affiliate dashboard. Retainer pipeline. Slide 3: SYSTEMS—AI orchestration. Cross-store sync. SEO engine. n8n automation. Slide 4: SCALE—Five subsidiaries. One AI. Infinite reach.",
    cta: "Start Phase 1",
    charCount: 2100,
    voiceRatio: "40S/60C",
    element: "Full Framework",
    hook: "Sequential promise",
  },
  {
    id: "consideration-cathedral-linkedin",
    campaign: "CONSIDERATION_CATHEDRAL",
    platform: "LinkedIn",
    format: "Document",
    headline: "The Cathedral Principle Playbook.",
    subheadline: "Sequential construction for enterprise systems.",
    body: "Most startups skip the foundation. You built the cathedral. 6 months of architectural groundwork before driving traffic. The result? 30X faster output. $0.14 cost per view. 5 subsidiaries on 1 AI.",
    cta: "Download Free",
    charCount: 1350,
    voiceRatio: "30S/70C",
    element: "Core Methodology",
    hook: "Authority positioning",
  },
  {
    id: "consideration-cathedral-instagram",
    campaign: "CONSIDERATION_CATHEDRAL",
    platform: "Instagram",
    format: "Story",
    headline: "Which phase are you stuck in?",
    subheadline: "Foundation / Revenue / Systems / Scale",
    body: "Poll: Tap your bottleneck. We'll send you the exact playbook for that phase.",
    cta: "Get My Phase",
    charCount: 320,
    voiceRatio: "80S/20C",
    element: "Interactive Framework",
    hook: "Self-selection",
  },
  {
    id: "decision-excellence-meta",
    campaign: "DECISION_EXCELLENCE",
    platform: "Meta/LinkedIn",
    format: "Video 16:9",
    headline: "Stop Managing Chaos. Start Engineering Excellence.",
    subheadline: "One AI. Five subsidiaries. Zero manual reporting.",
    body: "I spent 6 months building a $10M business structure. No employees. No venture capital. Just one AI operating system and the Cathedral Principle. 30X faster proposals. 60X efficiency gaps caught. 9 posts auto-refined. This isn't theoretical. You just watched it live.",
    cta: "Claim Your Nave",
    charCount: 1180,
    voiceRatio: "50S/50C",
    element: "Scale Phase Offer",
    hook: "Founder proof",
  },
  {
    id: "decision-excellence-linkedin",
    campaign: "DECISION_EXCELLENCE",
    platform: "LinkedIn",
    format: "Message Ad",
    headline: "Keith—ready to own the machine?",
    subheadline: "Not the mountain. The machine that mines it.",
    body: "The barrier to capital has collapsed. The barrier to competence has not. If you're still doing manual reports, copying between dashboards, or making decisions on yesterday's data—you're managing chaos. I built UnifyOne to engineer excellence instead. 5 subsidiaries. 1 AI. Zero Slack emergencies.",
    cta: "Reply EXCELLENCE",
    charCount: 890,
    voiceRatio: "75S/25C",
    element: "Sovereign Philosophy",
    hook: "Founder direct",
  },
  {
    id: "decision-excellence-google",
    campaign: "DECISION_EXCELLENCE",
    platform: "Google",
    format: "Display",
    headline: "From $1K to $250K/MO",
    subheadline: "Month 1-3: Foundation. Month 6-12: $50K. Month 12-36: $250K.",
    body: "The roadmap is sequential. The results are real. UnifyOne's Revenue Architecture has helped operators scale from $1K to $250K monthly recurring revenue—without hiring a team.",
    cta: "See the Roadmap",
    charCount: 760,
    voiceRatio: "60S/40C",
    element: "Revenue Architecture",
    hook: "Aspirational metric",
  },
  {
    id: "retention-upgrade-meta",
    campaign: "RETENTION_UPGRADE",
    platform: "Meta/LinkedIn",
    format: "Video",
    headline: "You Tracked Your Miles. Now Keep More of Them.",
    subheadline: "Upgrade to Pro. GigIQ shift intelligence. Tax Autopilot.",
    body: "You've logged the gigs. You've watched your earnings. Now it's time to keep more of what you make. Pro unlocks GigIQ shift intelligence to chase the best-paying hours, Tax Autopilot to set aside and file your 1099 taxes, and Money Manager to see every dollar across DoorDash, Uber, Lyft, Instacart, and Amazon Flex — all for $4.99/month.",
    cta: "Upgrade to Pro",
    charCount: 920,
    voiceRatio: "30S/70C",
    element: "Pro Upgrade",
    hook: "Earnings milestone",
  },
  {
    id: "retargeting-visitor-meta",
    campaign: "RETARGETING_VISITOR",
    platform: "Meta",
    format: "Dynamic",
    headline: "Still managing chaos?",
    subheadline: "You visited UnifyOne. Here's what you missed.",
    body: "You saw the architecture. You saw the 4 phases. But you haven't seen Claude automate a LinkedIn proposal in 60 seconds. Or catch a 60X ad efficiency gap. Or refine 9 content posts with performance data. The demos are live. The waitlist is open.",
    cta: "Watch the Demos",
    charCount: 840,
    voiceRatio: "65S/35C",
    element: "Demo Proof",
    hook: "Return visitor",
  },
];

const PLATFORMS = ["All", "Meta", "Google", "LinkedIn", "Instagram"];
const CAMPAIGNS = [
  "All",
  "AWARENESS_CHAOS",
  "CONSIDERATION_CATHEDRAL",
  "DECISION_EXCELLENCE",
  "RETENTION_UPGRADE",
  "RETARGETING_VISITOR",
];

export default function AdCopyHub() {
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [selectedCampaign, setSelectedCampaign] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAds = AD_COPIES.filter(ad => {
    const platformMatch =
      selectedPlatform === "All" || ad.platform.includes(selectedPlatform);
    const campaignMatch =
      selectedCampaign === "All" || ad.campaign === selectedCampaign;
    const searchMatch =
      searchTerm === "" ||
      ad.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.element.toLowerCase().includes(searchTerm.toLowerCase());
    return platformMatch && campaignMatch && searchMatch;
  });

  const downloadTextFile = (
    filename: string,
    contents: string,
    type: string
  ) => {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const escapeCsvValue = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`;

  const adCopiesToCsv = (ads: AdCopy[]) => {
    const headers = [
      "id",
      "campaign",
      "platform",
      "format",
      "headline",
      "subheadline",
      "body",
      "cta",
      "charCount",
      "voiceRatio",
      "element",
      "hook",
    ] as const;
    const rows = ads.map(ad =>
      headers.map(header => escapeCsvValue(ad[header])).join(",")
    );
    return [headers.join(","), ...rows].join("\n");
  };

  const exportAds = (format: "csv" | "json", ads = filteredAds) => {
    if (format === "csv") {
      downloadTextFile(
        "unifyone-ad-copy.csv",
        adCopiesToCsv(ads),
        "text/csv;charset=utf-8"
      );
    } else {
      downloadTextFile(
        "unifyone-ad-copy.json",
        JSON.stringify(ads, null, 2),
        "application/json;charset=utf-8"
      );
    }

    toast.success(
      `Exported ${ads.length} ad ${ads.length === 1 ? "copy" : "copies"}.`
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getCampaignColor = (campaign: string) => {
    const colors: Record<string, string> = {
      AWARENESS_CHAOS: "bg-blue-500/20 text-blue-400 border-blue-500/40",
      CONSIDERATION_CATHEDRAL:
        "bg-purple-500/20 text-purple-400 border-purple-500/40",
      DECISION_EXCELLENCE: "bg-amber-500/20 text-amber-400 border-amber-500/40",
      RETENTION_UPGRADE: "bg-green-500/20 text-green-400 border-green-500/40",
      RETARGETING_VISITOR: "bg-red-500/20 text-red-400 border-red-500/40",
    };
    return colors[campaign] || "bg-gray-500/20 text-gray-400";
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHead
        title="Ad Copy Hub | UnifyOne Marketing"
        description="Platform-specific ad copy templates optimized for awareness, consideration, decision, retention, and retargeting campaigns. Copy, customize, and deploy."
        canonical={AD_COPY_CANONICAL}
        jsonLd={buildWebPageJsonLd({
          canonical: AD_COPY_CANONICAL,
          name: "Ad Copy Hub | UnifyOne Marketing",
          description:
            "Platform-specific ad copy templates for commerce campaigns — awareness, consideration, decision, retention, and retargeting.",
          breadcrumbs: [
            { name: "Marketing", item: `${SITE_URL}/marketing` },
            { name: "Ad Copy Hub", item: AD_COPY_CANONICAL },
          ],
        })}
      />
      {/* Hero Section */}
      <section className="border-b border-border bg-card py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Ad Copy Hub</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Platform-specific ad copy templates optimized for awareness,
              consideration, decision, retention, and retargeting campaigns.
              Copy, customize, and deploy.
            </p>
          </div>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="py-8 border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by headline, copy, or element..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Platform Filter */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(platform => (
                <Button
                  key={platform}
                  variant={
                    selectedPlatform === platform ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedPlatform(platform)}
                >
                  {platform}
                </Button>
              ))}
            </div>
          </div>

          {/* Campaign Filter */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Campaign Stage
            </label>
            <div className="flex flex-wrap gap-2">
              {CAMPAIGNS.map(campaign => (
                <Button
                  key={campaign}
                  variant={
                    selectedCampaign === campaign ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedCampaign(campaign)}
                >
                  {campaign === "All"
                    ? "All Stages"
                    : campaign.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ad Copy Cards */}
      <section className="py-12">
        <div className="container max-w-6xl mx-auto px-4">
          {filteredAds.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No ads match your filters. Try adjusting your search.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredAds.map(ad => (
                <Card
                  key={ad.id}
                  className="p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={getCampaignColor(ad.campaign)}>
                          {ad.campaign.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="outline">{ad.platform}</Badge>
                        <Badge variant="secondary">{ad.format}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {ad.charCount} chars
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ad.voiceRatio}
                      </p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {ad.headline}
                      </h3>
                      <p className="text-sm text-muted-foreground italic">
                        {ad.subheadline}
                      </p>
                    </div>
                    <p className="text-foreground leading-relaxed">{ad.body}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {ad.element}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {ad.hook}
                      </Badge>
                    </div>
                  </div>

                  {/* CTA & Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <p className="font-semibold text-primary">{ad.cta}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(ad.headline + "\n\n" + ad.body)
                        }
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportAds("json", [ad])}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-card border-t border-border">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">
                {AD_COPIES.length}
              </p>
              <p className="text-sm text-muted-foreground">Total Ad Copies</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">
                {new Set(AD_COPIES.map(a => a.platform)).size}
              </p>
              <p className="text-sm text-muted-foreground">Platforms</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">
                {new Set(AD_COPIES.map(a => a.campaign)).size}
              </p>
              <p className="text-sm text-muted-foreground">Campaign Stages</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">100%</p>
              <p className="text-sm text-muted-foreground">Ready to Deploy</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 border-t border-border">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Export Your Campaign
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Download the complete ad copy matrix as a CSV or JSON file for
            import into your ad management platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => exportAds("csv")}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export as CSV
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => exportAds("json")}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export as JSON
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
