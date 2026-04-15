import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Trophy,
  Star,
  Zap,
  Target,
  Flame,
  Award,
  Crown,
  Shield,
  TrendingUp,
  Users,
  Lock,
  CheckCircle2,
  Clock,
  Gift,
  Car,
  DollarSign,
} from "lucide-react";

const RARITY_COLORS: Record<string, string> = {
  common: "border-slate-500/50 bg-slate-500/5",
  uncommon: "border-green-500/50 bg-green-500/5",
  rare: "border-blue-500/50 bg-blue-500/5",
  epic: "border-purple-500/50 bg-purple-500/5",
  legendary: "border-yellow-500/50 bg-yellow-500/5",
};

const RARITY_BADGE: Record<string, string> = {
  common: "bg-gray-500/20 text-gray-300",
  uncommon: "bg-green-500/20 text-green-300",
  rare: "bg-blue-500/20 text-blue-300",
  epic: "bg-purple-500/20 text-purple-300",
  legendary: "bg-yellow-500/20 text-yellow-300",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  gig: Car,
  finance: DollarSign,
  milestone: Crown,
  social: Users,
  platform: Star,
  earning: TrendingUp,
  saving: Shield,
  streak: Flame,
};

type Achievement = {
  id: number;
  name: string;
  description: string | null;
  category: string;
  rarity: string;
  pointsReward: number;
  icon?: string | null;
  unlocked: boolean;
  unlockedAt?: Date | string | null;
};

