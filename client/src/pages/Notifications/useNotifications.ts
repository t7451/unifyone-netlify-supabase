import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { TRIGGER_EVENTS } from "./Notifications.constants";
import { getDateGroup } from "./Notifications.utils";
import type {
  DateGroup,
  NotificationType,
  TriggerConfigState,
} from "./Notifications.types";

// ── NotificationList data + mutations ─────────────────────────────────────────
export function useNotificationList() {
  const utils = trpc.useUtils();
  const { data: notifs = [], isLoading } = trpc.notifications.list.useQuery({
    limit: 50,
  });
  const { data: unread } = trpc.notifications.unreadCount.useQuery();

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  const deleteNotif = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  // Group notifications by date
  const grouped = notifs.reduce<Record<DateGroup, typeof notifs>>(
    (acc, n) => {
      const group = getDateGroup(n.createdAt);
      acc[group].push(n);
      return acc;
    },
    { Today: [], Yesterday: [], "This Week": [], Older: [] }
  );

  return {
    notifs,
    isLoading,
    unread,
    markRead,
    markAllRead,
    deleteNotif,
    grouped,
  };
}

// ── AdminBroadcast state + mutations ──────────────────────────────────────────
export function useAdminBroadcast() {
  const { user } = useAuth();
  const [form, setForm] = useState<{
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link: string;
  }>({
    userId: "",
    type: "info",
    title: "",
    body: "",
    link: "",
  });
  const [broadcastForm, setBroadcastForm] = useState<{
    type: NotificationType;
    title: string;
    body: string;
  }>({
    type: "info",
    title: "",
    body: "",
  });

  const sendToUser = trpc.notifications.sendToUser.useMutation({
    onSuccess: () => {
      toast.success("Notification sent to user.");
      setForm({ userId: "", type: "info", title: "", body: "", link: "" });
    },
    onError: e => toast.error(e.message),
  });

  const broadcast = trpc.notifications.broadcastToTenant.useMutation({
    onSuccess: data => {
      toast.success(`Broadcast sent to ${data.sent} user(s).`);
      setBroadcastForm({ type: "info", title: "", body: "" });
    },
    onError: e => toast.error(e.message),
  });

  const tenantId = user?.tenantId;

  return {
    form,
    setForm,
    broadcastForm,
    setBroadcastForm,
    sendToUser,
    broadcast,
    tenantId,
  };
}

// ── TriggerConfig data + state + mutations ────────────────────────────────────
export function useTriggerConfig() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const utils = trpc.useUtils();

  const { data: triggers = [], isLoading } =
    trpc.notifications.listTriggers.useQuery(
      { tenantId: tenantId! },
      { enabled: !!tenantId }
    );

  const upsert = trpc.notifications.upsertTrigger.useMutation({
    onSuccess: () => {
      toast.success("Trigger configuration saved.");
      utils.notifications.listTriggers.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const deleteTrigger = trpc.notifications.deleteTrigger.useMutation({
    onSuccess: () => utils.notifications.listTriggers.invalidate(),
  });

  // Local state for each event's config
  const [configs, setConfigs] = useState<Record<string, TriggerConfigState>>(
    () => {
      const defaults: Record<string, TriggerConfigState> = {};
      TRIGGER_EVENTS.forEach(e => {
        defaults[e.event] = {
          inAppEnabled: true,
          n8nEnabled: false,
          n8nWebhookUrl: "",
          zapierEnabled: false,
          mailchimpEnabled: false,
          slackEnabled: false,
          slackWebhookUrl: "",
          emailEnabled: false,
          emailRecipients: "",
        };
      });
      return defaults;
    }
  );

  // Sync from DB when triggers load
  const [synced, setSynced] = useState(false);
  if (!synced && triggers.length > 0) {
    const updated = { ...configs };
    triggers.forEach(t => {
      updated[t.event] = {
        inAppEnabled: t.inAppEnabled ?? true,
        n8nEnabled: t.n8nEnabled,
        n8nWebhookUrl: t.n8nWebhookUrl ?? "",
        zapierEnabled: t.zapierEnabled,
        mailchimpEnabled: t.mailchimpEnabled,
        slackEnabled: t.slackEnabled,
        slackWebhookUrl: t.slackWebhookUrl ?? "",
        emailEnabled: t.emailEnabled,
        emailRecipients: t.emailRecipients ?? "",
      };
    });
    setConfigs(updated);
    setSynced(true);
  }

  const handleSave = (event: string) => {
    if (!tenantId) {
      toast.error("No active tenant.");
      return;
    }
    upsert.mutate({ tenantId, event, ...configs[event] });
  };

  return {
    tenantId,
    triggers,
    isLoading,
    upsert,
    deleteTrigger,
    configs,
    setConfigs,
    handleSave,
  };
}
