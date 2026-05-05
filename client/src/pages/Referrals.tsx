import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Gift,
  Copy,
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  TrendingUp,
  Users,
  Zap,
  Star,
  CheckCircle2,
  Coins,
  Share2,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import IncomeCalculator from "@/components/referral/IncomeCalculator";

const CREDIT_RATES = [
  { action: "Someone clicks your link", credits: 0, note: "Tracking only" },
  {
    action: "Someone signs up via your link",
    credits: 500,
    note: "Per signup",
  },
  {
    action: "Referred user converts to paid",
    credits: 2000,
    note: "Per conversion",
  },
  { action: "Share on Twitter / X", credits: 50, note: "Per post published" },
  { action: "Share on Instagram", credits: 60, note: "Per post published" },
  { action: "Share on LinkedIn", credits: 75, note: "Per post published" },
  { action: "Share on Facebook", credits: 50, note: "Per post published" },
];

const SHARE_TEMPLATES = [
  {
    platform: "twitter" as const,
    icon: Twitter,
    color: "text-sky-400",
    bg: "bg-sky-400/10 border-sky-400/30",
    template: (url: string, _name: string) =>
      `Just discovered @UnifyOneHQ — the all-in-one commerce platform that connects Shopify, n8n, and Stripe in one dashboard. Try it free: ${url} #ecommerce #shopify #automation`,
  },
  {
    platform: "linkedin" as const,
    icon: Linkedin,
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/30",
    template: (url: string, name: string) =>
      `If you're running an e-commerce store, you need to check out UnifyOne Commerce Platform. It unifies your Shopify store, payment processing, inventory, and automation workflows into one place — without the agency price tag.\n\nI've been using it to manage ${name} and it's genuinely changed how I operate.\n\nFree trial: ${url}\n\n#ecommerce #shopify #saas #automation`,
  },
  {
    platform: "instagram" as const,
    icon: Instagram,
    color: "text-pink-400",
    bg: "bg-pink-400/10 border-pink-400/30",
    template: (url: string, _name: string) =>
      `Running an online store? This platform changed everything for me 🚀 One dashboard for all your commerce operations — Shopify, payments, inventory, automation. Link in bio: ${url} #ecommerce #shopify #entrepreneur #smallbusiness #automation`,
  },
  {
    platform: "facebook" as const,
    icon: Facebook,
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/30",
    template: (url: string, name: string) =>
      `Hey everyone! I wanted to share a tool I've been using for ${name} that's been a game-changer for managing my online store. UnifyOne connects all my commerce tools in one place — Shopify, Stripe, PayPal, and automation workflows. If you're running an e-commerce business, check it out: ${url}\n\n*Disclosure: I earn credits when you sign up through my link.*`,
  },
];