function AchievementCard({ a }: { a: Achievement }) {
  const Icon = CATEGORY_ICONS[a.category] ?? Trophy;

  return (
    <Card
      className={`border transition-all ${a.unlocked ? (RARITY_COLORS[a.rarity] ?? RARITY_COLORS.common) : "border-border opacity-50"}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${a.unlocked ? "bg-primary/20" : "bg-muted"}`}
          >
            {a.unlocked ? (
              <Icon className="h-5 w-5 text-primary" />
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm text-foreground">{a.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.description}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${RARITY_BADGE[a.rarity] ?? RARITY_BADGE.common}`}
                >
                  {a.rarity}
                </span>
                <span className="text-xs text-yellow-400 font-medium">
                  +{a.pointsReward} pts
                </span>
              </div>
            </div>
            {a.unlocked && a.unlockedAt && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Earned {new Date(a.unlockedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AchievementsPage() {
  const [showAll, setShowAll] = useState(false);

  const pointsData = trpc.gamification.getPointsSummary.useQuery();
  const achievementsData = trpc.gamification.getAchievements.useQuery();
  const challengesData = trpc.gamification.getActiveChallenges.useQuery();
  const leaderboardData = trpc.gamification.getLeaderboard.useQuery({
    limit: 10,
  });

  const joinChallenge = trpc.gamification.joinChallenge.useMutation({
    onSuccess: () => {
      challengesData.refetch();
      toast.success("Challenge joined! Let's go! 🎯");
    },
    onError: () => toast.error("Failed to join challenge"),
  });

  const p = pointsData.data;
  const achievements: Achievement[] = achievementsData.data?.all ?? [];
  const earnedCount = Number(achievementsData.data?.unlocked ?? 0);
  const totalCount = Number(achievementsData.data?.total ?? 0);

  const levelProgress = p
    ? Math.min(
        100,
        Math.round(
          ((Number(p.totalPoints) % Number(p.nextLevelAt)) /
            Number(p.nextLevelAt)) *
            100
        )
      )
    : 0;

  const displayedAchievements = showAll
    ? achievements
    : achievements.slice(0, 8);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Achievements & Challenges
        </h1>
        <p className="text-sm text-muted-foreground">
          Earn points, unlock badges, climb the leaderboard
        </p>
      </div>

      {/* Points & Streak Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-2 border-border bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                <span className="font-semibold text-foreground">
                  Your Points
                </span>
              </div>
              <Badge variant="secondary">Level {p?.level ?? 1}</Badge>
            </div>
            <div className="text-4xl font-bold text-foreground mb-2">
              {(p?.totalPoints ?? 0).toLocaleString()}
            </div>
            {p && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Level {p.level}</span>
                  <span>
                    {(
                      Number(p.nextLevelAt) -
                      (Number(p.totalPoints) % Number(p.nextLevelAt))
                    ).toLocaleString()}{" "}
                    pts to Level {p.level + 1}
                  </span>
                </div>
                <Progress value={levelProgress} className="h-2" />
              </div>
            )}
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span>
                Lifetime:{" "}
                <span className="text-foreground font-medium">
                  {(p?.lifetimePoints ?? 0).toLocaleString()}
                </span>
              </span>
              <span>
                Streak:{" "}
                <span className="text-foreground font-medium">
                  {p?.streakDays ?? 0} days
                </span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full">
            <Flame
              className={`h-10 w-10 mb-2 ${(p?.streakDays ?? 0) > 0 ? "text-orange-500" : "text-muted-foreground"}`}
            />
            <div className="text-3xl font-bold text-foreground">
              {p?.streakDays ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
            <p className="text-xs text-muted-foreground mt-2">
              Log activity daily to maintain your streak
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="achievements">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="achievements" className="text-xs sm:text-sm">
            Achievements
          </TabsTrigger>
          <TabsTrigger value="challenges" className="text-xs sm:text-sm">
            Challenges
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-xs sm:text-sm">
            Leaderboard
          </TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {earnedCount} / {totalCount} unlocked
            </p>
            {totalCount > 0 && (
              <Progress
                value={Math.round((earnedCount / totalCount) * 100)}
                className="h-1.5 w-24"
              />
            )}
          </div>

          {achievementsData.isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          )}

          {!achievementsData.isLoading && achievements.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No achievements yet. Start earning!</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayedAchievements.map(a => (
              <AchievementCard key={a.id} a={a} />
            ))}
          </div>

          {achievements.length > 8 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAll(v => !v)}
            >
              {showAll
                ? "Show Less"
                : `Show All ${achievements.length} Achievements`}
            </Button>
          )}
        </TabsContent>

        {/* Challenges Tab */}
        <TabsContent value="challenges" className="mt-4 space-y-4">
          {challengesData.isLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          )}

          {!challengesData.isLoading &&
            (challengesData.data?.length ?? 0) === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No active challenges right now.</p>
                <p className="text-xs mt-1">
                  Check back soon — new challenges are added weekly!
                </p>
              </div>
            )}

          <div className="space-y-3">
            {challengesData.data?.map(challenge => {
              const pct =
                challenge.goal > 0
                  ? Math.min(
                      100,
                      Math.round(
                        ((challenge.userProgress?.progress ?? 0) /
                          challenge.goal) *
                          100
                      )
                    )
                  : 0;
              const hasJoined = !!challenge.userProgress;
              const isCompleted = challenge.userProgress?.completedAt != null;
              const daysLeft = challenge.endsAt
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(challenge.endsAt).getTime() - Date.now()) /
                        86400000
                    )
                  )
                : null;

              return (
                <Card
                  key={challenge.id}
                  className={`border-border ${isCompleted ? "border-green-500/40 bg-green-500/5" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground">
                            {challenge.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {challenge.type.replace("_", " ")}
                          </Badge>
                          {isCompleted && (
                            <Badge className="text-xs bg-green-600">
                              Completed
                            </Badge>
                          )}
                        </div>
                        {challenge.description != null && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {challenge.description}
                          </p>
                        )}
                        {hasJoined && !isCompleted && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>
                                {challenge.userProgress?.progress ?? 0} /{" "}
                                {challenge.goal} {challenge.unit}
                              </span>
                              <span>{pct}%</span>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-yellow-400">
                            <Gift className="h-3 w-3" />+
                            {challenge.pointsReward} pts
                          </span>
                          {daysLeft !== null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {daysLeft}d left
                            </span>
                          )}
                          {challenge.maxParticipants && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Max {challenge.maxParticipants}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isCompleted && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {!hasJoined && !isCompleted && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              joinChallenge.mutate({
                                challengeId: challenge.id,
                              })
                            }
                            disabled={joinChallenge.isPending}
                          >
                            Join
                          </Button>
                        )}
                        {hasJoined && !isCompleted && (
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="mt-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-400" />
                Top Earners
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {leaderboardData.isLoading && (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 rounded bg-muted animate-pulse"
                    />
                  ))}
                </div>
              )}
              {(leaderboardData.data?.leaderboard?.length ?? 0) === 0 &&
                !leaderboardData.isLoading && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No leaderboard data yet.
                  </div>
                )}
              {leaderboardData.data?.leaderboard?.map((entry, idx) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 p-3 rounded-lg ${entry.isMe ? "bg-primary/10 border border-primary/30" : idx < 3 ? "bg-primary/5" : "hover:bg-muted/50"} transition-colors`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      idx === 0
                        ? "bg-yellow-500 text-black"
                        : idx === 1
                          ? "bg-slate-400 text-black"
                          : idx === 2
                            ? "bg-orange-600 text-white"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {entry.name}
                      {entry.isMe && (
                        <span className="text-xs text-primary ml-1">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Level {entry.level}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-yellow-400">
                      {entry.totalPoints.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">pts</div>
                  </div>
                  {idx === 0 && (
                    <Crown className="h-4 w-4 text-yellow-400 shrink-0" />
                  )}
                  {idx === 1 && (
                    <Award className="h-4 w-4 text-gray-400 shrink-0" />
                  )}
                  {idx === 2 && (
                    <Award className="h-4 w-4 text-orange-500 shrink-0" />
                  )}
                </div>
              ))}
              {leaderboardData.data?.myRank && (
                <div className="pt-2 border-t border-border mt-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Your rank:{" "}
                    <span className="text-foreground font-medium">
                      #{leaderboardData.data.myRank}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
