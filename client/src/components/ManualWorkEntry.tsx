import { useEffect, useRef, useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { Plus, Clock, CheckCircle2, Pencil, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Form = {
  platform: string;
  startedAt: string;
  endedAt: string;
  grossEarnings: string;
  tips: string;
  bonuses: string;
  totalMiles: string;
  mileageDate: string;
  notes: string;
};
type Payload = {
  clientReference: string;
  platform: string;
  startedAt: string;
  endedAt: string;
  grossEarnings: number;
  tips: number;
  bonuses: number;
  totalMiles: number;
  mileageDate?: string;
  notes?: string;
};
type EditPayload = Omit<Payload, "clientReference"> & {
  recordId: number;
  expectedUpdatedAt: string;
};
type SavedRecord = {
  id: number;
  clientReference: string;
  platform: string;
  startedAt: string;
  endedAt: string;
  grossEarnings: string;
  tips: string;
  bonuses: string;
  totalMiles: string;
  mileageDate: string | null;
  notes: string | null;
  updatedAt: string;
};
type Snapshot = SavedRecord & {
  displayStartedAt: string;
  displayEndedAt: string;
};
function localDisplay(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function completeSavedRecord(
  value: unknown,
  expectedId: number
): SavedRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    record.id !== expectedId ||
    typeof record.clientReference !== "string" ||
    typeof record.platform !== "string" ||
    !record.platform.trim() ||
    !["startedAt", "endedAt", "updatedAt"].every(
      key =>
        typeof record[key] === "string" &&
        Number.isFinite(Date.parse(record[key] as string))
    ) ||
    !["grossEarnings", "tips", "bonuses", "totalMiles"].every(
      key =>
        typeof record[key] === "string" &&
        amountValid(
          record[key] as string,
          key === "totalMiles" ? 999_999.99 : 99_999_999.99
        )
    ) ||
    !(record.mileageDate === null || typeof record.mileageDate === "string") ||
    !(record.notes === null || typeof record.notes === "string")
  )
    return null;
  return record as unknown as SavedRecord;
}
const emptyForm = (): Form => ({
  platform: "",
  startedAt: "",
  endedAt: "",
  grossEarnings: "",
  tips: "0",
  bonuses: "0",
  totalMiles: "0",
  mileageDate: "",
  notes: "",
});
const amountValid = (value: string, maximum: number) =>
  value.trim() !== "" &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0 &&
  Number(value) <= maximum &&
  Number(value) === Number(Number(value).toFixed(2));
function localDate(value: string) {
  const date = new Date(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime())
  )
    return null;
  // Reject a nonexistent local time rather than silently normalizing it across DST.
  const pad = (number: number) => String(number).padStart(2, "0");
  const roundTrip = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return roundTrip === value ? date : null;
}

