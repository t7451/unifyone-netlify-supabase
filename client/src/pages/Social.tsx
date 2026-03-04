import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Twitter, Instagram, Linkedin, Facebook, Sparkles, Send, Calendar,
  Clock, BarChart3, Plus, Trash2, CheckCircle2, AlertCircle, FileEdit,
  Zap, Globe, TrendingUp, Users,
} from "lucide-react";

const PLATFORMS = [
  { id: "twitter", label: "X / Twitter", icon: Twitter, color: "text-sky-400", bg: "bg-sky-400/10 border-sky-400/30" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-400", bg: "bg-pink-400/10 border-pink-400/30" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/30" },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30" },
] as const;

type Platform = "twitter" | "instagram" | "linkedin" | "facebook" | "tiktok";

const STATUS_CONFIG = {
  draft: { label: "Draft", icon: FileEdit, color: "text-muted-foreground", badge: "secondary" as const },
  scheduled: { label: "Scheduled", icon: Clock, color: "text-amber-400", badge: "outline" as const },
  published: { label: "Published", icon: CheckCircle2, color: "text-emerald-400", badge: "default" as const },
  failed: { label: "Failed", icon: AlertCircle, color: "text-red-400", badge: "destructive" as const },
  cancelled: { label: "Cancelled", icon: AlertCircle, color: "text-muted-foreground", badge: "secondary" as const },
};

