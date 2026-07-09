import { useState } from "react";
import {
  useTeamMembersQuery,
  useTeamInvitesQuery,
  useInviteMemberMutation,
  useRevokeInviteMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
} from "@/lib/api/useTeamData";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Copy,
  RefreshCw,
  Crown,
  Loader2,
} from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  user: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const INVITE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  accepted: "bg-emerald-500/20 text-emerald-400",
  expired: "bg-gray-500/20 text-gray-400",
  revoked: "bg-red-500/20 text-red-400",
};

export default function Team() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"user" | "admin">("user");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [removingMemberName, setRemovingMemberName] = useState<string>("");

  const members = useTeamMembersQuery();
  const invites = useTeamInvitesQuery();

  const sendInvite = useInviteMemberMutation({
    onSuccess: data => {
      const link = `${window.location.origin}/join?token=${data.token}`;
      setInviteLink(link);
      toast.success("Invite link created. Share it with your teammate.");
    },
    onError: error =>
      toast.error(error.message || "Something went wrong. Please try again."),
  });

  const revokeInvite = useRevokeInviteMutation({
    onSuccess: () => {
      toast.success("Team invite revoked");
    },
    onError: error =>
      toast.error(error.message || "Something went wrong. Please try again."),
  });

  const updateRole = useUpdateMemberRoleMutation({
    onSuccess: variables => {
      toast.success(`Team member role updated to ${variables.role}`);
    },
    onError: error =>
      toast.error(error.message || "Something went wrong. Please try again."),
  });

  const removeMember = useRemoveMemberMutation({
    onSuccess: () => {
      setRemovingMemberId(null);
      toast.success("Team member removed");
    },
    onError: error => {
      setRemovingMemberId(null);
      toast.error(error.message || "Something went wrong. Please try again.");
    },
  });

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) return;
    sendInvite.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied to clipboard!");
  };

  const pendingInvites = (invites.data ?? []).filter(
    i => i.status === "pending"
  );
  const pastInvites = (invites.data ?? []).filter(i => i.status !== "pending");

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-gray-400 text-sm mt-1">
            {members.data?.length ?? 0} member
            {(members.data?.length ?? 0) !== 1 ? "s" : ""} · Manage access and
            roles
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setShowInviteModal(true);
              setInviteLink(null);
              setInviteEmail("");
            }}
            className="bg-[#D4A843] text-[#020202] hover:bg-[#D4A843]/90 font-semibold"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Invite Member
          </Button>
        )}
      </div>

      {/* Team Members */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-white/3 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-gray-300 text-sm font-medium">
            Team Members
          </span>
        </div>
        {members.isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : members.isError ? (
          <div className="p-12 text-center">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              Failed to load team members
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {members.error?.message || "Something went wrong."}
            </p>
            <Button
              variant="ghost"
              className="mt-3 border border-white/10 text-gray-300 hover:bg-white/5"
              onClick={() => members.refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        ) : (members.data ?? []).length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No team members yet</p>
            <p className="text-gray-600 text-sm mt-1">
              Invite your first team member to get started
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  "Member",
                  "Email",
                  "Role",
                  "Last Active",
                  ...(isAdmin ? ["Actions"] : []),
                ].map(h => (
                  <th
                    key={h}
                    className="text-left text-gray-400 text-xs font-medium px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(members.data ?? []).map((m: any) => (
                <tr
                  key={m.id}
                  className="border-b border-border hover:bg-white/2 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4A843]/30 to-purple-500/30 flex items-center justify-center text-white text-xs font-bold">
                        {(m.name ?? m.email ?? "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {m.name ?? "—"}
                        </p>
                        {m.id === user?.id && (
                          <span className="text-[#D4A843] text-xs">You</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {m.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && m.id !== user?.id ? (
                      <Select
                        value={m.role}
                        disabled={
                          updateRole.isPending &&
                          updateRole.variables?.userId === m.id
                        }
                        onValueChange={v =>
                          updateRole.mutate({
                            userId: m.id,
                            role: v as "user" | "admin",
                          })
                        }
                      >
                        <SelectTrigger className="w-28 h-7 bg-white/5 border-white/10 text-gray-300 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0F172A] border-white/10">
                          <SelectItem value="user" className="text-xs">
                            User
                          </SelectItem>
                          <SelectItem value="admin" className="text-xs">
                            Admin
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${ROLE_COLORS[m.role] ?? ""}`}
                      >
                        {m.role === "admin" ? (
                          <Crown className="w-3 h-3 mr-1" />
                        ) : (
                          <Shield className="w-3 h-3 mr-1" />
                        )}
                        {m.role}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {m.lastSignedIn
                      ? new Date(m.lastSignedIn).toLocaleDateString()
                      : "Never"}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {m.id !== user?.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => {
                            setRemovingMemberId(m.id);
                            setRemovingMemberName(
                              m.name ?? m.email ?? "this member"
                            );
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invites loading */}
      {isAdmin && invites.isLoading && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 bg-white/3 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-gray-300 text-sm font-medium">Invites</span>
          </div>
          <div className="divide-y divide-border">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invites error */}
      {isAdmin && invites.isError && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 bg-white/3 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-gray-300 text-sm font-medium">Invites</span>
          </div>
          <div className="p-8 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Failed to load invites</p>
            <p className="text-gray-600 text-xs mt-1">
              {invites.error?.message || "Something went wrong."}
            </p>
            <Button
              variant="ghost"
              className="mt-3 border border-white/10 text-gray-300 hover:bg-white/5"
              onClick={() => invites.refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        </div>
      )}

      {/* Pending Invites */}
      {isAdmin && pendingInvites.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 bg-white/3 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-gray-300 text-sm font-medium">
              Pending Invites
            </span>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs ml-auto">
              {pendingInvites.length}
            </Badge>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Email", "Role", "Sent", "Expires", "Actions"].map(h => (
                  <th
                    key={h}
                    className="text-left text-gray-400 text-xs font-medium px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingInvites.map((inv: any) => (
                <tr
                  key={inv.id}
                  className="border-b border-border hover:bg-white/2 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-white text-sm">{inv.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${ROLE_COLORS[inv.role] ?? ""}`}
                    >
                      {inv.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-[#D4A843] hover:text-[#D4A843]/80 gap-1"
                        onClick={() => {
                          const link = `${window.location.origin}/join?token=${inv.token}`;
                          navigator.clipboard.writeText(link);
                          toast.success("Invite link copied!");
                        }}
                      >
                        <Copy className="w-3 h-3" /> Copy Link
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => revokeInvite.mutate({ id: inv.id })}
                        disabled={
                          revokeInvite.isPending &&
                          revokeInvite.variables?.id === inv.id
                        }
                      >
                        {revokeInvite.isPending &&
                        revokeInvite.variables?.id === inv.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Past Invites (collapsed) */}
      {isAdmin && pastInvites.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 bg-white/3 border-b border-border flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400 text-sm font-medium">
              Invite History
            </span>
            <span className="text-gray-600 text-xs ml-auto">
              {pastInvites.length} entries
            </span>
          </div>
          <table className="w-full">
            <tbody>
              {pastInvites.slice(0, 5).map((inv: any) => (
                <tr key={inv.id} className="border-b border-border">
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {inv.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full capitalize ${INVITE_STATUS_COLORS[inv.status] ?? ""}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {inv.acceptedAt
                      ? `Accepted ${new Date(inv.acceptedAt).toLocaleDateString()}`
                      : new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="bg-[#0F172A] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#D4A843]" />
              Invite Team Member
            </DialogTitle>
          </DialogHeader>

          {!inviteLink ? (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  onKeyDown={e => e.key === "Enter" && handleSendInvite()}
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">
                  Role
                </label>
                <Select
                  value={inviteRole}
                  onValueChange={v => setInviteRole(v as "user" | "admin")}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F172A] border-white/10">
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        <div>
                          <p className="text-sm">Member</p>
                          <p className="text-xs text-gray-500">
                            Can view and manage orders, products, customers
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                        <div>
                          <p className="text-sm">Admin</p>
                          <p className="text-xs text-gray-500">
                            Full access including settings and billing
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-xs text-gray-400">
                <p>
                  An invite link will be generated. Share it with your team
                  member — they'll need to sign in with their account to join.
                </p>
                <p className="mt-1 text-gray-500">Link expires in 7 days.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  variant="ghost"
                  className="flex-1 border border-white/10 text-gray-300 hover:bg-white/5"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#D4A843] text-[#020202] hover:bg-[#D4A843]/90 font-semibold"
                  onClick={handleSendInvite}
                  disabled={!inviteEmail.trim() || sendInvite.isPending}
                >
                  {sendInvite.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" /> Generate Invite
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-white font-semibold">Invite Created!</p>
                <p className="text-gray-400 text-sm mt-1">
                  Share this link with your team member
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 flex items-center gap-2">
                <code className="text-[#D4A843] text-xs flex-1 truncate">
                  {inviteLink}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-7 w-7 p-0 text-gray-400 hover:text-[#D4A843]"
                  onClick={copyInviteLink}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Button
                className="w-full bg-[#D4A843] text-[#020202] hover:bg-[#D4A843]/90 font-semibold"
                onClick={copyInviteLink}
              >
                <Copy className="w-4 h-4 mr-2" /> Copy Invite Link
              </Button>
              <Button
                variant="ghost"
                className="w-full border border-white/10 text-gray-300 hover:bg-white/5"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteLink(null);
                }}
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removingMemberId !== null}
        onOpenChange={open => !open && setRemovingMemberId(null)}
      >
        <AlertDialogContent className="bg-[#0F172A] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will remove{" "}
              <span className="text-white font-medium">
                {removingMemberName}
              </span>{" "}
              from the team. They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/10 text-gray-300 hover:bg-white/5"
              disabled={removeMember.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => removeMember.mutate({ userId: removingMemberId! })}
              disabled={removeMember.isPending || !removingMemberId}
            >
              {removeMember.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Member"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
