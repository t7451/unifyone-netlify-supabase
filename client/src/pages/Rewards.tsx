import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Key,
  Gift,
  History,
  TrendingUp,
  Star,
  Zap,
  Users,
  ShoppingCart,
  Trophy,
  Tag,
  CheckCircle2,
  Clock,
  Loader2,
  BarChart3,
} from "lucide-react";

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  signup: {
    label: "Sign Up",
    icon: Star,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  referral: {
    label: "Referral",
    icon: Users,
    color: "text-teal-400",
    bg: "bg-teal-400/10",
  },
  purchase: {
    label: "Purchase",
    icon: ShoppingCart,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  engagement: {
    label: "Engagement",
    icon: Zap,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  milestone: {
    label: "Milestone",
    icon: Trophy,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  promotion: {
    label: "Promo",
    icon: Tag,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
};

// ─── Opportunity Card ─────────────────────────────────────────────────────────

function OpportunityCard({
  opp,
  onClaim,
  claiming,
}: {
  opp: {
    id: number;
    title: string;
    description?: string | null;
    credits: number;
    category: string;
    maxClaimsPerUser: number;
    userClaimCount: number;
    canClaim: boolean;
    expiresAt?: Date | null;
  };
  onClaim: (id: number) => void;
  claiming: boolean;
}) {
  const cfg = CATEGORY_CONFIG[opp.category] ?? CATEGORY_CONFIG.engagement;
  const Icon = cfg.icon;
  const claimed = !opp.canClaim && opp.userClaimCount > 0;

  return (
    <Card
      className={`border transition-all ${claimed ? "opacity-60" : "hover:border-teal-500/40"}`}
    >
      <CardContent className="p-4 flex items-start gap-4">
        <div className={`rounded-xl p-3 ${cfg.bg} flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm leading-tight">{opp.title}</p>
              {opp.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {opp.description}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <Badge
                variant="secondary"
                className="text-teal-400 bg-teal-400/10 border-teal-400/20 font-bold text-sm px-2"
              >
                +{opp.credits} <Key className="w-3 h-3 ml-1 inline" />
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs ${cfg.color} border-current/30`}
              >
                {cfg.label}
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {opp.expiresAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires {new Date(opp.expiresAt).toLocaleDateString()}
                </span>
              )}
              {opp.maxClaimsPerUser > 1 && (
                <span>
                  {opp.userClaimCount}/{opp.maxClaimsPerUser} claimed
                </span>
              )}
            </div>
            {claimed ? (
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Claimed
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-teal-500/40 text-teal-400 hover:bg-teal-500/10"
                onClick={() => onClaim(opp.id)}
                disabled={claiming || !opp.canClaim}
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  "Claim"
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Rewards() {
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const { data: balanceData, refetch: refetchBalance } =
    trpc.rewards.getBalance.useQuery();
  const {
    data: opportunities,
    isLoading: oppsLoading,
    refetch: refetchOpps,
  } = trpc.rewards.listOpportunities.useQuery();
  const { data: history, isLoading: histLoading } =
    trpc.rewards.getHistory.useQuery({ limit: 20 });
  const { data: creditHistory } = trpc.rewards.getCreditHistory.useQuery({
    limit: 30,
  });

  const claimMutation = trpc.rewards.claimOpportunity.useMutation({
    onSuccess: result => {
      toast.success(`+${result.credits} Rewards Keys earned!`, {
        description: result.opportunityTitle,
      });

      if (result.metaEventId) {
        fireCapiMutation.mutate({
          eventId: result.metaEventId,
          credits: result.credits,
          source: "rewards_claim",
          eventSourceUrl: window.location.href,
        });
      }

      refetchBalance();
      refetchOpps();
    },
    onError: error => {
      toast.error(error.message || "Failed to claim reward. Please try again.");
    },
    onSettled: () => {
      setClaimingId(null);
    },
  });
  const fireCapiMutation = trpc.meta.fireRewardsKeyEarned.useMutation();

  const handleClaim = (opportunityId: number) => {
    setClaimingId(opportunityId);
    claimMutation.mutate({ opportunityId });
  };

  const balance = balanceData?.balance ?? 0;
  const totalEarned =
    creditHistory
      ?.filter(t => t.type === "earned" || t.type === "bonus")
      .reduce((sum, t) => sum + t.amount, 0) ?? 0;
  const totalRedeemed =
    creditHistory
      ?.filter(t => t.type === "redeemed")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Key className="w-6 h-6 text-teal-400" />
          Rewards Keys
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Earn credits by completing actions. Redeem them for platform benefits.
        </p>
      </div>

      {/* Balance Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-teal-500/30 bg-teal-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-teal-400/20 p-3">
              <Key className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-400">
                {balance.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Current Balance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-400/10 p-3">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {totalEarned.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Earned</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-blue-400/10 p-3">
              <Gift className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {totalRedeemed.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Redeemed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="earn">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="earn">
            <Gift className="w-4 h-4 mr-1.5" />
            Earn
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-1.5" />
            History
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <BarChart3 className="w-4 h-4 mr-1.5" />
            Credits
          </TabsTrigger>
        </TabsList>

        {/* Earn Tab */}
        <TabsContent value="earn" className="mt-4 space-y-3">
          {oppsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading opportunities...
            </div>
          ) : !opportunities?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">
                  No opportunities available right now
                </p>
                <p className="text-sm mt-1">
                  Check back soon for new ways to earn Rewards Keys.
                </p>
              </CardContent>
            </Card>
          ) : (
            opportunities.map(opp => (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                onClaim={handleClaim}
                claiming={claimingId === opp.id}
              />
            ))
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          {histLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading history...
            </div>
          ) : !history?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No claims yet</p>
                <p className="text-sm mt-1">
                  Start earning by claiming opportunities above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {history.map(claim => {
                    const cfg =
                      CATEGORY_CONFIG[
                        claim.opportunityCategory ?? "engagement"
                      ] ?? CATEGORY_CONFIG.engagement;
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={claim.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${cfg.bg}`}>
                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {claim.opportunityTitle ?? "Reward"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(claim.claimedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-teal-400 bg-teal-400/10 font-bold"
                        >
                          +{claim.credits}{" "}
                          <Key className="w-3 h-3 ml-1 inline" />
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="transactions" className="mt-4">
          {!creditHistory?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No transactions yet</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Credit Ledger</CardTitle>
                <CardDescription className="text-xs">
                  All credit movements on your account
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {creditHistory.map(txn => {
                    const isPositive = txn.amount > 0;
                    return (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {txn.description ?? txn.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Balance after: {txn.balanceAfter} &middot;{" "}
                            {new Date(txn.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`font-bold text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {isPositive ? "+" : ""}
                          {txn.amount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