export default function Social() {
  // State
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["twitter", "linkedin"]);
  const [postContent, setPostContent] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState<"professional" | "casual" | "excited" | "informative" | "promotional">("professional");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmoji, setIncludeEmoji] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [campaignTag, setCampaignTag] = useState("");
  const [aiPosts, setAiPosts] = useState<Record<string, string>>({});
  const [connectPlatform, setConnectPlatform] = useState<Platform | "">("");
  const [connectHandle, setConnectHandle] = useState("");
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);

  // Queries
  const { data: posts, refetch: refetchPosts } = trpc.social.list.useQuery({ status: "all" });
  const { data: analytics } = trpc.social.getAnalytics.useQuery();
  const { data: accounts, refetch: refetchAccounts } = trpc.social.getAccounts.useQuery();

  // Mutations
  const aiCompose = trpc.social.aiCompose.useMutation({
    onSuccess: (data) => {
      setAiPosts(data.posts);
      const firstPlatform = selectedPlatforms[0];
      if (firstPlatform && data.posts[firstPlatform]) {
        setPostContent(data.posts[firstPlatform]);
      }
      toast.success("AI posts generated — review and edit before publishing.");
    },
    onError: () => toast.error("AI compose failed"),
  });

  const createPost = trpc.social.create.useMutation({
    onSuccess: () => {
      setPostContent("");
      setScheduledAt("");
      setCampaignTag("");
      setAiPosts({});
      refetchPosts();
      toast.success(scheduledAt ? "Post scheduled successfully." : "Post saved as draft.");
    },
    onError: () => toast.error("Failed to save post"),
  });

  const publishPost = trpc.social.publish.useMutation({
    onSuccess: () => {
      refetchPosts();
      toast.success("Post published — webhook fired.");
    },
    onError: () => toast.error("Publish failed"),
  });

  const deletePost = trpc.social.delete.useMutation({
    onSuccess: () => {
      refetchPosts();
      toast.success("Post deleted");
    },
  });

  const connectAccount = trpc.social.connectAccount.useMutation({
    onSuccess: () => {
      refetchAccounts();
      setConnectDialogOpen(false);
      setConnectHandle("");
      toast.success(`@${connectHandle} connected.`);
    },
  });

  const awardShare = trpc.referral.awardSocialShare.useMutation({
    onSuccess: (data) => {
      toast.success(`+${data.creditsAwarded} credits earned and credited to your wallet!`);
    },
  });

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleSave = (status: "draft" | "scheduled") => {
    if (!postContent.trim()) {
      toast.error("Post content is required");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    createPost.mutate({
      content: postContent,
      platforms: selectedPlatforms,
      scheduledAt: status === "scheduled" && scheduledAt ? scheduledAt : undefined,
      campaignTag: campaignTag || undefined,
      aiGenerated: Object.keys(aiPosts).length > 0,
    });
  };

  const handlePublishAndEarn = async (postId: number, platform: Platform) => {
    await publishPost.mutateAsync({ postId });
    awardShare.mutate({ platform, postId });
  };

  const connectedPlatforms = useMemo(() => {
    return new Set((accounts ?? []).filter(a => a.isConnected).map(a => a.platform));
  }, [accounts]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Social Media Manager</h1>
          <p className="text-muted-foreground text-sm mt-1">Compose, schedule, and earn credits by promoting your store</p>
        </div>
        <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" /> Connect Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Social Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={connectPlatform} onValueChange={(v) => setConnectPlatform(v as Platform)}>
                  <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Handle / Username</Label>
                <Input
                  placeholder="@yourhandle"
                  value={connectHandle}
                  onChange={e => setConnectHandle(e.target.value.replace("@", ""))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Full OAuth integration coming soon. For now, register your handle to enable scheduling and credit tracking.
              </p>
              <Button
                className="w-full"
                disabled={!connectPlatform || !connectHandle || connectAccount.isPending}
                onClick={() => connectAccount.mutate({ platform: connectPlatform as Platform, handle: connectHandle })}
              >
                Connect Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Posts", value: analytics?.totalPosts ?? 0, icon: Globe, color: "text-violet-400" },
          { label: "Published", value: analytics?.published ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Scheduled", value: analytics?.scheduled ?? 0, icon: Clock, color: "text-amber-400" },
          { label: "Drafts", value: analytics?.drafts ?? 0, icon: FileEdit, color: "text-muted-foreground" },
        ].map(stat => (
          <Card key={stat.label} className="bg-card/50">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Composer Panel */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" /> AI Post Composer
              </CardTitle>
              <CardDescription>Generate platform-optimized content with Claude AI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Platform Selector */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => {
                    const selected = selectedPlatforms.includes(p.id as Platform);
                    const connected = connectedPlatforms.has(p.id as Platform);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlatform(p.id as Platform)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                          selected ? p.bg + " " + p.color : "border-border text-muted-foreground hover:border-border/80"
                        }`}
                      >
                        <p.icon className="h-3.5 w-3.5" />
                        {p.label}
                        {connected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI Generation Controls */}
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-violet-400">
                  <Zap className="h-3.5 w-3.5" /> AI Generation
                </div>
                <Input
                  placeholder="Topic or product to promote (e.g. 'Summer sale on industrial gloves')"
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  className="text-sm"
                />
                <div className="flex gap-2 flex-wrap">
                  <Select value={aiTone} onValueChange={(v: any) => setAiTone(v)}>
                    <SelectTrigger className="w-36 text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["professional", "casual", "excited", "informative", "promotional"].map(t => (
                        <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Switch checked={includeHashtags} onCheckedChange={setIncludeHashtags} className="scale-75" />
                    <span className="text-muted-foreground">#tags</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Switch checked={includeEmoji} onCheckedChange={setIncludeEmoji} className="scale-75" />
                    <span className="text-muted-foreground">Emoji</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10 ml-auto"
                    disabled={!aiTopic.trim() || selectedPlatforms.length === 0 || aiCompose.isPending}
                    onClick={() => aiCompose.mutate({
                      topic: aiTopic,
                      platforms: selectedPlatforms,
                      tone: aiTone,
                      includeHashtags,
                      includeEmoji,
                    })}
                  >
                    {aiCompose.isPending ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </div>

              {/* AI Generated Previews */}
              {Object.keys(aiPosts).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Generated previews — click to use</Label>
                  {Object.entries(aiPosts).map(([platform, content]) => {
                    const p = PLATFORMS.find(x => x.id === platform);
                    if (!p) return null;
                    return (
                      <button
                        key={platform}
                        onClick={() => setPostContent(content)}
                        className={`w-full text-left rounded-lg border p-3 text-xs space-y-1 transition-all hover:opacity-90 ${p.bg}`}
                      >
                        <div className={`flex items-center gap-1.5 font-medium ${p.color}`}>
                          <p.icon className="h-3 w-3" /> {p.label}
                        </div>
                        <p className="text-foreground/80 line-clamp-3">{content}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Main Composer */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Post content</Label>
                <Textarea
                  placeholder="Write your post here, or generate with AI above..."
                  value={postContent}
                  onChange={e => setPostContent(e.target.value)}
                  rows={5}
                  className="resize-none text-sm"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{postContent.length} chars</span>
                  {selectedPlatforms.includes("twitter") && postContent.length > 280 && (
                    <span className="text-amber-400">Twitter limit: 280 chars</span>
                  )}
                </div>
              </div>

              {/* Scheduling */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Schedule for (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Campaign tag</Label>
                  <Input
                    placeholder="e.g. summer-sale"
                    value={campaignTag}
                    onChange={e => setCampaignTag(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={createPost.isPending}
                  onClick={() => handleSave("draft")}
                >
                  Save Draft
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={createPost.isPending || !scheduledAt}
                  onClick={() => handleSave("scheduled")}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Posts Feed */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sky-400" /> Posts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="all">
                <div className="px-4">
                  <TabsList className="w-full h-8 text-xs">
                    <TabsTrigger value="all" className="flex-1 text-xs">All</TabsTrigger>
                    <TabsTrigger value="scheduled" className="flex-1 text-xs">Scheduled</TabsTrigger>
                    <TabsTrigger value="published" className="flex-1 text-xs">Published</TabsTrigger>
                    <TabsTrigger value="draft" className="flex-1 text-xs">Drafts</TabsTrigger>
                  </TabsList>
                </div>
                {(["all", "scheduled", "published", "draft"] as const).map(tab => (
                  <TabsContent key={tab} value={tab} className="mt-0">
                    <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
                      {(posts ?? [])
                        .filter(p => tab === "all" || p.status === tab)
                        .map(post => {
                          const statusCfg = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
                          const platforms = (post.platforms as string[]) ?? [];
                          return (
                            <div key={post.id} className="p-3 space-y-2 hover:bg-muted/30 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs text-foreground line-clamp-2 flex-1">{post.content}</p>
                                <Badge variant={statusCfg.badge} className="text-[10px] shrink-0">
                                  {statusCfg.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {platforms.map(p => {
                                  const cfg = PLATFORMS.find(x => x.id === p);
                                  if (!cfg) return null;
                                  return (
                                    <span key={p} className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>
                                      {cfg.label}
                                    </span>
                                  );
                                })}
                                {post.campaignTag && (
                                  <span className="text-[10px] text-muted-foreground">#{post.campaignTag}</span>
                                )}
                                {post.aiGenerated && (
                                  <span className="text-[10px] text-violet-400 flex items-center gap-0.5">
                                    <Sparkles className="h-2.5 w-2.5" /> AI
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground flex-1">
                                  {post.scheduledAt
                                    ? `Scheduled: ${new Date(post.scheduledAt).toLocaleDateString()}`
                                    : new Date(post.createdAt).toLocaleDateString()
                                  }
                                </span>
                                {post.status === "draft" || post.status === "scheduled" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10"
                                    disabled={publishPost.isPending}
                                    onClick={() => handlePublishAndEarn(post.id, platforms[0] as Platform)}
                                  >
                                    <Send className="h-2.5 w-2.5 mr-1" /> Publish & Earn
                                  </Button>
                                ) : null}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                                  onClick={() => deletePost.mutate({ postId: post.id })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      {(posts ?? []).filter(p => tab === "all" || p.status === tab).length === 0 && (
                        <div className="p-8 text-center text-muted-foreground text-xs">
                          <Globe className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          No {tab === "all" ? "" : tab} posts yet
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Platform Distribution */}
          {analytics && Object.keys(analytics.platforms).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-violet-400" /> Platform Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(analytics.platforms).map(([platform, count]) => {
                  const cfg = PLATFORMS.find(p => p.id === platform);
                  const total = analytics.totalPosts || 1;
                  const pct = Math.round(((count as number) / total) * 100);
                  return (
                    <div key={platform} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={cfg?.color ?? "text-muted-foreground"}>{cfg?.label ?? platform}</span>
                        <span className="text-muted-foreground">{count as number} posts ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${cfg?.id === "twitter" ? "bg-sky-400" : cfg?.id === "instagram" ? "bg-pink-400" : cfg?.id === "linkedin" ? "bg-blue-500" : "bg-blue-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