export default function ManualWorkEntry({
  initialOpen = false,
  onSaved,
  editRecordId,
  editLabel,
  triggerDisabled = false,
}: {
  initialOpen?: boolean;
  onSaved?: () => void;
  editRecordId?: number;
  editLabel?: string;
  triggerDisabled?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [form, setForm] = useState<Form>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saveError, setSaveError] = useState("");
  const [retryLocked, setRetryLocked] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [detailError, setDetailError] = useState("");
  const original = useRef<Snapshot | null>(null);
  const submitted = useRef<Payload | EditPayload | null>(null);
  const isEditing = editRecordId !== undefined;
  const utils = trpc.useUtils();
  const create = trpc.workRecords.create.useMutation();
  const edit = trpc.workRecords.update.useMutation();
  const detail = trpc.workRecords.get.useQuery(
    { recordId: editRecordId ?? 0 },
    {
      enabled: open && isEditing,
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
    }
  );
  const pending = create.isPending || edit.isPending;
  function hydrate(value: unknown) {
    const record = completeSavedRecord(value, editRecordId!);
    if (!record) {
      setDetailError(
        "The saved details could not be loaded completely. Retry before editing this entry."
      );
      return;
    }
    const displayStartedAt = localDisplay(record.startedAt);
    const displayEndedAt = localDisplay(record.endedAt);
    original.current = { ...record, displayStartedAt, displayEndedAt };
    setForm({
      platform: record.platform,
      startedAt: displayStartedAt,
      endedAt: displayEndedAt,
      grossEarnings: record.grossEarnings,
      tips: record.tips,
      bonuses: record.bonuses,
      totalMiles: record.totalMiles,
      mileageDate: record.mileageDate ?? "",
      notes: record.notes ?? "",
    });
    submitted.current = null;
    setLoaded(true);
    setDetailError("");
    setSaveError("");
    setRetryLocked(false);
    setConflict(false);
    setConfirmReload(false);
    setErrors({});
  }
  useEffect(() => {
    if (
      !open ||
      !isEditing ||
      loaded ||
      detail.isFetching ||
      detail.isError ||
      !detail.data
    )
      return;
    hydrate(detail.data);
    // A refresh must never replace an open draft. Explicit reload below is the
    // only way to adopt a newer version after the first complete hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEditing, loaded, detail.data, detail.isFetching, detail.isError]);
  function changeOpen(value: boolean) {
    if (pending) return;
    setOpen(value);
    if (!value && isEditing && !retryLocked && !conflict) {
      setLoaded(false);
      original.current = null;
      submitted.current = null;
      setForm(emptyForm());
      setErrors({});
      setSaveError("");
      setDetailError("");
      setConfirmReload(false);
    }
  }
  async function reloadSaved() {
    const result = await detail.refetch();
    if (result.error || !result.data) {
      setDetailError(
        "The latest saved entry could not be loaded. Your unsaved details are still here. Try again."
      );
      return;
    }
    hydrate(result.data);
  }
  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const amounts = [form.grossEarnings, form.tips, form.bonuses];
  const total = amounts.every(value => amountValid(value, 99_999_999.99))
    ? amounts.reduce((sum, value) => sum + Number(value), 0)
    : null;
  const unchangedStart =
    original.current && form.startedAt === original.current.displayStartedAt;
  const unchangedEnd =
    original.current && form.endedAt === original.current.displayEndedAt;
  const started =
    isEditing && unchangedStart
      ? new Date(original.current!.startedAt)
      : localDate(form.startedAt);
  const ended =
    isEditing && unchangedEnd
      ? new Date(original.current!.endedAt)
      : localDate(form.endedAt);
  const minutes =
    started && ended && ended > started
      ? (ended.getTime() - started.getTime()) / 60_000
      : null;
  const disabled = pending || retryLocked || (isEditing && !loaded);
  const mileageDate =
    form.mileageDate || (!isEditing ? form.startedAt.slice(0, 10) : "");
  const preservedMileageDate =
    isEditing &&
    original.current &&
    mileageDate === original.current.mileageDate &&
    unchangedStart &&
    unchangedEnd;

  function update(field: keyof Form, value: string) {
    setForm(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
    if (!conflict) setSaveError("");
  }
  function validate() {
    const next: Partial<Record<keyof Form, string>> = {};
    if (!form.platform.trim() || form.platform.trim().length > 100)
      next.platform = "Name the app, client or project (up to 100 characters).";
    if (!started) next.startedAt = "Choose a valid local start date and time.";
    if (!ended) next.endedAt = "Choose a valid local finish date and time.";
    if (ended && ended.getTime() > Date.now())
      next.endedAt = "Finished work cannot end in the future.";
    if (started && ended && ended <= started)
      next.endedAt = "Finish time must be after start time.";
    if (minutes !== null && minutes < 1)
      next.endedAt = "Enter at least one minute of work.";
    if (minutes !== null && minutes > 24 * 60)
      next.endedAt =
        "Record up to 24 hours at a time. Split longer work into separate sessions.";
    for (const field of ["grossEarnings", "tips", "bonuses"] as const)
      if (!amountValid(form[field], 99_999_999.99))
        next[field] =
          "Enter $0–$99,999,999.99, using at most two decimal places.";
    if (!amountValid(form.totalMiles, 999_999.99))
      next.totalMiles =
        "Enter 0–999,999.99 business miles, using at most two decimal places.";
    if (Number(form.totalMiles) > 0) {
      const calendar = new Date(`${mileageDate}T00:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(mileageDate) ||
        !Number.isFinite(calendar.getTime()) ||
        calendar.toISOString().slice(0, 10) !== mileageDate
      )
        next.mileageDate =
          "Choose the local calendar date you drove these miles.";
      else if (
        !preservedMileageDate &&
        (mileageDate < form.startedAt.slice(0, 10) ||
          mileageDate > form.endedAt.slice(0, 10))
      )
        next.mileageDate =
          "Choose a date within this work session. Split mileage driven on different dates into separate entries.";
    }
    if (form.notes.length > 1000)
      next.notes = "Keep notes to 1,000 characters or fewer.";
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) document.getElementById(`manual-work-${first}`)?.focus();
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (pending || conflict || (isEditing && !loaded)) return;
    if (!retryLocked && !validate()) return;
    const fields = {
      platform: form.platform.trim(),
      startedAt: started!.toISOString(),
      endedAt: ended!.toISOString(),
      grossEarnings: Number(form.grossEarnings),
      tips: Number(form.tips),
      bonuses: Number(form.bonuses),
      totalMiles: Number(form.totalMiles),
      ...(Number(form.totalMiles) > 0 ? { mileageDate } : {}),
      ...(isEditing
        ? { notes: form.notes }
        : form.notes.trim()
          ? { notes: form.notes.trim() }
          : {}),
    };
    const payload =
      submitted.current ??
      (isEditing
        ? {
            ...fields,
            recordId: editRecordId!,
            expectedUpdatedAt: original.current!.updatedAt,
          }
        : { ...fields, clientReference: crypto.randomUUID() });
    submitted.current = payload;
    setSaveError("");
    try {
      if (isEditing) await edit.mutateAsync(payload as EditPayload);
      else await create.mutateAsync(payload as Payload);
      submitted.current = null;
      original.current = null;
      setRetryLocked(false);
      setLoaded(false);
      setConflict(false);
      setForm(emptyForm());
      setErrors({});
      setOpen(false);
      onSaved?.();
      toast.success(
        isEditing
          ? "Completed work updated. Your active timer is unchanged."
          : "Completed work added. Your active timer is unchanged."
      );
      await Promise.allSettled([
        utils.moneyManager.listShifts.invalidate(),
        utils.moneyManager.getShiftStats.invalidate(),
        utils.moneyManager.getMileageSummary.invalidate(),
        utils.moneyManager.getYTDDeduction.invalidate(),
        utils.moneyManager.getShiftBreakdown.invalidate(),
        utils.moneyManager.getTaxEstimate.invalidate(),
        utils.workInsights.summary.invalidate(),
        utils.workRecords.get.invalidate(),
      ]);
    } catch (error) {
      const code =
        error instanceof TRPCClientError ? error.data?.code : undefined;
      if (isEditing && code === "CONFLICT") {
        submitted.current = null;
        setRetryLocked(false);
        setConflict(true);
        setSaveError(
          `${error instanceof Error ? error.message : "This entry changed elsewhere."} Your unsaved details are still here. Reload the saved version only if you want to replace your edits.`
        );
      } else if (
        ["BAD_REQUEST", "NOT_FOUND", "FORBIDDEN", "UNAUTHORIZED"].includes(
          code ?? ""
        )
      ) {
        submitted.current = null;
        setRetryLocked(false);
        setSaveError(
          error instanceof Error
            ? error.message
            : "Check these details and try again."
        );
      } else {
        // A committed update can lose its response. Keep its original version
        // and exact payload for an idempotent retry, without allowing edits.
        setRetryLocked(true);
        setSaveError(
          isEditing
            ? "We could not confirm this update. Your details are preserved. Retry the exact same update before editing again; it may already have saved."
            : "We could not confirm this save. Your details are preserved. Retry this exact entry so it cannot be added twice; check your history before starting a different entry."
        );
      }
    }
  }

  const errorFor = (field: keyof Form) =>
    errors[field] ? (
      <p
        id={`manual-work-${field}-error`}
        className="mt-1 text-xs text-destructive"
      >
        {errors[field]}
      </p>
    ) : null;
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          className={
            isEditing
              ? "mt-1 min-h-10 gap-1 text-muted-foreground"
              : "min-h-11 gap-2"
          }
          variant={isEditing ? "ghost" : "default"}
          size={isEditing ? "sm" : "default"}
          aria-label={
            isEditing ? (editLabel ?? "Edit completed work") : undefined
          }
          disabled={triggerDisabled}
        >
          {isEditing ? (
            <Pencil className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isEditing ? "Edit entry" : "Add completed work"}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
        showCloseButton={!pending}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit completed work" : "Add completed work"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this manually added session. The saved entry and its linked mileage are updated together; your active timer stays unchanged."
              : "Already finished a delivery shift, rideshare session or client project? Record the work here without starting a timer."}
          </DialogDescription>
        </DialogHeader>
        {isEditing && !loaded ? (
          <div className="space-y-4 py-4">
            {detail.isLoading || detail.isFetching ? (
              <p role="status" className="flex items-center gap-2 text-sm">
                <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                Loading the saved entry…
              </p>
            ) : (
              <>
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/30 p-3 text-sm"
                >
                  {detailError ||
                    detail.error?.message ||
                    "We could not load the full saved entry. Nothing has been changed."}
                </p>
                <Button variant="outline" onClick={() => void reloadSaved()}>
                  Retry loading entry
                </Button>
              </>
            )}
          </div>
        ) : (
          <form
            className="space-y-5"
            onSubmit={event => {
              event.preventDefault();
              void save();
            }}
            noValidate
          >
            <fieldset disabled={disabled} className="space-y-4">
              <div>
                <Label htmlFor="manual-work-platform">
                  App, client or project
                </Label>
                <Input
                  id="manual-work-platform"
                  className="mt-1 min-h-11"
                  value={form.platform}
                  maxLength={100}
                  placeholder="e.g. DoorDash, Uber, Acme design project"
                  onChange={event => update("platform", event.target.value)}
                  aria-invalid={!!errors.platform}
                  aria-describedby={
                    errors.platform ? "manual-work-platform-error" : undefined
                  }
                />
                {errorFor("platform")}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["startedAt", "Started (local time)"],
                    ["endedAt", "Finished (local time)"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <Label htmlFor={`manual-work-${field}`}>{label}</Label>
                    <Input
                      id={`manual-work-${field}`}
                      type="datetime-local"
                      className="mt-1 min-h-11 min-w-0"
                      value={form[field]}
                      onChange={event => update(field, event.target.value)}
                      aria-invalid={!!errors[field]}
                      aria-describedby={
                        errors[field]
                          ? `manual-work-${field}-error`
                          : "manual-time-help"
                      }
                    />
                    {errorFor(field)}
                  </div>
                ))}
              </div>
              <p
                id="manual-time-help"
                className="text-xs text-muted-foreground"
              >
                Times use your browser’s timezone ({timezone}). Include waiting
                and admin time. Record 1 minute to 24 hours per entry. For
                longer projects, add a separate entry for each day.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    ["grossEarnings", "Base pay ($)"],
                    ["tips", "Tips ($)"],
                    ["bonuses", "Bonuses ($)"],
                    ["totalMiles", "Business miles"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <Label htmlFor={`manual-work-${field}`}>{label}</Label>
                    <Input
                      id={`manual-work-${field}`}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      className="mt-1 min-h-11"
                      value={form[field]}
                      onChange={event => update(field, event.target.value)}
                      aria-invalid={!!errors[field]}
                      aria-describedby={
                        errors[field]
                          ? `manual-work-${field}-error`
                          : "manual-earnings-help"
                      }
                    />
                    {errorFor(field)}
                  </div>
                ))}
              </div>
              {Number(form.totalMiles) > 0 && (
                <div className="rounded-xl border p-3">
                  <Label htmlFor="manual-work-mileageDate">
                    Date these business miles were driven
                  </Label>
                  <Input
                    id="manual-work-mileageDate"
                    type="date"
                    className="mt-1 min-h-11"
                    value={mileageDate}
                    min={
                      !preservedMileageDate
                        ? form.startedAt.slice(0, 10) || undefined
                        : undefined
                    }
                    max={
                      !preservedMileageDate
                        ? form.endedAt.slice(0, 10) || undefined
                        : undefined
                    }
                    onChange={event =>
                      update("mileageDate", event.target.value)
                    }
                    aria-invalid={!!errors.mileageDate}
                    aria-describedby="manual-mileage-date-help"
                  />
                  {errorFor("mileageDate")}
                  <p
                    id="manual-mileage-date-help"
                    className="mt-2 text-xs text-muted-foreground"
                  >
                    Confirm all entered miles were driven on this local date. If
                    you drove across dates or a mileage-rate change, split the
                    work into dated entries. This date selects the mileage rate;
                    your start and finish times stay unchanged.{" "}
                    {isEditing &&
                      "Your saved mileage date is preserved unless you change it. Pay-only edits keep the saved mileage rate."}
                  </p>
                </div>
              )}
              <p
                id="manual-earnings-help"
                className="text-xs text-muted-foreground"
              >
                Base pay excludes tips and bonuses. If you only have a combined
                total, put it in base pay and leave tips and bonuses at 0.
                Include only business miles; use 0 for desk work.
              </p>
              <div>
                <Label htmlFor="manual-work-notes">Notes (optional)</Label>
                <Textarea
                  id="manual-work-notes"
                  className="mt-1"
                  maxLength={1000}
                  rows={2}
                  value={form.notes}
                  onChange={event => update("notes", event.target.value)}
                  aria-invalid={!!errors.notes}
                />
                {errorFor("notes")}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3 text-sm">
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {minutes !== null && minutes <= 1440
                  ? `${(minutes / 60).toFixed(2)} hours`
                  : "Choose your work times"}
              </p>
              <p>
                Total:{" "}
                <strong>
                  {total === null
                    ? "Enter pay"
                    : total.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                </strong>
              </p>
            </div>
            {Object.keys(errors).some(key => errors[key as keyof Form]) && (
              <p role="alert" className="text-sm text-destructive">
                Check the highlighted fields before saving.
              </p>
            )}
            {saveError && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 p-3 text-sm"
              >
                {saveError}
              </p>
            )}
            {conflict && (
              <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                <p>
                  Saving is paused to protect a newer saved version. Your edits
                  have not been discarded.
                </p>
                {confirmReload ? (
                  <>
                    <p>
                      Reloading replaces the unsaved figures above with the
                      latest saved entry.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={detail.isFetching}
                        onClick={() => void reloadSaved()}
                      >
                        {detail.isFetching
                          ? "Loading…"
                          : "Reload and replace my edits"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setConfirmReload(false)}
                      >
                        Keep my edits for now
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmReload(true)}
                  >
                    Review reload options
                  </Button>
                )}
              </div>
            )}
            {detailError && loaded && (
              <p role="alert" className="text-sm text-destructive">
                {detailError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {isEditing
                ? "Editing changes this existing entry; it does not add another copy. "
                : "Do not add work already included in a CSV import or another recorded session. "}
              Saved work affects your earnings and mileage history. Unsaved
              details stay in this page only; they are not stored in your
              browser or synced elsewhere.{" "}
              {(retryLocked || conflict) &&
                "Closing keeps this draft while the page stays open. Reopen this same entry to continue."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                className="min-h-11 flex-1 gap-2"
                disabled={pending || conflict}
              >
                <CheckCircle2 className="h-4 w-4" />
                {pending
                  ? "Saving…"
                  : retryLocked
                    ? isEditing
                      ? "Retry same update"
                      : "Retry same entry"
                    : isEditing
                      ? "Save changes"
                      : "Save completed work"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={pending}
                onClick={() => changeOpen(false)}
              >
                {isEditing && !retryLocked && !conflict
                  ? "Cancel editing"
                  : "Close"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