export default function Referrals() {
  const { user } = useAuth();
  const [redeemAmount, setRedeemAmount] = useState(500);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);

  const { data: stats, refetch: refetchStats } =
    trpc.referral.getStats.useQuery();
  const { data: transactions } = trpc.referral.getTransactions.useQuery({
    limit: 20,
  });

  const redeemCredits = trpc.referral.redeemCredits.useMutation({
    onSuccess: data => {
      refetchStats();
      setRedeemDialogOpen(false);
      toast.success(
        `Redeemed ${data.creditsRedeemed} credits — $${data.dollarValue} will be applied to your next invoice.`
      );
    },
    onError: e => toast.error(e.message),
  });

  const awardShare = trpc.referral.awardSocialShare.useMutation({
    onSuccess: data => {
      refetchStats();
      toast.success(`+${data.creditsAwarded} credits earned!`);
    },
  });

  const referralUrl = stats?.referralCode
    ? `${window.location.origin}/?ref=${stats.referralCode}`
    : "";

  const copyLink = () => {
    if (referralUrl) {
      navigator.clipboard.writeText(referralUrl);
      toast.success("Referral link copied!");
    }
  };

  const openShare = (platform: string, text: string) => {
    const encodedText = encodeURIComponent(text);
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}&summary=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}&quote=${encodedText}`,
    };
    const shareUrl = urls[platform];
    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
      // Award credits after opening share dialog
      awardShare.mutate({ platform: platform as any });
    }
  };

  const creditBalance = stats?.creditBalance ?? 0;
  const dollarValue = (creditBalance / 100).toFixed(2);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Gift className="h-6 w-6 text-violet-400" /> Promote & Earn
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Share UnifyOne and earn credits redeemable against your subscription
        </p>
      </div>

      {/* Credit Wallet Hero */}
      <div className="relative overflow-hidden rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-950/60 via-purple-950/40 to-background p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
        <div className="relative grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white">
                {creditBalance.toLocaleString()}
              </span>
              <span className="text-violet-300 text-lg">credits</span>
            </div>
            <p className="text-violet-200/70 text-sm">
              ≈ <span className="text-white font-semibold">${dollarValue}</span>{" "}
              off your next invoice
              <span className="text-violet-300/50 ml-1">
                (100 credits = $1)
              </span>
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-500 text-white"
                disabled={creditBalance < 100}
                onClick={() => setRedeemDialogOpen(true)}
              >
                <Coins className="h-3.5 w-3.5 mr-1.5" /> Redeem Credits
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                onClick={copyLink}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Referral Link
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Link Clicks",
                value: stats?.totalClicks ?? 0,
                icon: TrendingUp,
              },
              { label: "Signups", value: stats?.signups ?? 0, icon: Users },
              {
                label: "Conversions",
                value: stats?.conversions ?? 0,
                icon: CheckCircle2,
              },
              {
                label: "Total Earned",
                value: `${(stats?.totalCreditsEarned ?? 0).toLocaleString()} cr`,
                icon: Star,
              },
            ].map(s => (
              <div
                key={s.label}
                className="rounded-lg bg-white/5 border border-white/10 p-2.5 text-center"
              >
                <s.icon className="h-4 w-4 mx-auto mb-1 text-violet-300" />
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-violet-300/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referral Link */}
      {referralUrl && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="h-4 w-4 text-sky-400" /> Your Referral Link
            </CardTitle>
            <CardDescription>
              Share this link — earn 500 credits per signup, 2,000 per paid
              conversion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={referralUrl}
                readOnly
                className="text-sm font-mono bg-muted/50"
              />
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={referralUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              FTC Disclosure: Recipients see "I earn credits when you sign up"
              on all templates below.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Share Templates */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" /> Share Templates
              </CardTitle>
              <CardDescription>
                One-click share with pre-written, FTC-compliant posts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {SHARE_TEMPLATES.map(tmpl => {
                const storeName = (user as any)?.name ?? "my store";
                const text = tmpl.template(
                  referralUrl || "https://unifyone.com",
                  storeName
                );
                return (
                  <div
                    key={tmpl.platform}
                    className={`rounded-lg border p-4 space-y-3 ${tmpl.bg}`}
                  >
                    <div
                      className={`flex items-center gap-2 font-medium text-sm ${tmpl.color}`}
                    >
                      <tmpl.icon className="h-4 w-4" />
                      {tmpl.platform.charAt(0).toUpperCase() +
                        tmpl.platform.slice(1)}
                      {tmpl.platform === "linkedin" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-blue-500/30 text-blue-400 ml-auto"
                        >
                          +75 cr
                        </Badge>
                      )}
                      {tmpl.platform === "instagram" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-pink-400/30 text-pink-400 ml-auto"
                        >
                          +60 cr
                        </Badge>
                      )}
                      {(tmpl.platform === "twitter" ||
                        tmpl.platform === "facebook") && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-sky-400/30 text-sky-400 ml-auto"
                        >
                          +50 cr
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-foreground/80 line-clamp-4 whitespace-pre-line">
                      {text}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 flex-1"
                        onClick={() => {
                          navigator.clipboard.writeText(text);
                          toast.success("Template copied!");
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                      {tmpl.platform !== "instagram" && (
                        <Button
                          size="sm"
                          className={`text-xs h-7 flex-1 ${tmpl.platform === "twitter" ? "bg-sky-500 hover:bg-sky-400" : tmpl.platform === "linkedin" ? "bg-blue-600 hover:bg-blue-500" : "bg-blue-500 hover:bg-blue-400"}`}
                          onClick={() => openShare(tmpl.platform, text)}
                        >
                          <Share2 className="h-3 w-3 mr-1" /> Share & Earn
                        </Button>
                      )}
                      {tmpl.platform === "instagram" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 flex-1 border-pink-400/30 text-pink-400 hover:bg-pink-400/10"
                          onClick={() => {
                            navigator.clipboard.writeText(text);
                            awardShare.mutate({ platform: "instagram" });
                            toast.success(
                              "Caption copied! Paste it in your Instagram app. +60 credits earned."
                            );
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copy & Earn
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* How It Works */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">How Credits Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {CREDIT_RATES.map((rate, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                >
                  <div>
                    <p className="text-xs font-medium">{rate.action}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {rate.note}
                    </p>
                  </div>
                  {rate.credits > 0 ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-emerald-400 border-emerald-400/30"
                    >
                      +{rate.credits}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Tracked
                    </Badge>
                  )}
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground pt-1">
                100 credits = $1 off your next subscription invoice. Min
                redemption: 100 credits.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <IncomeCalculator />
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-400" /> Credit History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {(transactions ?? []).map(tx => (
                  <div
                    key={tx.id}
                    className="px-4 py-2.5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-medium">
                        {tx.description || tx.source}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${tx.amount > 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount}
                    </span>
                  </div>
                ))}
                {(transactions ?? []).length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    <Coins className="h-6 w-6 mx-auto mb-2 opacity-30" />
                    No transactions yet. Share your link to start earning!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Redeem Dialog */}
      <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Credits</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-muted/50 p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Available balance</p>
              <p className="text-3xl font-bold">
                {creditBalance.toLocaleString()}{" "}
                <span className="text-lg text-muted-foreground">credits</span>
              </p>
              <p className="text-sm text-muted-foreground">
                ≈ ${dollarValue} value
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Credits to redeem</label>
              <div className="flex gap-2">
                {[100, 500, 1000, creditBalance]
                  .filter(
                    (v, i, a) =>
                      a.indexOf(v) === i && v <= creditBalance && v > 0
                  )
                  .map(v => (
                    <Button
                      key={v}
                      size="sm"
                      variant={redeemAmount === v ? "default" : "outline"}
                      className="text-xs"
                      onClick={() => setRedeemAmount(v)}
                    >
                      {v}
                    </Button>
                  ))}
              </div>
              <Input
                type="number"
                min={100}
                max={creditBalance}
                step={100}
                value={redeemAmount}
                onChange={e => setRedeemAmount(Number(e.target.value))}
              />
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
              Redeeming <strong>{redeemAmount} credits</strong> ={" "}
              <strong>${(redeemAmount / 100).toFixed(2)}</strong> off your next
              invoice
            </div>
            <Button
              className="w-full"
              disabled={
                redeemAmount < 100 ||
                redeemAmount > creditBalance ||
                redeemCredits.isPending
              }
              onClick={() => redeemCredits.mutate({ amount: redeemAmount })}
            >
              {redeemCredits.isPending
                ? "Processing..."
                : `Redeem ${redeemAmount} Credits`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
