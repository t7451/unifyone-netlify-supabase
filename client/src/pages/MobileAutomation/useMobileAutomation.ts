import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { PushSchedule } from "./MobileAutomation.types";

export function useSchedulerTab() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    webhookUrl: "",
    cronExpression: "0 9 * * *",
  });

  const { data: schedules = [], isLoading } =
    trpc.mobileAutomation.listSchedules.useQuery();

  const create = trpc.mobileAutomation.createSchedule.useMutation({
    onSuccess: () => {
      utils.mobileAutomation.listSchedules.invalidate();
      setOpen(false);
      setForm({
        name: "",
        description: "",
        webhookUrl: "",
        cronExpression: "0 9 * * *",
      });
      toast.success("Schedule created");
    },
    onError: e => toast.error(e.message),
  });

  const update = trpc.mobileAutomation.updateSchedule.useMutation({
    onSuccess: () => {
      utils.mobileAutomation.listSchedules.invalidate();
      toast.success("Schedule updated");
    },
  });

  const del = trpc.mobileAutomation.deleteSchedule.useMutation({
    onSuccess: () => {
      utils.mobileAutomation.listSchedules.invalidate();
      toast.success("Schedule deleted");
    },
  });

  const trigger = trpc.mobileAutomation.triggerSchedule.useMutation({
    onSuccess: data => {
      utils.mobileAutomation.listSchedules.invalidate();
      if (data.success) {
        toast.success("Workflow triggered successfully");
      } else {
        toast.error(data.error ?? "Trigger failed");
      }
    },
  });

  return {
    open,
    setOpen,
    form,
    setForm,
    schedules,
    isLoading,
    create,
    update,
    del,
    trigger,
  };
}

export function useAttributionTab() {
  const { data: stats } = trpc.mobileAutomation.getAttributionStats.useQuery({
    days: 30,
  });
  const { data: list } = trpc.mobileAutomation.listAttributions.useQuery({
    limit: 20,
    offset: 0,
  });

  return { stats, list };
}

export function useCapiLogTab() {
  const { data: summary } = trpc.mobileAutomation.getCapiSummary.useQuery();
  const { data: log } = trpc.mobileAutomation.listCapiEvents.useQuery({
    limit: 25,
    offset: 0,
  });

  return { summary, log };
}

export function usePushScheduleTab() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    targetAudience: "all" as const,
    scheduledAt: "",
    cronExpression: "",
    recurring: false,
    deepLinkPath: "",
  });

  const { data: schedules = [], isLoading } =
    trpc.mobileAutomation.listPushSchedules.useQuery();

  const create = trpc.mobileAutomation.createPushSchedule.useMutation({
    onSuccess: () => {
      utils.mobileAutomation.listPushSchedules.invalidate();
      setOpen(false);
      setForm({
        title: "",
        body: "",
        targetAudience: "all",
        scheduledAt: "",
        cronExpression: "",
        recurring: false,
        deepLinkPath: "",
      });
      toast.success("Push notification scheduled");
    },
    onError: e => toast.error(e.message),
  });

  const update = trpc.mobileAutomation.updatePushSchedule.useMutation({
    onSuccess: () => {
      utils.mobileAutomation.listPushSchedules.invalidate();
      toast.success("Push schedule updated");
    },
  });

  const del = trpc.mobileAutomation.deletePushSchedule.useMutation({
    onSuccess: () => {
      utils.mobileAutomation.listPushSchedules.invalidate();
      toast.success("Push schedule deleted");
    },
  });

  const sendNow = trpc.mobileAutomation.sendPushNow.useMutation({
    onSuccess: data => {
      utils.mobileAutomation.listPushSchedules.invalidate();
      toast.success(`Push sent! Total sends: ${data.sentCount}`);
    },
    onError: e => toast.error(e.message),
  });

  const pushSummary = useMemo(() => {
    const typed = schedules as PushSchedule[];
    return typed.reduce(
      (acc, s) => ({
        total: acc.total + 1,
        totalSends: acc.totalSends + (s.sentCount ?? 0),
        active:
          acc.active +
          (s.enabled && (s.status === "scheduled" || s.status === "recurring")
            ? 1
            : 0),
      }),
      { total: 0, totalSends: 0, active: 0 }
    );
  }, [schedules]);

  return {
    open,
    setOpen,
    form,
    setForm,
    schedules,
    isLoading,
    create,
    update,
    del,
    sendNow,
    pushSummary,
  };
}
