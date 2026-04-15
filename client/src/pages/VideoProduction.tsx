import { useState } from "react";
import { Play, Zap, Film, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const VP_CANONICAL = `${SITE_URL}/video-production`;

export default function VideoProduction() {
  const [videoPlaying, setVideoPlaying] = useState(false);

  const videoUrl = "https://cdn.1commerce.online/videos/Ultra-realistic_cinematic_foot_Kling_30__37390(1).mp4";

  const showcases = [
    {
      id: "onestack-cinematic",
      title: "OneStack Cinematic Reel",
      description: "Professional cinematic footage showcasing OneStack enterprise AI capabilities. Ultra-realistic production quality demonstrating autonomous operations at scale.",
      duration: "30 seconds",
      format: "4K Cinematic",
      tags: ["Enterprise AI", "Cinematic", "Autonomous Operations"],
      thumbnail: "🎬",
    },
  ];

  const productionStats = [
    { label: "Production Quality", value: "4K Ultra-Realistic" },
    { label: "Format", value: "Cinematic Reel" },
    { label: "Duration", value: "30 Seconds" },
    { label: "Use Cases", value: "Landing Pages, Social, Pitch Decks" },
  ];

  const useCases = [
    {
      title: "Landing Page Hero",
      description: "Embed the cinematic reel as an autoplay hero video on product landing pages to demonstrate OneStack capabilities in real-time.",
      icon: "🎯",
    },
    {
      title: "Social Media",
      description: "Repurpose for Instagram Reels, TikTok, and LinkedIn video posts. Ultra-realistic footage captures attention and drives engagement.",
      icon: "📱",
    },
    {
      title: "Pitch Decks",
      description: "Include in investor presentations and sales decks to showcase enterprise-grade production quality and autonomous operations.",
      icon: "💼",
    },
    {
      title: "Email Campaigns",
      description: "Embed in email campaigns with animated GIF fallback for maximum reach across email clients.",
      icon: "📧",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHead
        title="Video Production | UnifyOne"
        description="OneStack Cinematic — professional AI-generated video assets for landing pages, social media, pitch decks, and email campaigns. Ultra-realistic production quality."
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
            {/* Video Player */}
            <div className="relative">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video border border-border shadow-2xl">
                {!videoPlaying ? (
                  <>
                    <video
                      src={videoUrl}
                      className="w-full h-full object-cover"
                      poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'%3E%3Crect fill='%23000' width='1920' height='1080'/%3E%3C/svg%3E"
                    />
                    <button
                      onClick={() => setVideoPlaying(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors group"
                    >
                      <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-black fill-black ml-1" />
                      </div>
                    </button>
                  </>
                ) : (
                  <video
                    src={videoUrl}
                    autoPlay
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Badge className="bg-primary/20 text-primary border-primary/40">
                  <Film className="w-3 h-3 mr-1" />
                  4K Cinematic
                </Badge>
                <Badge variant="outline">30 seconds</Badge>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-4">OneStack Cinematic Reel</h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Professional ultra-realistic cinematic footage showcasing OneStack enterprise AI capabilities. This production-grade asset demonstrates autonomous operations at scale with stunning visual quality.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Production Specifications</h3>
                <div className="grid grid-cols-2 gap-3">
                  {productionStats.map((stat) => (
                    <div key={stat.label} className="bg-card border border-border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="font-semibold text-foreground">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button size="lg" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Download Video
                </Button>
                <Button variant="outline" size="lg">
                  Copy Embed Code
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
            <h2 className="text-3xl font-bold text-foreground mb-4">Showcase Library</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Production-grade video assets ready to deploy across your marketing channels.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {showcases.map((showcase) => (
              <Card key={showcase.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{showcase.thumbnail}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{showcase.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{showcase.description}</p>
                <div className="flex gap-2 flex-wrap mb-4">
                  <Badge variant="outline">{showcase.format}</Badge>
                  <Badge variant="outline">{showcase.duration}</Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {showcase.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 border-t border-border">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Use Cases</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Deploy the OneStack cinematic reel across your marketing channels to showcase enterprise-grade production quality and autonomous capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map((useCase) => (
              <Card key={useCase.title} className="p-6 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">{useCase.icon}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{useCase.title}</h3>
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
              <h3 className="font-semibold text-foreground mb-2">Premium Quality</h3>
              <p className="text-sm text-muted-foreground">
                Ultra-realistic 4K cinematic production showcasing enterprise-grade visual standards.
              </p>
            </div>
            <div className="text-center">
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Optimized Format</h3>
              <p className="text-sm text-muted-foreground">
                Compressed for web delivery while maintaining visual fidelity across all platforms.
              </p>
            </div>
            <div className="text-center">
              <Film className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Versatile Asset</h3>
              <p className="text-sm text-muted-foreground">
                Deploy on landing pages, social media, email campaigns, and pitch decks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-border">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Showcase OneStack?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Download the cinematic reel and integrate it into your marketing channels. This production-grade asset is ready to deploy immediately.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2">
              <Film className="w-4 h-4" />
              Download Video (5 MB)
            </Button>
            <Button variant="outline" size="lg">
              View Production Guide
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
