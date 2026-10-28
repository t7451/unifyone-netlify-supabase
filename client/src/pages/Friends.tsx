import { useState } from "react";
import { trpc } from "@/lib/trpc";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users,
  Search,
  Trophy,
  Swords,
  Bell,
  Star,
  Clock,
  UserPlus,
  UserCheck,
  UserX,
  Check,
  X,
  ChevronRight,
  Shield,
} from "lucide-react";

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatChallengeScore(score: number, unit: string): string {
  const normalizedUnit = unit.toLowerCase();
  const displayScore = Number.isInteger(score)
    ? score.toString()
    : score.toFixed(2);

  if (
    normalizedUnit.includes("dollar") ||
    normalizedUnit.includes("earn") ||
    normalizedUnit === "$"
  ) {
    return `$${Number(score).toFixed(2)}`;
  }

  return `${displayScore} ${unit}`;
}

// ── Challenge Modal ──────────────────────────────────────────────────────────
function ChallengeModal({
  friendId,
  friendName,
  open,
  onClose,
}: {
  friendId: number;
  friendName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(
    null
  );
  const challenges = trpc.gamification.getActiveChallenges.useQuery(undefined, {
    enabled: open,
  });
  const challengeFriend = trpc.socialFriends.challengeFriend.useMutation({
    onSuccess: () => {
      toast.success(`Challenge sent to ${friendName}!`);
      onClose();
      setMessage("");
      setSelectedChallengeId(null);
    },
    onError: e => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border border-primary/20 text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Swords className="w-5 h-5" />
            Challenge {friendName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pick an active challenge to compete on:
          </p>

          {challenges.isLoading ? (
            <div className="text-center text-muted-foreground py-4">
              Loading challenges…
            </div>
          ) : challenges.data?.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No active challenges right now. Ask an admin to create one.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {challenges.data?.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChallengeId(c.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedChallengeId === c.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{c.name}</span>
                    <Badge
                      variant="outline"
                      className="text-primary border-primary/40 text-xs"
                    >
                      +{c.pointsReward} pts
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Goal: {c.goal} {c.unit} · Ends {timeAgo(c.endsAt)}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Optional trash talk message
            </label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Think you can beat me? 😏"
              className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground resize-none"
              rows={2}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/20 text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!selectedChallengeId) {
                toast.error("Select a challenge first");
                return;
              }
              challengeFriend.mutate({
                friendId,
                challengeId: selectedChallengeId,
                message: message || undefined,
              });
            }}
            disabled={!selectedChallengeId || challengeFriend.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Swords className="w-4 h-4 mr-2" />
            {challengeFriend.isPending ? "Sending…" : "Send Challenge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Friends Tab ──────────────────────────────────────────────────────────────
function FriendsTab() {
  const [challengeTarget, setChallengeTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const friends = trpc.socialFriends.listFriends.useQuery();
  const removeFriend = trpc.socialFriends.removeFriend.useMutation({
    onSuccess: () => {
      toast.success("Friend removed");
      friends.refetch();
    },
    onError: e => toast.error(e.message),
  });

  if (friends.isLoading)
    return (
      <div className="text-center text-muted-foreground py-12">Loading friends…</div>
    );

  if (!friends.data?.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <Users className="w-12 h-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground font-medium">No friends yet</p>
        <p className="text-muted-foreground text-sm">
          Search for users in the Search tab to add your first friend.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.data.map(f => (
        <Card
          key={f.friendshipId}
          className="bg-card border border-border"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border border-primary/30">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {(f.name ?? "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {f.name ?? "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-primary">Lv {f.level}</span>
                  <span className="text-xs text-muted-foreground">
                    {f.totalPoints.toLocaleString()} pts
                  </span>
                  <span className="text-xs text-yellow-400 flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {f.achievementsUnlocked}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() =>
                    setChallengeTarget({
                      id: f.friendId,
                      name: f.name ?? "Friend",
                    })
                  }
                  className="bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 text-xs"
                >
                  <Swords className="w-3 h-3 mr-1" />
                  Challenge
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Remove ${f.name} as a friend?`)) {
                      removeFriend.mutate({ friendshipId: f.friendshipId });
                    }
                  }}
                  className="text-muted-foreground hover:text-red-400 hover:bg-red-900/20"
                >
                  <UserX className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {challengeTarget && (
        <ChallengeModal
          friendId={challengeTarget.id}
          friendName={challengeTarget.name}
          open={!!challengeTarget}
          onClose={() => setChallengeTarget(null)}
        />
      )}
    </div>
  );
}

// ── Search Tab ───────────────────────────────────────────────────────────────
function SearchTab() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const results = trpc.socialFriends.searchUsers.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );
  const sendRequest = trpc.socialFriends.sendRequest.useMutation({
    onSuccess: () => {
      toast.success("Friend request sent!");
      results.refetch();
    },
    onError: e => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            // Simple debounce via setTimeout
            const v = e.target.value;
            setTimeout(() => setDebouncedQuery(v), 400);
          }}
          placeholder="Search by name or email…"
          className="pl-9 bg-muted/30 border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {debouncedQuery.length < 2 && (
        <p className="text-center text-muted-foreground text-sm py-8">
          Type at least 2 characters to search
        </p>
      )}

      {results.isLoading && (
        <div className="text-center text-muted-foreground py-8">Searching…</div>
      )}

      {results.data?.length === 0 && debouncedQuery.length >= 2 && (
        <div className="text-center text-muted-foreground py-8">
          No users found for "{debouncedQuery}"
        </div>
      )}

      <div className="space-y-2">
        {results.data?.map(u => (
          <Card key={u.id} className="bg-card border border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarFallback className="bg-muted/30 text-foreground text-sm">
                    {(u.name ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {u.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="shrink-0">
                  {u.friendshipStatus === "accepted" ? (
                    <Badge className="bg-green-900/30 text-green-400 border-green-700/40">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Friends
                    </Badge>
                  ) : u.friendshipStatus === "pending" && u.isRequester ? (
                    <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-700/40">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  ) : u.friendshipStatus === "pending" && !u.isRequester ? (
                    <Badge className="bg-blue-900/30 text-blue-400 border-blue-700/40">
                      <Bell className="w-3 h-3 mr-1" />
                      Respond
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => sendRequest.mutate({ addresseeId: u.id })}
                      disabled={sendRequest.isPending}
                      className="bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 text-xs"
                    >
                      <UserPlus className="w-3 h-3 mr-1" />
                      Add Friend
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Requests Tab ─────────────────────────────────────────────────────────────
function RequestsTab() {
  const requests = trpc.socialFriends.listPendingRequests.useQuery();
  const accept = trpc.socialFriends.acceptRequest.useMutation({
    onSuccess: () => {
      toast.success("Friend request accepted!");
      requests.refetch();
    },
    onError: e => toast.error(e.message),
  });
  const decline = trpc.socialFriends.declineRequest.useMutation({
    onSuccess: () => {
      toast.success("Request declined");
      requests.refetch();
    },
    onError: e => toast.error(e.message),
  });

  const incoming = requests.data?.incoming ?? [];
  const outgoing = requests.data?.outgoing ?? [];

  if (requests.isLoading)
    return <div className="text-center text-muted-foreground py-12">Loading…</div>;

  if (!incoming.length && !outgoing.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <Bell className="w-12 h-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground font-medium">No pending requests</p>
        <p className="text-muted-foreground text-sm">
          Friend requests you send or receive will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Incoming ({incoming.length})
          </h3>
          <div className="space-y-2">
            {incoming.map(r => (
              <Card
                key={r.friendshipId}
                className="bg-card border border-primary/20"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {(r.name ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(r.sentAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() =>
                          accept.mutate({ friendshipId: r.friendshipId })
                        }
                        disabled={accept.isPending}
                        className="bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/40 text-xs"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          decline.mutate({ friendshipId: r.friendshipId })
                        }
                        disabled={decline.isPending}
                        className="text-muted-foreground hover:text-red-400 hover:bg-red-900/20 text-xs"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Sent ({outgoing.length})
          </h3>
          <div className="space-y-2">
            {outgoing.map(r => (
              <Card
                key={r.friendshipId}
                className="bg-card border border-border"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className="bg-muted/30 text-muted-foreground text-sm">
                        {(r.name ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Sent {timeAgo(r.sentAt)}
                      </p>
                    </div>
                    <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-700/30 text-xs">
                      Awaiting response
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Challenges Tab ───────────────────────────────────────────────────────────
function ChallengesTab() {
  const challenges = trpc.socialFriends.listFriendChallenges.useQuery();
  const results = trpc.socialFriends.getChallengeResults.useQuery();
  const respond = trpc.socialFriends.respondToChallenge.useMutation({
    onSuccess: async (_, vars) => {
      toast.success(
        vars.action === "accept"
          ? "Challenge accepted! May the best gig worker win."
          : "Challenge declined."
      );
      await Promise.all([challenges.refetch(), results.refetch()]);
    },
    onError: e => toast.error(e.message),
  });

  const received = challenges.data?.received ?? [];
  const sent = challenges.data?.sent ?? [];
  const resolved = results.data ?? [];

  // Filter out completed challenges from sent/received since they appear in the results section
  const activeSent = sent.filter(fc => fc.status !== "completed");
  const activeReceived = received.filter(fc => fc.status !== "completed");

  if (challenges.isLoading || results.isLoading)
    return (
      <div className="text-center text-muted-foreground py-12">
        Loading challenges...
      </div>
    );

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pending: {
        label: "Pending",
        className: "bg-yellow-900/20 text-yellow-400 border-yellow-700/30",
      },
      accepted: {
        label: "Active",
        className: "bg-blue-900/20 text-blue-400 border-blue-700/30",
      },
      declined: {
        label: "Declined",
        className: "bg-red-900/20 text-red-400 border-red-700/30",
      },
      completed: {
        label: "Completed",
        className: "bg-green-900/20 text-green-400 border-green-700/30",
      },
    };
    const s = map[status] ?? {
      label: status,
      className: "bg-gray-800 text-gray-400 border-gray-600",
    };
    return <Badge className={`text-xs ${s.className}`}>{s.label}</Badge>;
  };

  if (!activeReceived.length && !activeSent.length && !resolved.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <Swords className="w-12 h-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground font-medium">No challenges yet</p>
        <p className="text-muted-foreground text-sm">
          Go to the Friends tab and hit "Challenge" to start a head-to-head
          competition.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resolved Challenges Results */}
      {resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Results ({resolved.length})
          </h3>
          <div className="space-y-3">
            {resolved.map(r => (
              <Card
                key={r.id}
                className={`border ${
                  r.isTie
                    ? "bg-purple-900/10 border-purple-500/30"
                    : r.iWon
                      ? "bg-yellow-900/10 border-yellow-500/30"
                      : "bg-card border-border"
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Result banner */}
                  <div
                    className={`rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                      r.isTie
                        ? "bg-purple-600/20 text-purple-300"
                        : r.iWon
                          ? "bg-yellow-600/20 text-yellow-300"
                          : "bg-muted/30 text-foreground"
                    }`}
                  >
                    {r.isTie ? (
                      <span className="flex items-center justify-center gap-2">
                        <Shield className="w-4 h-4" />
                        Tie -- You both completed it at the same time!
                      </span>
                    ) : r.iWon ? (
                      <span className="flex items-center justify-center gap-2">
                        <Trophy className="w-4 h-4" />
                        You Won! +50 bonus points
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Star className="w-4 h-4" />
                        Challenge Complete -- better luck next time
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm">
                          {r.challengeName}
                        </p>
                        {r.isTie ? (
                          <Badge className="bg-purple-600/30 text-purple-300 border-purple-500/40 text-[10px] px-1.5">
                            Tie
                          </Badge>
                        ) : r.iWon ? (
                          <Badge className="bg-green-600/25 text-green-300 border-green-500/40 text-[10px] px-1.5">
                            🏆 You Won!
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            Better luck next time
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        vs <span className="text-foreground">{r.opponentName}</span>
                        {" -- "}
                        {r.myRole === "challenger"
                          ? "you challenged them"
                          : "they challenged you"}
                      </p>
                    </div>
                    <Badge className="bg-green-900/20 text-green-400 border-green-700/30 text-xs">
                      Completed
                    </Badge>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <span>You</span>
                      <span className="font-medium text-foreground">
                        {formatChallengeScore(r.myScore, r.unit)} /{" "}
                        {formatChallengeScore(r.goal, r.unit)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>{r.opponentName}</span>
                      <span className="font-medium text-foreground">
                        {formatChallengeScore(r.opponentScore, r.unit)} /{" "}
                        {formatChallengeScore(r.goal, r.unit)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-primary">
                      +{r.pointsReward} pts
                    </span>
                    {r.resolvedAt && (
                      <span className="text-xs text-muted-foreground">
                        Resolved {timeAgo(r.resolvedAt)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeReceived.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />
            Challenges Received ({activeReceived.length})
          </h3>
          <div className="space-y-3">
            {activeReceived.map(fc => (
              <Card
                key={fc.id}
                className="bg-card border border-primary/20"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {fc.challengeTitle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fc.challengeDescription}
                      </p>
                      {fc.message && (
                        <p className="text-xs text-purple-300 italic mt-1">
                          "{fc.message}"
                        </p>
                      )}
                    </div>
                    {statusBadge(fc.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        From:{" "}
                        <span className="text-foreground">{fc.otherUserName}</span>
                      </span>
                      <span className="text-xs text-primary">
                        +{fc.pointsReward} pts
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(fc.createdAt)}
                      </span>
                    </div>
                    {fc.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            respond.mutate({
                              friendChallengeId: fc.id,
                              action: "accept",
                            })
                          }
                          disabled={respond.isPending}
                          className="bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/40 text-xs"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            respond.mutate({
                              friendChallengeId: fc.id,
                              action: "decline",
                            })
                          }
                          disabled={respond.isPending}
                          className="text-muted-foreground hover:text-red-400 hover:bg-red-900/20 text-xs"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeSent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-blue-400" />
            Challenges Sent ({activeSent.length})
          </h3>
          <div className="space-y-3">
            {activeSent.map(fc => (
              <Card
                key={fc.id}
                className="bg-card border border-border"
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {fc.challengeTitle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fc.challengeDescription}
                      </p>
                      {fc.message && (
                        <p className="text-xs text-blue-300 italic mt-1">
                          "{fc.message}"
                        </p>
                      )}
                    </div>
                    {statusBadge(fc.status)}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      To: <span className="text-foreground">{fc.otherUserName}</span>
                    </span>
                    <span className="text-xs text-primary">
                      +{fc.pointsReward} pts
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(fc.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Friends() {
  const friends = trpc.socialFriends.listFriends.useQuery();
  const requests = trpc.socialFriends.listPendingRequests.useQuery();
  const challenges = trpc.socialFriends.listFriendChallenges.useQuery();

  const pendingCount = requests.data?.incoming.length ?? 0;
  const receivedChallenges = (challenges.data?.received ?? []).filter(
    c => c.status === "pending"
  ).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-7 h-7 text-primary" />
            Friends & Social
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {friends.data?.length ?? 0} friends · View achievements, challenge
            rivals
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge className="bg-primary/20 text-primary border-primary/40">
              {pendingCount} request{pendingCount > 1 ? "s" : ""}
            </Badge>
          )}
          {receivedChallenges > 0 && (
            <Badge className="bg-purple-600/20 text-purple-300 border-purple-600/40">
              {receivedChallenges} challenge{receivedChallenges > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="friends">
        <TabsList className="bg-muted/30 border border-border w-full grid grid-cols-4">
          <TabsTrigger
            value="friends"
            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground text-xs sm:text-sm"
          >
            <Users className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Friends</span>
          </TabsTrigger>
          <TabsTrigger
            value="search"
            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground text-xs sm:text-sm"
          >
            <Search className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Search</span>
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            className="relative data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground text-xs sm:text-sm"
          >
            <Bell className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Requests</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="challenges"
            className="relative data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground text-xs sm:text-sm"
          >
            <Swords className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Challenges</span>
            {receivedChallenges > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {receivedChallenges}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-4">
          <FriendsTab />
        </TabsContent>
        <TabsContent value="search" className="mt-4">
          <SearchTab />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          <RequestsTab />
        </TabsContent>
        <TabsContent value="challenges" className="mt-4">
          <ChallengesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
