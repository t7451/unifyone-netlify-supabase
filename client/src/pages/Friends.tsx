import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users, Search, Trophy, Swords, Bell, Star, Clock,
  UserPlus, UserCheck, UserX, Check, X, ChevronRight,
  Shield
} from "lucide-react";

// ── Rarity colour map ────────────────────────────────────────────────────────
const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-400 border-gray-600",
  uncommon: "text-green-400 border-green-600",
  rare: "text-blue-400 border-blue-600",
  epic: "text-purple-400 border-purple-600",
  legendary: "text-yellow-400 border-yellow-600",
};
const RARITY_BG: Record<string, string> = {
  common: "bg-gray-800/40",
  uncommon: "bg-green-900/20",
  rare: "bg-blue-900/20",
  epic: "bg-purple-900/20",
  legendary: "bg-yellow-900/20",
};

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
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
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const challenges = trpc.gamification.getActiveChallenges.useQuery(undefined, { enabled: open });
  const challengeFriend = trpc.socialFriends.challengeFriend.useMutation({
    onSuccess: () => {
      toast.success(`Challenge sent to ${friendName}!`);
      onClose();
      setMessage("");
      setSelectedChallengeId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0D1B3E] border border-[#00D9FF]/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#00D9FF]">
            <Swords className="w-5 h-5" />
            Challenge {friendName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-400">Pick an active challenge to compete on:</p>

          {challenges.isLoading ? (
            <div className="text-center text-gray-500 py-4">Loading challenges…</div>
          ) : challenges.data?.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No active challenges right now. Ask an admin to create one.</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {challenges.data?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChallengeId(c.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedChallengeId === c.id
                      ? "border-[#00D9FF] bg-[#00D9FF]/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{c.name}</span>
                    <Badge variant="outline" className="text-[#00D9FF] border-[#00D9FF]/40 text-xs">
                      +{c.pointsReward} pts
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{c.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Goal: {c.goal} {c.unit} · Ends {timeAgo(c.endsAt)}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Optional trash talk message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Think you can beat me? 😏"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 resize-none"
              rows={2}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/20 text-gray-300">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!selectedChallengeId) { toast.error("Select a challenge first"); return; }
              challengeFriend.mutate({ friendId, challengeId: selectedChallengeId, message: message || undefined });
            }}
            disabled={!selectedChallengeId || challengeFriend.isPending}
            className="bg-[#00D9FF] text-black hover:bg-[#00D9FF]/90"
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
  const [challengeTarget, setChallengeTarget] = useState<{ id: number; name: string } | null>(null);
  const friends = trpc.socialFriends.listFriends.useQuery();
  const removeFriend = trpc.socialFriends.removeFriend.useMutation({
    onSuccess: () => { toast.success("Friend removed"); friends.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (friends.isLoading) return <div className="text-center text-gray-500 py-12">Loading friends…</div>;

  if (!friends.data?.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <Users className="w-12 h-12 text-gray-600 mx-auto" />
        <p className="text-gray-400 font-medium">No friends yet</p>
        <p className="text-gray-600 text-sm">Search for users in the Search tab to add your first friend.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.data.map((f) => (
        <Card key={f.friendshipId} className="bg-[#0D1B3E]/60 border border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border border-[#00D9FF]/30">
                <AvatarFallback className="bg-[#00D9FF]/10 text-[#00D9FF] font-bold">
                  {(f.name ?? "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{f.name ?? "Unknown"}</p>
                <p className="text-xs text-gray-400 truncate">{f.email}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-[#00D9FF]">Lv {f.level}</span>
                  <span className="text-xs text-gray-500">{f.totalPoints.toLocaleString()} pts</span>
                  <span className="text-xs text-yellow-400 flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {f.achievementsUnlocked}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => setChallengeTarget({ id: f.friendId, name: f.name ?? "Friend" })}
                  className="bg-purple-600/20 text-purple-300 border border-purple-600/30 hover:bg-purple-600/40 text-xs"
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
                  className="text-gray-500 hover:text-red-400 hover:bg-red-900/20"
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
    onSuccess: () => { toast.success("Friend request sent!"); results.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Simple debounce via setTimeout
            const v = e.target.value;
            setTimeout(() => setDebouncedQuery(v), 400);
          }}
          placeholder="Search by name or email…"
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
        />
      </div>

      {debouncedQuery.length < 2 && (
        <p className="text-center text-gray-600 text-sm py-8">Type at least 2 characters to search</p>
      )}

      {results.isLoading && <div className="text-center text-gray-500 py-8">Searching…</div>}

      {results.data?.length === 0 && debouncedQuery.length >= 2 && (
        <div className="text-center text-gray-500 py-8">No users found for "{debouncedQuery}"</div>
      )}

      <div className="space-y-2">
        {results.data?.map((u) => (
          <Card key={u.id} className="bg-[#0D1B3E]/60 border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-white/10">
                  <AvatarFallback className="bg-white/5 text-gray-300 text-sm">
                    {(u.name ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{u.name ?? "Unknown"}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
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
                      className="bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/30 hover:bg-[#00D9FF]/20 text-xs"
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
    onSuccess: () => { toast.success("Friend request accepted!"); requests.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const decline = trpc.socialFriends.declineRequest.useMutation({
    onSuccess: () => { toast.success("Request declined"); requests.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const incoming = requests.data?.incoming ?? [];
  const outgoing = requests.data?.outgoing ?? [];

  if (requests.isLoading) return <div className="text-center text-gray-500 py-12">Loading…</div>;

  if (!incoming.length && !outgoing.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <Bell className="w-12 h-12 text-gray-600 mx-auto" />
        <p className="text-gray-400 font-medium">No pending requests</p>
        <p className="text-gray-600 text-sm">Friend requests you send or receive will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Incoming ({incoming.length})
          </h3>
          <div className="space-y-2">
            {incoming.map((r) => (
              <Card key={r.friendshipId} className="bg-[#0D1B3E]/60 border border-[#00D9FF]/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-[#00D9FF]/20">
                      <AvatarFallback className="bg-[#00D9FF]/10 text-[#00D9FF] text-sm">
                        {(r.name ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm">{r.name}</p>
                      <p className="text-xs text-gray-500">{timeAgo(r.sentAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => accept.mutate({ friendshipId: r.friendshipId })}
                        disabled={accept.isPending}
                        className="bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/40 text-xs"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => decline.mutate({ friendshipId: r.friendshipId })}
                        disabled={decline.isPending}
                        className="text-gray-500 hover:text-red-400 hover:bg-red-900/20 text-xs"
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
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Sent ({outgoing.length})
          </h3>
          <div className="space-y-2">
            {outgoing.map((r) => (
              <Card key={r.friendshipId} className="bg-[#0D1B3E]/40 border border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarFallback className="bg-white/5 text-gray-400 text-sm">
                        {(r.name ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm">{r.name}</p>
                      <p className="text-xs text-gray-500">Sent {timeAgo(r.sentAt)}</p>
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
    onSuccess: (_, vars) => {
      toast.success(vars.action === "accept" ? "Challenge accepted! May the best gig worker win." : "Challenge declined.");
      challenges.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const received = challenges.data?.received ?? [];
  const sent = challenges.data?.sent ?? [];
  const resolved = results.data ?? [];

  // Filter out completed challenges from sent/received since they appear in the results section
  const activeSent = sent.filter((fc) => fc.status !== "completed");
  const activeReceived = received.filter((fc) => fc.status !== "completed");

  if (challenges.isLoading || results.isLoading) return <div className="text-center text-gray-500 py-12">Loading challenges...</div>;

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-900/20 text-yellow-400 border-yellow-700/30" },
      accepted: { label: "Active", className: "bg-blue-900/20 text-blue-400 border-blue-700/30" },
      declined: { label: "Declined", className: "bg-red-900/20 text-red-400 border-red-700/30" },
      completed: { label: "Completed", className: "bg-green-900/20 text-green-400 border-green-700/30" },
    };
    const s = map[status] ?? { label: status, className: "bg-gray-800 text-gray-400 border-gray-600" };
    return <Badge className={`text-xs ${s.className}`}>{s.label}</Badge>;
  };

  if (!activeReceived.length && !activeSent.length && !resolved.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <Swords className="w-12 h-12 text-gray-600 mx-auto" />
        <p className="text-gray-400 font-medium">No challenges yet</p>
        <p className="text-gray-600 text-sm">
          Go to the Friends tab and hit "Challenge" to start a head-to-head competition.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resolved Challenges Results */}
      {resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Results ({resolved.length})
          </h3>
          <div className="space-y-3">
            {resolved.map((r) => (
              <Card
                key={r.id}
                className={`border ${
                  r.isTie
                    ? "bg-purple-900/10 border-purple-500/30"
                    : r.iWon
                    ? "bg-yellow-900/10 border-yellow-500/30"
                    : "bg-[#0D1B3E]/40 border-white/10"
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
                        : "bg-gray-700/30 text-gray-300"
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
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white text-sm">{r.challengeName}</p>
                        {r.iWon && (
                          <Badge className="bg-yellow-600/30 text-yellow-300 border-yellow-500/40 text-[10px] px-1.5">
                            Winner
                          </Badge>
                        )}
                        {r.isTie && (
                          <Badge className="bg-purple-600/30 text-purple-300 border-purple-500/40 text-[10px] px-1.5">
                            Tied
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        vs <span className="text-white">{r.opponentName}</span>
                        {" -- "}
                        {r.myRole === "challenger" ? "you challenged them" : "they challenged you"}
                      </p>
                    </div>
                    <Badge className="bg-green-900/20 text-green-400 border-green-700/30 text-xs">
                      Completed
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#00D9FF]">+{r.pointsReward} pts</span>
                    {r.resolvedAt && (
                      <span className="text-xs text-gray-600">Resolved {timeAgo(r.resolvedAt)}</span>
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
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Swords className="w-4 h-4 text-purple-400" />
            Challenges Received ({activeReceived.length})
          </h3>
          <div className="space-y-3">
            {activeReceived.map((fc) => (
              <Card key={fc.id} className="bg-[#0D1B3E]/60 border border-purple-500/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white text-sm">{fc.challengeTitle}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fc.challengeDescription}</p>
                      {fc.message && (
                        <p className="text-xs text-purple-300 italic mt-1">"{fc.message}"</p>
                      )}
                    </div>
                    {statusBadge(fc.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">From: <span className="text-white">{fc.otherUserName}</span></span>
                      <span className="text-xs text-[#00D9FF]">+{fc.pointsReward} pts</span>
                      <span className="text-xs text-gray-600">{timeAgo(fc.createdAt)}</span>
                    </div>
                    {fc.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => respond.mutate({ friendChallengeId: fc.id, action: "accept" })}
                          disabled={respond.isPending}
                          className="bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/40 text-xs"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => respond.mutate({ friendChallengeId: fc.id, action: "decline" })}
                          disabled={respond.isPending}
                          className="text-gray-500 hover:text-red-400 hover:bg-red-900/20 text-xs"
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
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-blue-400" />
            Challenges Sent ({activeSent.length})
          </h3>
          <div className="space-y-3">
            {activeSent.map((fc) => (
              <Card key={fc.id} className="bg-[#0D1B3E]/40 border border-white/10">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white text-sm">{fc.challengeTitle}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fc.challengeDescription}</p>
                      {fc.message && (
                        <p className="text-xs text-blue-300 italic mt-1">"{fc.message}"</p>
                      )}
                    </div>
                    {statusBadge(fc.status)}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">To: <span className="text-white">{fc.otherUserName}</span></span>
                    <span className="text-xs text-[#00D9FF]">+{fc.pointsReward} pts</span>
                    <span className="text-xs text-gray-600">{timeAgo(fc.createdAt)}</span>
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
  const receivedChallenges = (challenges.data?.received ?? []).filter(c => c.status === "pending").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-[#00D9FF]" />
            Friends & Social
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {friends.data?.length ?? 0} friends · View achievements, challenge rivals
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge className="bg-[#00D9FF]/20 text-[#00D9FF] border-[#00D9FF]/40">
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
        <TabsList className="bg-white/5 border border-white/10 w-full grid grid-cols-4">
          <TabsTrigger value="friends" className="data-[state=active]:bg-[#00D9FF]/10 data-[state=active]:text-[#00D9FF] text-gray-400 text-xs sm:text-sm">
            <Users className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Friends</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="data-[state=active]:bg-[#00D9FF]/10 data-[state=active]:text-[#00D9FF] text-gray-400 text-xs sm:text-sm">
            <Search className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Search</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="relative data-[state=active]:bg-[#00D9FF]/10 data-[state=active]:text-[#00D9FF] text-gray-400 text-xs sm:text-sm">
            <Bell className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Requests</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#00D9FF] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="challenges" className="relative data-[state=active]:bg-purple-600/10 data-[state=active]:text-purple-300 text-gray-400 text-xs sm:text-sm">
            <Swords className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Challenges</span>
            {receivedChallenges > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
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
