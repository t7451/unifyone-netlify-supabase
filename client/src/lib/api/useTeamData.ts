import { trpc } from "@/lib/trpc";

/**
 * Data-access hooks for the Team page. Thin, typed wrappers around the exact
 * `trpc.team.*` calls the page made inline — same procedures, inputs, query
 * keys, and invalidations. Side-effect callbacks (toasts, link/dialog state)
 * stay in the page and are forwarded through, so closures over component state
 * are preserved.
 */

export function useTeamMembersQuery() {
  return trpc.team.listMembers.useQuery();
}

export function useTeamInvitesQuery() {
  return trpc.team.listInvites.useQuery();
}

export function useInviteMemberMutation(options: {
  onSuccess: (data: { token: string }) => void;
  onError: (error: { message: string }) => void;
}) {
  const utils = trpc.useUtils();
  return trpc.team.invite.useMutation({
    onSuccess: data => {
      utils.team.listInvites.invalidate();
      options.onSuccess(data);
    },
    onError: error => options.onError(error),
  });
}

export function useRevokeInviteMutation(options: {
  onSuccess: () => void;
  onError: (error: { message: string }) => void;
}) {
  const utils = trpc.useUtils();
  return trpc.team.revokeInvite.useMutation({
    onSuccess: () => {
      utils.team.listInvites.invalidate();
      options.onSuccess();
    },
    onError: error => options.onError(error),
  });
}

export function useUpdateMemberRoleMutation(options: {
  onSuccess: (variables: { role: string }) => void;
  onError: (error: { message: string }) => void;
}) {
  const utils = trpc.useUtils();
  return trpc.team.updateMemberRole.useMutation({
    onSuccess: (_data, variables) => {
      utils.team.listMembers.invalidate();
      options.onSuccess(variables);
    },
    onError: error => options.onError(error),
  });
}

export function useRemoveMemberMutation(options: {
  onSuccess: () => void;
  onError: (error: { message: string }) => void;
}) {
  const utils = trpc.useUtils();
  return trpc.team.removeMember.useMutation({
    onSuccess: () => {
      utils.team.listMembers.invalidate();
      options.onSuccess();
    },
    onError: error => options.onError(error),
  });
}
