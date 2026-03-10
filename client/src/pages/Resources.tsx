import { useState } from "react";
import { Download, FileText, BarChart3, Calendar, Users, Zap, BookOpen, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Resource {
  id: string;
  title: string;
  description: string;
  category: "template" | "guide" | "video";
  icon: React.ElementType;
  downloadUrl: string;
  fileSize: string;
  tags: string[];
}

const RESOURCES: Resource[] = [
  // Excel Templates
  {
    id: "weekly-dashboard",
    title: "Weekly Execution Dashboard",
    description: "Track weekly KPIs, tasks, revenue targets, and team metrics in one unified view.",
    category: "template",
    icon: BarChart3,
    downloadUrl: "https://cdn.1commerce.online/templates/weekly-execution-dashboard.xlsx",
    fileSize: "11 KB",
    tags: ["KPI", "Weekly", "Dashboard"],
  },
  {
    id: "lead-pipeline",
    title: "Lead Pipeline Tracker",
    description: "Manage leads from prospecting through conversion with status tracking and notes.",
    category: "template",
    icon: Users,
    downloadUrl: "https://cdn.1commerce.online/templates/lead-pipeline-tracker.xlsx",
    fileSize: "12 KB",
    tags: ["Sales", "Leads", "Pipeline"],
  },
  {
    id: "revenue-command",
    title: "Revenue Command Center",
    description: "Multi-stream revenue tracking with forecasting, margin analysis, and growth targets.",
    category: "template",
    icon: BarChart3,
    downloadUrl: "https://cdn.1commerce.online/templates/revenue-command-center.xlsx",
    fileSize: "14 KB",
    tags: ["Revenue", "Forecasting", "Finance"],
  },
  {
    id: "content-calendar",
    title: "Content Engine Calendar",
    description: "Plan, schedule, and track content across all platforms with editorial calendar.",
    category: "template",
    icon: Calendar,
    downloadUrl: "https://cdn.1commerce.online/templates/content-engine-calendar.xlsx",
    fileSize: "13 KB",
    tags: ["Content", "Social", "Marketing"],
  },

  // Strategic Guides
  {
    id: "cathedral-principle",
    title: "The Cathedral Principle",
    description: "Sequential, structural commerce infrastructure built to outlast platform trends.",
    category: "guide",
    icon: BookOpen,
    downloadUrl: "https://cdn.1commerce.online/guides/The_Cathedral_Principle.pdf",
    fileSize: "16 MB",
    tags: ["Strategy", "Architecture", "Framework"],
  },
  {
    id: "unifyone-guide",
    title: "UnifyOne Platform Guide",
    description: "Comprehensive guide to UnifyOne multi-tenant commerce system architecture and operations.",
    category: "guide",
    icon: BookOpen,
    downloadUrl: "https://cdn.1commerce.online/guides/UnifyOne.pdf",
    fileSize: "7.4 MB",
    tags: ["Platform", "Guide", "Operations"],
  },
  {
    id: "enterprise-ai",
    title: "Enterprise AI & SaaS Solutions",
    description: "OneStack framework for enterprise-grade AI integration and SaaS delivery.",
    category: "guide",
    icon: Zap,
    downloadUrl: "https://cdn.1commerce.online/guides/EnterpriseAI&SaaSSolutions0neStack.pdf",
    fileSize: "6.2 MB",
    tags: ["AI", "SaaS", "Enterprise"],
  },
  {
    id: "day1-viral",
    title: "Day 1 Viral Distribution Posts",
    description: "Launch-day social media strategy with platform-specific viral post templates.",
    category: "guide",
    icon: BookOpen,
    downloadUrl: "https://cdn.1commerce.online/guides/Day1ViralDistributionPosts.pdf",
    fileSize: "16 MB",
    tags: ["Marketing", "Social", "Launch"],
  },
  {
    id: "sovereign-solopreneur",
    title: "The Sovereign Solopreneur Strategy",
    description: "Build a multinational business with zero employees using systems and automation.",
    category: "guide",
    icon: BookOpen,
    downloadUrl: "https://cdn.1commerce.online/guides/1CommerceLLCTheSovereignSolopreneurGrowthStrategy(1).pdf",
    fileSize: "604 KB",
    tags: ["Strategy", "Solopreneur", "Growth"],
  },
  {
    id: "ai-operating-system",
    title: "AI Operating System Guide",
    description: "Framework for autonomous agent orchestration and decision-making systems.",
    category: "guide",
    icon: Zap,
    downloadUrl: "https://cdn.1commerce.online/guides/ai-operating-system-guide.pdf",
    fileSize: "28 KB",
    tags: ["AI", "Automation", "Systems"],
  },
  {
    id: "ai-prompt-library",
    title: "AI Prompt Library",
    description: "Curated prompts for content creation, analysis, and business automation.",
    category: "guide",
    icon: BookOpen,
    downloadUrl: "https://cdn.1commerce.online/guides/ai-prompt-library.pdf",
    fileSize: "18 KB",
    tags: ["AI", "Prompts", "Content"],
  },

  // Video Assets
  {
    id: "onestack-video",
    title: "OneStack Cinematic Reel",
    description: "Professional cinematic footage showcasing OneStack enterprise AI capabilities.",
    category: "video",
    icon: Video,
    downloadUrl: "https://cdn.1commerce.online/videos/Ultra-realistic_cinematic_foot_Kling_30__37390(1).mp4",
    fileSize: "5 MB",
    tags: ["Video", "OneStack", "Cinematic"],
  },
];

export default function Resources() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "template" | "guide" | "video">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredResources = RESOURCES.filter(resource => {
    const matchesCategory = selectedCategory === "all" || resource.category === selectedCategory;
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleDownload = (resource: Resource) => {
    // Open in new tab to trigger browser download
    window.open(resource.downloadUrl, "_blank");
    toast.success(`Downloading ${resource.title}...`);
  };

  const categoryStats = {
    template: RESOURCES.filter(r => r.category === "template").length,
    guide: RESOURCES.filter(r => r.category === "guide").length,
    video: RESOURCES.filter(r => r.category === "video").length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="border-b border-border bg-card py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Operating Excellence Resources</h1>
            <p className="text-lg text-muted-foreground">
              Strategic templates, guides, and assets to accelerate your commerce infrastructure.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container max-w-6xl mx-auto px-4 space-y-8">
          {/* Search & Filter */}
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                onClick={() => setSelectedCategory("all")}
                className="text-sm"
              >
                All Resources ({RESOURCES.length})
              </Button>
              <Button
                variant={selectedCategory === "template" ? "default" : "outline"}
                onClick={() => setSelectedCategory("template")}
                className="text-sm"
              >
                Templates ({categoryStats.template})
              </Button>
              <Button
                variant={selectedCategory === "guide" ? "default" : "outline"}
                onClick={() => setSelectedCategory("guide")}
                className="text-sm"
              >
                Guides ({categoryStats.guide})
              </Button>
              <Button
                variant={selectedCategory === "video" ? "default" : "outline"}
                onClick={() => setSelectedCategory("video")}
                className="text-sm"
              >
                Videos ({categoryStats.video})
              </Button>
            </div>
          </div>

          {/* Resources Grid */}
          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No resources match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map(resource => {
                const Icon = resource.icon;
                return (
                  <Card key={resource.id} className="flex flex-col p-6 hover:shadow-lg transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {resource.fileSize}
                      </Badge>
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-semibold text-foreground mb-2">{resource.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">{resource.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {resource.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Download Button */}
                    <Button
                      onClick={() => handleDownload(resource)}
                      className="w-full gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-card py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Need Custom Resources?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Contact our team to request custom templates, guides, or training materials tailored to your business.
            </p>
            <Button size="lg" className="gap-2">
              <FileText className="h-4 w-4" />
              Request Custom Resources
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
