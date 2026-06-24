import { useState, type ElementType } from "react";
import { Link } from "wouter";
import {
  Download,
  FileText,
  BarChart3,
  Calendar,
  Users,
  Zap,
  BookOpen,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const RESOURCES_CANONICAL = `${SITE_URL}/resources`;

interface Resource {
  id: string;
  title: string;
  description: string;
  category: "template" | "guide" | "video";
  icon: ElementType;
  downloadUrl: string;
  filename: string;
  fileSize: string;
  fileType: "CSV" | "Markdown";
  tags: string[];
}

const RESOURCES: Resource[] = [
  // Trackers & Templates
  {
    id: "weekly-dashboard",
    title: "Weekly Earnings Dashboard",
    description:
      "Track your weekly take-home, hours, and goals across every gig platform in one view.",
    category: "template",
    icon: BarChart3,
    downloadUrl: "/api/resources/weekly-dashboard/download",
    filename: "weekly-dashboard.csv",
    fileSize: "<1 KB",
    fileType: "CSV",
    tags: ["Earnings", "Weekly", "Tracker"],
  },
  {
    id: "lead-pipeline",
    title: "Gig & Client Tracker",
    description:
      "Keep tabs on gigs and clients from first contact through payout, with status and notes.",
    category: "template",
    icon: Users,
    downloadUrl: "/api/resources/lead-pipeline/download",
    filename: "lead-pipeline.csv",
    fileSize: "<1 KB",
    fileType: "CSV",
    tags: ["Gigs", "Clients", "Tracker"],
  },
  {
    id: "revenue-command",
    title: "Multi-Platform Income Tracker",
    description:
      "Track income across every gig app with set-aside targets and tax buckets in one sheet.",
    category: "template",
    icon: BarChart3,
    downloadUrl: "/api/resources/revenue-command/download",
    filename: "revenue-command.csv",
    fileSize: "<1 KB",
    fileType: "CSV",
    tags: ["Income", "Taxes", "Set-Aside"],
  },
  {
    id: "content-calendar",
    title: "Mileage & Expense Log",
    description:
      "Log trips and deductible expenses week by week so your IRS mileage is ready at tax time.",
    category: "template",
    icon: Calendar,
    downloadUrl: "/api/resources/content-calendar/download",
    filename: "content-calendar.csv",
    fileSize: "<1 KB",
    fileType: "CSV",
    tags: ["Mileage", "Expenses", "Deductions"],
  },

  // Guides
  {
    id: "cathedral-principle",
    title: "Keep More of What You Earn",
    description:
      "A simple framework for tracking income, claiming deductions, and setting aside for taxes.",
    category: "guide",
    icon: BookOpen,
    downloadUrl: "/api/resources/cathedral-principle/download",
    filename: "cathedral-principle.md",
    fileSize: "1 KB",
    fileType: "Markdown",
    tags: ["Earnings", "Deductions", "Framework"],
  },
  {
    id: "unifyone-guide",
    title: "UnifyOne Getting Started Guide",
    description:
      "How to set up UnifyOne to track earnings, log IRS mileage, and stay ahead of quarterly taxes.",
    category: "guide",
    icon: BookOpen,
    downloadUrl: "/api/resources/unifyone-guide/download",
    filename: "unifyone-guide.md",
    fileSize: "1 KB",
    fileType: "Markdown",
    tags: ["Getting Started", "Guide", "Taxes"],
  },
  {
    id: "enterprise-ai",
    title: "Quarterly Estimated Taxes 101",
    description:
      "What gig workers need to know about estimated taxes — when to pay, how to project, and what to set aside.",
    category: "guide",
    icon: Zap,
    downloadUrl: "/api/resources/enterprise-ai/download",
    filename: "enterprise-ai.md",
    fileSize: "1 KB",
    fileType: "Markdown",
    tags: ["Taxes", "Quarterly", "Estimates"],
  },
  {
    id: "day1-viral",
    title: "Your First Week on UnifyOne",
    description:
      "A day-by-day checklist to connect your earnings, log your first trips, and see your real take-home.",
    category: "guide",
    icon: BookOpen,
    downloadUrl: "/api/resources/day1-viral/download",
    filename: "day1-viral.md",
    fileSize: "1 KB",
    fileType: "Markdown",
    tags: ["Onboarding", "Checklist", "Earnings"],
  },
  {
    id: "sovereign-solopreneur",
    title: "The Independent Worker Playbook",
    description:
      "Run your gig work like a business — track every dollar, claim every deduction, and stay tax-ready.",
    category: "guide",
    icon: BookOpen,
    downloadUrl: "/api/resources/sovereign-solopreneur/download",
    filename: "sovereign-solopreneur.md",
    fileSize: "1 KB",
    fileType: "Markdown",
    tags: ["Gig Work", "Taxes", "Growth"],
  },
  {
    id: "ai-operating-system",
    title: "Money Manager Setup Guide",
    description:
      "Set up income, expenses, and automatic set-aside so your tax money is always there when you need it.",
    category: "guide",
    icon: Zap,
    downloadUrl: "/api/resources/ai-operating-system/download",
    filename: "ai-operating-system.md",
    fileSize: "1 KB",
    fileType: "Markdown",
    tags: ["Money Manager", "Set-Aside", "Expenses"],
  },
  {
    id: "ai-prompt-library",
    title: "Gig Deduction Checklist",
    description:
      "A curated list of common deductions gig workers miss — mileage, supplies, fees, and more.",
    category: "guide",
    icon: BookOpen,
    downloadUrl: "/api/resources/ai-prompt-library/download",
    filename: "ai-prompt-library.md",
    fileSize: "1 KB",
    fileType: "Markdown",
    tags: ["Deductions", "Taxes", "Checklist"],
  },

  // Video Assets
  {
    id: "onestack-video",
    title: "UnifyOne Overview Reel Brief",
    description:
      "Downloadable brief for a short reel walking through earnings tracking, mileage, and tax estimates.",
    category: "video",
    icon: Video,
    downloadUrl: "/api/resources/onestack-video/download",
    filename: "onestack-video.md",
    fileSize: "1 KB",
    fileType: "Markdown",
    tags: ["Video", "Overview", "Walkthrough"],
  },
];

export default function Resources() {
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "template" | "guide" | "video"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredResources = RESOURCES.filter(resource => {
    const matchesCategory =
      selectedCategory === "all" || resource.category === selectedCategory;
    const matchesSearch =
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.tags.some(tag =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  const categoryStats = {
    template: RESOURCES.filter(r => r.category === "template").length,
    guide: RESOURCES.filter(r => r.category === "guide").length,
    video: RESOURCES.filter(r => r.category === "video").length,
  };

  return (
    <main className="min-h-screen bg-background">
      <PageHead
        title="Resources | UnifyOne"
        description="Free resources for gig workers — earnings trackers, mileage and expense logs, tax guides, and walkthroughs to help you keep more of what you earn. Download free."
        canonical={RESOURCES_CANONICAL}
        jsonLd={buildWebPageJsonLd({
          canonical: RESOURCES_CANONICAL,
          name: "Resources | UnifyOne",
          description:
            "Free resources for gig workers — earnings trackers, mileage and expense logs, tax guides, and walkthroughs to help you keep more of what you earn. Download free.",
          breadcrumbs: [{ name: "Resources", item: RESOURCES_CANONICAL }],
        })}
      />
      {/* Hero Section */}
      <section
        aria-labelledby="resources-heading"
        className="border-b border-border bg-card py-12"
      >
        <div className="container max-w-6xl mx-auto px-4">
          <div className="space-y-4">
            <h1
              id="resources-heading"
              className="text-4xl font-bold text-foreground"
            >
              Gig Worker Resources
            </h1>
            <p className="text-lg text-muted-foreground">
              Free trackers, guides, and tools to help you track your earnings,
              claim every deduction, and stay ahead of quarterly taxes.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section aria-label="Resource library" className="py-12">
        <div className="container max-w-6xl mx-auto px-4 space-y-8">
          {/* Search & Filter */}
          <div className="space-y-4">
            <label htmlFor="resource-search" className="sr-only">
              Search resources
            </label>
            <input
              id="resource-search"
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Category Filter */}
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Filter resources by category"
            >
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                onClick={() => setSelectedCategory("all")}
                aria-pressed={selectedCategory === "all"}
                className="text-sm"
              >
                All Resources ({RESOURCES.length})
              </Button>
              <Button
                variant={
                  selectedCategory === "template" ? "default" : "outline"
                }
                onClick={() => setSelectedCategory("template")}
                aria-pressed={selectedCategory === "template"}
                className="text-sm"
              >
                Templates ({categoryStats.template})
              </Button>
              <Button
                variant={selectedCategory === "guide" ? "default" : "outline"}
                onClick={() => setSelectedCategory("guide")}
                aria-pressed={selectedCategory === "guide"}
                className="text-sm"
              >
                Guides ({categoryStats.guide})
              </Button>
              <Button
                variant={selectedCategory === "video" ? "default" : "outline"}
                onClick={() => setSelectedCategory("video")}
                aria-pressed={selectedCategory === "video"}
                className="text-sm"
              >
                Videos ({categoryStats.video})
              </Button>
            </div>
          </div>

          {/* Resources Grid */}
          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No resources match your search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map(resource => {
                const Icon = resource.icon;
                return (
                  <Card
                    key={resource.id}
                    className="flex flex-col p-6 hover:shadow-lg transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {resource.fileType} · {resource.fileSize}
                      </Badge>
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {resource.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">
                      {resource.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {resource.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Download Button */}
                    <Button asChild className="w-full gap-2">
                      <a
                        href={resource.downloadUrl}
                        download={resource.filename}
                        aria-label={`Download ${resource.title} (${resource.fileType}, ${resource.fileSize})`}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Download {resource.fileType}
                      </a>
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section
        aria-labelledby="resources-cta-heading"
        className="border-t border-border bg-card py-12"
      >
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center space-y-4">
            <h2
              id="resources-cta-heading"
              className="text-2xl font-bold text-foreground"
            >
              Need Something Specific?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tell us what would help your gig work — a tracker, a tax guide, or
              a walkthrough — and we'll add it to the library.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link href="/contact?topic=custom-resources">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Request Custom Resources
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
