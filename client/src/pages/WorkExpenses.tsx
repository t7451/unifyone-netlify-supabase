import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { TRPCClientError } from "@trpc/client";
import { Download, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const categories = [
  "fuel",
  "maintenance",
  "insurance",
  "tolls",
  "parking",
  "supplies",
  "software",
  "fees",
  "other",
] as const;
type Category = (typeof categories)[number];
type Period = "week" | "month" | "year" | "all";
type Payload = {
  clientReference: string;
  expenseDate: string;
  amountCents: number;
  category: Category;
  merchant?: string;
  notes?: string;
};
const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const dollars = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function validDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
// Escape quotes and spreadsheet formulas, including formulas after whitespace.
const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  // Spreadsheet readers can strip leading control characters before evaluating.
  // eslint-disable-next-line no-control-regex
  const dangerousPrefix = /^[\s\u0000-\u001f]*[=+@-]|^[\u0000-\u001f]/;
  const safe = dangerousPrefix.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

export default function WorkExpenses() {
  const [period, setPeriod] = useState<Period>("month");
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    expenseDate: today(),
    amount: "",
    category: "fuel" as Category,
    merchant: "",
    notes: "",
  });
  const [validation, setValidation] = useState("");
  const [saveError, setSaveError] = useState("");
  const [retryLocked, setRetryLocked] = useState(false);
  const submitted = useRef<Payload | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const utils = trpc.useUtils();
  const list = trpc.workExpenses.list.useQuery(
    { period, offset, limit: 25, asOfDate: today() },
    { retry: false }
  );
  const create = trpc.workExpenses.create.useMutation();
  const remove = trpc.workExpenses.remove.useMutation();
  const data = list.data;
  useEffect(() => {
    // Another tab may remove the last row of this page while it is open.
    if (data && offset > 0 && offset >= data.totalEntries)
      setOffset(Math.max(0, Math.floor((data.totalEntries - 1) / 25) * 25));
  }, [data, offset]);
  const refresh = () =>
    Promise.allSettled([
      utils.workExpenses.list.invalidate(),
      utils.workInsights.summary.invalidate(),
    ]);
  async function save() {
    if (create.isPending) return;
    if (!retryLocked) {
      if (!validDate(form.expenseDate) || form.expenseDate > today()) {
        setValidation("Choose a real local date on or before today.");
        document.getElementById("expense-date")?.focus();
        return;
      }
      if (
        !/^\d+(\.\d{1,2})?$/.test(form.amount.trim()) ||
        Number(form.amount) <= 0 ||
        Number(form.amount) > 999999.99
      ) {
        setValidation(
          "Enter an amount from $0.01 to $999,999.99 with at most two decimal places."
        );
        document.getElementById("expense-amount")?.focus();
        return;
      }
      if (form.merchant.trim().length > 100 || form.notes.length > 1000) {
        setValidation(
          "Keep the merchant to 100 characters and notes to 1,000 characters."
        );
        return;
      }
    }
    const payload = submitted.current ?? {
      clientReference: crypto.randomUUID(),
      expenseDate: form.expenseDate,
      amountCents: Math.round(Number(form.amount) * 100),
      category: form.category,
      ...(form.merchant.trim() ? { merchant: form.merchant.trim() } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    };
    submitted.current = payload;
    setValidation("");
    setSaveError("");
    try {
      await create.mutateAsync(payload);
      submitted.current = null;
      setRetryLocked(false);
      setOpen(false);
      setForm({
        expenseDate: today(),
        amount: "",
        category: "fuel",
        merchant: "",
        notes: "",
      });
      setOffset(0);
      toast.success("Expense recorded.");
      await refresh();
    } catch (error) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "BAD_REQUEST"
      ) {
        submitted.current = null;
        setRetryLocked(false);
        setSaveError(error.message);
      } else {
        setRetryLocked(true);
        setSaveError(
          "We could not confirm this save. Retry this exact expense using the same reference so it cannot be added twice. Check your records before adding a different entry."
        );
      }
    }
  }
  async function deleteEntry() {
    if (deleting === null || remove.isPending) return;
    setDeleteError("");
    try {
      await remove.mutateAsync({ expenseId: deleting });
      setDeleting(null);
      setOffset(0);
      toast.success("Expense removed.");
      await refresh();
    } catch {
      setDeleteError(
        "We could not confirm this deletion. Your records may have changed. Retry to confirm removal."
      );
    }
  }
  function exportVisible() {
    if (!data?.entries.length || list.isFetching || list.isError) return;
    const rows = [
      ["Date", "Category", "Amount USD", "Merchant", "Notes"],
      ...data.entries.map(entry => [
        entry.expenseDate,
        label(entry.category),
        (entry.amountCents / 100).toFixed(2),
        entry.merchant,
        entry.notes,
      ]),
    ];
    const blob = new Blob(
      ["\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" }
    );
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `work-expenses-${period}-rows-${offset + 1}-${offset + data.entries.length}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  return (
    <DashboardPageShell
      eyebrow="Your work costs"
      title="Work expenses"
      description="Record what you actually spent on driving, deliveries and client work. Keep your costs together before reviewing what you take home."
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/money-manager">Earnings</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/work-insights">Work insights</Link>
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label htmlFor="expense-period">Review period</Label>
          <select
            id="expense-period"
            className="mt-1 block min-h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={period}
            onChange={event => {
              setPeriod(event.target.value as Period);
              setOffset(0);
            }}
          >
            <option value="week">Last 7 days</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
            <option value="all">All recorded expenses</option>
          </select>
        </div>
        <Button className="min-h-11 gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add expense
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Periods follow your local calendar dates. Record each cost once; avoid
        costs already deducted from the earnings you enter. This log records
        spending and does not determine whether an expense is tax deductible.
      </p>
      {list.isError ? (
        <Card className="border-destructive/30">
          <CardContent className="space-y-3 pt-6">
            <p role="alert">
              Your expenses could not be loaded. Totals are unavailable.
            </p>
            <Button variant="outline" onClick={() => void list.refetch()}>
              Retry expenses
            </Button>
          </CardContent>
        </Card>
      ) : list.isPending ? (
        <p
          role="status"
          className="rounded-xl border bg-card p-6 text-sm text-muted-foreground"
        >
          Loading expenses…
        </p>
      ) : data ? (
        <>
          <div
            aria-busy={list.isFetching}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Recorded costs this period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">
                  {dollars(data.totalAmountCents)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {data.totalEntries}{" "}
                  {data.totalEntries === 1 ? "expense" : "expenses"} ·{" "}
                  {data.range.startDate ?? "First record"} to{" "}
                  {data.range.endDate}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  By category · full period
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.totalsByCategory.length ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {data.totalsByCategory.map(item => (
                      <div
                        key={item.category}
                        className="flex flex-wrap justify-between gap-2"
                      >
                        <dt>{label(item.category)}</dt>
                        <dd className="font-medium">
                          {dollars(item.amountCents)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Categories appear after you record an expense.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle>Expense history</CardTitle>
              <Button
                variant="outline"
                className="min-h-11 gap-2"
                onClick={exportVisible}
                disabled={!data.entries.length || list.isFetching}
              >
                <Download className="h-4 w-4" />
                Export visible rows
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {list.isFetching && (
                <p role="status" className="text-sm">
                  Refreshing expenses…
                </p>
              )}
              {!data.totalEntries ? (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <Receipt className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
                  <p className="font-medium">
                    No expenses recorded for this period
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add fuel, tolls, supplies or a software subscription.
                    Linking a bank account does not automatically create entries
                    in this log.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Showing {data.entries.length ? offset + 1 : 0}–
                    {offset + data.entries.length} of {data.totalEntries}. CSV
                    exports include only these visible rows; period totals above
                    include every matching entry.
                  </p>
                  <ul className="divide-y">
                    {data.entries.map(entry => (
                      <li
                        key={entry.id}
                        className="flex items-start justify-between gap-3 py-4"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="break-words font-medium">
                            {entry.merchant || label(entry.category)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {entry.expenseDate} · {label(entry.category)}
                          </p>
                          {entry.notes && (
                            <p className="break-words whitespace-pre-wrap text-sm text-muted-foreground">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold">
                            {dollars(entry.amountCents)}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-1 min-h-11 gap-1"
                            aria-label={`Delete ${entry.merchant || label(entry.category)} expense on ${entry.expenseDate}`}
                            onClick={() => {
                              setDeleting(entry.id);
                              setDeleteError("");
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between gap-3">
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={offset === 0 || list.isFetching}
                      onClick={() =>
                        setOffset(value => Math.max(0, value - 25))
                      }
                    >
                      Previous expenses
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={
                        offset + data.entries.length >= data.totalEntries ||
                        list.isFetching
                      }
                      onClick={() => setOffset(value => value + 25)}
                    >
                      Next expenses
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Work insights can use all recorded expenses, or combine a per-mile
        vehicle estimate with your recorded nonvehicle costs. In estimate mode,
        saved fuel, maintenance and insurance are excluded to avoid counting
        vehicle costs twice. These are planning views, not tax calculations.
      </p>
      <Dialog
        open={open}
        onOpenChange={value => {
          if (!create.isPending) setOpen(value);
        }}
      >
        <DialogContent
          className="max-h-[90dvh] gap-5 overflow-y-auto sm:max-w-lg"
          showCloseButton={!create.isPending}
        >
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Add work expense</DialogTitle>
            <DialogDescription>
              Enter the business portion you paid in USD. Keep receipts
              separately; this form does not upload them.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="space-y-4"
            onSubmit={event => {
              event.preventDefault();
              void save();
            }}
          >
            <fieldset
              disabled={create.isPending || retryLocked}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="expense-date">Date paid (local)</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    className="mt-1 min-h-11 min-w-0"
                    max={today()}
                    value={form.expenseDate}
                    onChange={event =>
                      setForm({ ...form, expenseDate: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="expense-amount">Amount ($)</Label>
                  <Input
                    id="expense-amount"
                    type="text"
                    inputMode="decimal"
                    className="mt-1 min-h-11"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={event =>
                      setForm({ ...form, amount: event.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="expense-category">Category</Label>
                <select
                  id="expense-category"
                  className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.category}
                  onChange={event =>
                    setForm({
                      ...form,
                      category: event.target.value as Category,
                    })
                  }
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {label(category)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="expense-merchant">
                  Merchant or service (optional)
                </Label>
                <Input
                  id="expense-merchant"
                  className="mt-1 min-h-11"
                  maxLength={100}
                  value={form.merchant}
                  onChange={event =>
                    setForm({ ...form, merchant: event.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="expense-notes">Notes (optional)</Label>
                <Textarea
                  id="expense-notes"
                  className="mt-1"
                  rows={3}
                  maxLength={1000}
                  value={form.notes}
                  onChange={event =>
                    setForm({ ...form, notes: event.target.value })
                  }
                />
              </div>
            </fieldset>
            {validation && (
              <p role="alert" className="text-sm text-destructive">
                {validation}
              </p>
            )}
            {saveError && (
              <p role="alert" className="rounded-lg border p-3 text-sm">
                {saveError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Unsaved details stay only in this page’s memory. Closing keeps
              this draft until you leave or reload the page.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                className="min-h-11 flex-1"
                type="submit"
                disabled={create.isPending}
              >
                {create.isPending
                  ? "Saving…"
                  : retryLocked
                    ? "Retry same expense"
                    : "Save expense"}
              </Button>
              <Button
                className="min-h-11"
                variant="outline"
                type="button"
                disabled={create.isPending}
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleting !== null}
        onOpenChange={value => {
          if (!value && !remove.isPending) setDeleting(null);
        }}
      >
        <DialogContent showCloseButton={!remove.isPending}>
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Delete recorded expense?</DialogTitle>
            <DialogDescription>
              This removes the entry from your expense history and period
              totals. Keep the record if you still need it.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              className="min-h-11"
              disabled={remove.isPending}
              onClick={() => void deleteEntry()}
            >
              {remove.isPending ? "Deleting…" : "Delete expense"}
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
            >
              Keep expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardPageShell>
  );
}
