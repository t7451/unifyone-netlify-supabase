import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2,
  Link2,
  RefreshCw,
  Unplug,
  Wallet,
  ArrowRight,
  FileUp,
  Clock3,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { openArgyle, openPlaid } from "@/lib/financialLink";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const SESSION_KEY = "unifyone.plaid-link";
const money = (amount: string | number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    Number(amount)
  );
const connectionStatuses: Record<string, string> = {
  ready: "Connected",
  linking: "Finish connecting",
  sync_error: "Refresh needed",
  needs_reconnect: "Reconnect needed",
  disconnecting: "Disconnecting",
  disconnect_failed: "Disconnect incomplete",
};
const kinds: Record<string, string> = {
  bank_transaction: "Bank activity",
  gig_earning: "Gig earnings",
  income_payment: "Payroll payment",
};

export default function ConnectedMoney() {
  const utils = trpc.useUtils();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState("");
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const showError = useCallback((message: string) => {
    setNotice({ kind: "error", message });
    toast.error(message);
  }, []);
  const showSuccess = useCallback((message: string) => {
    setNotice({ kind: "success", message });
    toast.success(message);
  }, []);
  const [days, setDays] = useState<30 | 90>(30);
  const [offset, setOffset] = useState(0);
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(
    null
  );
  const handle = useRef<{ destroy?(): void; close?(): void } | null>(null);
  const resumed = useRef(false);
  const availability = trpc.financialConnections.availability.useQuery();
  const connections = trpc.financialConnections.list.useQuery();
  const overview = trpc.financialConnections.overview.useQuery({
    days,
    offset,
  });
  const beginBank = trpc.financialConnections.beginBankLink.useMutation();
  const completeBank = trpc.financialConnections.completeBankLink.useMutation();
  const beginGig = trpc.financialConnections.beginGigLink.useMutation();
  const refresh = trpc.financialConnections.refresh.useMutation();
  const disconnect = trpc.financialConnections.disconnect.useMutation();
  const reload = useCallback(
    () =>
      Promise.all([
        utils.financialConnections.list.invalidate(),
        utils.financialConnections.overview.invalidate(),
      ]),
    [utils]
  );

  const launchBank = useCallback(
    async (token: string, redirectUri?: string) => {
      handle.current = await openPlaid({
        token,
        receivedRedirectUri: redirectUri,
        onSuccess: publicToken => {
          setOperation(
            "Saving your bank connection and importing available transactions…"
          );
          sessionStorage.removeItem(SESSION_KEY);
          void (async () => {
            try {
              const linked = await completeBank.mutateAsync({
                publicToken,
                readOnlyConsent: true,
              });
              await reload();
              showSuccess("Bank linked. Importing transactions…");
              await refresh.mutateAsync({ connectionId: linked.connectionId });
              showSuccess(
                "Bank activity refreshed. Initial history may take a few minutes to arrive."
              );
            } catch (error) {
              showError(
                error instanceof Error
                  ? error.message
                  : "Bank activity could not refresh."
              );
            } finally {
              setBusy(false);
              await reload();
            }
          })();
        },
        onExit: () => {
          sessionStorage.removeItem(SESSION_KEY);
          setBusy(false);
        },
      });
    },
    [completeBank, refresh, reload, showError, showSuccess]
  );

  // Resume bank OAuth using the SAME short-lived Link token. Never place it in a URL.
  useEffect(() => {
    if (
      resumed.current ||
      !new URLSearchParams(window.location.search).has("oauth_state_id")
    )
      return;
    resumed.current = true;
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(SESSION_KEY) ?? "null"
      ) as { token: string; createdAt: number } | null;
      if (
        !saved ||
        typeof saved.token !== "string" ||
        Date.now() - saved.createdAt > 30 * 60_000
      )
        throw new Error(
          "Your bank linking session expired. Please start again."
        );
      setBusy(true);
      void launchBank(saved.token, window.location.href).catch(error => {
        setBusy(false);
        showError(error.message);
      });
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Please start bank linking again."
      );
    }
  }, [launchBank, showError]);
  useEffect(
    () => () => {
      handle.current?.destroy?.();
      handle.current?.close?.();
    },
    []
  );

  async function linkBank() {
    setOperation("Opening secure bank linking…");
    setNotice(null);
    setBusy(true);
    try {
      const session = await beginBank.mutateAsync({ readOnlyConsent: true });
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ token: session.token, createdAt: Date.now() })
      );
      await launchBank(session.token);
    } catch (error) {
      setBusy(false);
      showError(
        error instanceof Error ? error.message : "Bank linking failed."
      );
    }
  }
  async function linkGig() {
    setOperation("Opening secure gig account linking…");
    setNotice(null);
    setBusy(true);
    try {
      const session = await beginGig.mutateAsync({ readOnlyConsent: true });
      let connected = false;
      handle.current = await openArgyle({
        userToken: session.token,
        sandbox: session.environment === "sandbox",
        flowId: session.flowId,
        onAccountConnected: () => {
          connected = true;
        },
        onAccountError: () =>
          showError(
            "The provider could not connect that account. Check its sign-in instructions and try again."
          ),
        onTokenExpired: update => {
          void beginGig
            .mutateAsync({ readOnlyConsent: true })
            .then(next => update(next.token))
            .catch(() =>
              showError("Link session expired. Close it and try again.")
            );
        },
        onClose: () => {
          void (async () => {
            try {
              if (connected) {
                setOperation(
                  "Importing the history available from your gig accounts…"
                );
                await refresh.mutateAsync({
                  connectionId: session.connectionId,
                });
                showSuccess(
                  "Gig connection linked. History can take time to arrive; refresh again shortly."
                );
              }
            } catch (error) {
              showError(
                error instanceof Error
                  ? error.message
                  : "Gig data could not refresh."
              );
            } finally {
              setBusy(false);
              await reload();
            }
          })();
        },
      });
    } catch (error) {
      setBusy(false);
      showError(error instanceof Error ? error.message : "Gig linking failed.");
    } finally {
      await reload();
    }
  }
  async function sync(connectionId: string) {
    setOperation("Checking your provider for available activity…");
    setNotice(null);
    setBusy(true);
    try {
      const result = await refresh.mutateAsync({ connectionId });
      showSuccess(`Refresh completed: ${result.imported} records processed.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Refresh failed.");
    } finally {
      setBusy(false);
      await reload();
    }
  }
  async function unlink(connectionId: string) {
    setOperation(
      "Revoking access and deleting this connection’s imported activity…"
    );
    setNotice(null);
    setBusy(true);
    try {
      await disconnect.mutateAsync({ connectionId });
      setConfirmDisconnect(null);
      showSuccess("Provider access revoked and imported data deleted.");
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Disconnection failed. You can retry."
      );
    } finally {
      setBusy(false);
      await reload();
    }
  }
  const sourceNames = new Map(
    (connections.data ?? []).flatMap(connection =>
      connection.accounts.map(
        account => [`${connection.id}:${account.id}`, account.name] as const
      )
    )
  );
  useEffect(() => {
    if (overview.data && offset > 0 && overview.data.total <= offset)
      setOffset(0);
  }, [overview.data, offset]);
  const anyProviderReady =
    availability.data?.plaid.configured || availability.data?.argyle.configured;
  const linkingUnavailable = availability.isSuccess && !anyProviderReady;
  const sandbox = (connections.data ?? []).some(
    connection => connection.environment === "sandbox"
  );

  return (
    <DashboardPageShell
      eyebrow="Your work and money, together"
      title="Connected money"
      description="Bring your work income and bank activity into one view. Start with your own records, then link supported accounts when connections are available."
    >
      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${notice.kind === "error" ? "border-destructive/30 bg-destructive/5" : "border-emerald-400/30 bg-emerald-500/5"}`}
        >
          {notice.kind === "error" ? (
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
              aria-hidden="true"
            />
          )}
          <p className="min-w-0 flex-1 break-words">{notice.message}</p>
          <button
            aria-label="Dismiss update"
            className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setNotice(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      {busy && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border bg-muted/30 p-4 text-sm"
        >
          <RefreshCw
            className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          {operation || "Updating your connection…"}
        </p>
      )}
      {linkingUnavailable && (
        <section
          className="rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6"
          aria-labelledby="start-today-heading"
        >
          <Badge
            variant="outline"
            className="mb-3 border-primary/30 text-primary"
          >
            Available today
          </Badge>
          <h2 id="start-today-heading" className="text-xl font-semibold">
            Start with the work you already did
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Automatic account connections are not available yet. You can still
            record work time and earnings, or review the options for importing a
            platform export. Your manually recorded earnings stay in Money
            Manager.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/gig-command"
              className="flex min-h-24 items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Clock3
                className="h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <span className="font-semibold">Track work manually</span>
                <p className="mt-1 text-xs text-muted-foreground">
                  Record time and earnings. GPS is optional.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
            <Link
              href="/money-manager?tab=import"
              className="flex min-h-24 items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileUp
                className="h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <span className="font-semibold">Import earnings</span>
                <p className="mt-1 text-xs text-muted-foreground">
                  Review supported exports and plan access.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}
      <section
        className="rounded-2xl border bg-card p-5 sm:p-6"
        aria-labelledby="connect-heading"
      >
        <h2 id="connect-heading" className="text-lg font-semibold">
          Link supported accounts
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Bank deposits show what arrived. Gig records show the work behind it.
          Linking opens the provider’s secure sign-in flow; UnifyOne does not
          collect your bank or gig-platform password.
        </p>
        {anyProviderReady ? (
          <div className="my-5 flex items-start gap-3 rounded-xl border bg-muted/20 p-4">
            <input
              id="money-consent"
              type="checkbox"
              className="mt-1 h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              checked={consent}
              onChange={event => setConsent(event.target.checked)}
            />
            <Label htmlFor="money-consent" className="text-sm leading-relaxed">
              I authorize read-only access to the accounts I select, their
              transactions and available earnings records. This connection does
              not authorize UnifyOne to move money or change where I get paid.
            </Label>
          </div>
        ) : (
          <div className="my-5 flex items-start gap-3 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            <ShieldCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p>
              You will choose the accounts to share and review read-only consent
              before connecting. No account passwords are stored by UnifyOne,
              and connecting does not move money.
            </p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              [
                "plaid",
                "Bank accounts",
                "Transactions and available account balances via Plaid",
                Building2,
                linkBank,
              ],
              [
                "argyle",
                "Gig and income accounts",
                "Available gigs and payroll payments via Argyle",
                Wallet,
                linkGig,
              ],
            ] as const
          ).map(([provider, title, description, Icon, action]) => (
            <div key={provider} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{title}</h3>
                <Badge variant="outline">
                  {availability.isLoading
                    ? "Checking availability"
                    : availability.data?.[provider].configured
                      ? availability.data[provider].environment === "sandbox"
                        ? "Test mode"
                        : "Ready to connect"
                      : "Not available yet"}
                </Badge>
              </div>
              <p className="my-3 text-sm text-muted-foreground">
                {description}. Coverage and available history vary by
                institution and platform.
              </p>
              <Button
                className="min-h-11 w-full sm:w-auto"
                disabled={
                  !consent || busy || !availability.data?.[provider].configured
                }
                onClick={() => void action()}
              >
                <Link2 className="mr-2 h-4 w-4" />
                {provider === "plaid" ? "Link a bank" : "Link gig accounts"}
              </Button>
              {availability.data && !availability.data[provider].configured && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {provider === "plaid"
                    ? "Bank linking is being prepared. Use your work records for now."
                    : "Gig account linking is being prepared. Available platforms will depend on provider coverage."}
                </p>
              )}
            </div>
          ))}
        </div>
        {availability.isError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Could not check linking availability.{" "}
            <button
              className="underline"
              onClick={() => void availability.refetch()}
            >
              Retry
            </button>
          </p>
        )}
      </section>
      <section className="mt-6" aria-labelledby="connections-heading">
        <h2 id="connections-heading" className="mb-3 text-lg font-semibold">
          Your connections
        </h2>
        {connections.isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : connections.isError ? (
          <p role="alert" className="rounded-xl border p-4">
            We could not check your saved connections. This does not mean your
            accounts were disconnected.{" "}
            <Button variant="link" onClick={() => void connections.refetch()}>
              Retry
            </Button>
          </p>
        ) : connections.data?.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {connections.data.map(connection => (
              <Card key={connection.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {connection.provider === "plaid"
                      ? "Bank connection"
                      : "Gig accounts"}
                    <Badge variant="outline">{connection.environment}</Badge>
                    <Badge variant="secondary">
                      {connectionStatuses[connection.status] ??
                        "Check connection"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {connection.accounts.map(account => (
                      <li
                        key={account.id}
                        className="flex flex-wrap justify-between gap-2"
                      >
                        <span className="min-w-0 break-words">
                          {account.name}
                          {account.mask ? ` ··${account.mask}` : ""}{" "}
                          <span className="text-muted-foreground">
                            ({account.state.replaceAll("_", " ")})
                          </span>
                        </span>
                        {account.balance != null && account.currency && (
                          <span className="tabular-nums">
                            <span className="mr-1 text-xs text-muted-foreground">
                              Imported balance
                            </span>
                            {money(account.balance, account.currency)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {!connection.accounts.length && (
                    <p className="text-sm text-muted-foreground">
                      No accounts imported yet. Finish linking or refresh when
                      the provider has fetched your history.
                    </p>
                  )}
                  <p className="my-3 text-xs text-muted-foreground">
                    {connection.lastSyncedAt
                      ? `Last import: ${new Date(connection.lastSyncedAt).toLocaleString()}`
                      : "Waiting for the first import"}
                    . Refresh imports the history currently available from the
                    provider.
                  </p>
                  {!["ready", "linking"].includes(connection.status) && (
                    <p className="mb-3 text-sm text-amber-300">
                      {connection.status === "needs_reconnect"
                        ? "This bank needs authorization again. Disconnect it, then link it again."
                        : "The last operation did not finish. Existing data may be stale; retry or reconnect."}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        busy ||
                        [
                          "disconnecting",
                          "disconnect_failed",
                          "needs_reconnect",
                        ].includes(connection.status)
                      }
                      onClick={() => void sync(connection.id)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setConfirmDisconnect(connection.id)}
                    >
                      <Unplug className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  </div>
                  {confirmDisconnect === connection.id && (
                    <div className="mt-4 rounded-xl border border-destructive/30 p-4">
                      <p className="text-sm">
                        Revoke this connection and delete its imported activity
                        from UnifyOne? Your provider accounts and money will
                        stay intact.{" "}
                        {connection.provider === "argyle"
                          ? "This disconnects every gig account listed in this connection."
                          : "This disconnects every bank account listed in this connection."}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => void unlink(connection.id)}
                        >
                          Revoke and delete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setConfirmDisconnect(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Your connected accounts will appear here.{" "}
            {linkingUnavailable
              ? "Manual shifts and imported files are available in Money Manager; they do not create a linked account here."
              : "Connect one supported source to start. Each connection will show its accounts and last import time."}
          </p>
        )}
      </section>
      <section className="mt-8" aria-labelledby="activity-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="activity-heading" className="text-lg font-semibold">
            Activity and cash flow
          </h2>
          <div className="flex gap-2" aria-label="Activity period">
            {([30, 90] as const).map(period => (
              <Button
                key={period}
                size="sm"
                variant={days === period ? "default" : "outline"}
                aria-pressed={days === period}
                onClick={() => {
                  setDays(period);
                  setOffset(0);
                }}
              >
                Last {period} days
              </Button>
            ))}
          </div>
        </div>
        {sandbox && (
          <p className="mb-4 rounded-xl border border-amber-500/40 p-4 text-sm">
            Sandbox connections contain test data. Their records are labeled
            below and kept separate from production totals.
          </p>
        )}
        <p className="mb-4 text-sm text-muted-foreground">
          Gig earnings, payroll payments and bank deposits are separate views of
          money—not amounts to add together. Bank spending is not automatically
          a business expense. Pending transactions are excluded from totals.
          Currency totals are kept separate.
        </p>
        {overview.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : overview.isError ? (
          <div role="alert" className="rounded-xl border p-5">
            We could not load imported activity. Your records have not been
            removed.{" "}
            <Button variant="link" onClick={() => void overview.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {overview.data?.totals.map(total => (
                <Card
                  key={`${total.environment}:${total.kind}:${total.currency}`}
                >
                  <CardContent className="pt-5">
                    <p className="text-sm text-muted-foreground">
                      {kinds[total.kind]} · {total.currency} ·{" "}
                      {total.environment}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {money(total.net, total.currency)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {total.kind === "bank_transaction"
                        ? `${money(total.incoming, total.currency)} in · ${money(total.outgoing, total.currency)} out`
                        : "Completed records from this source only"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {!overview.data?.activity.length ? (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                {(connections.data?.length ?? 0) === 0
                  ? "No connected-account activity yet. Manual shifts and CSV earnings are shown in Money Manager."
                  : "No imported activity for this period yet. Newly linked accounts can take a few minutes to supply data. Refresh the connection to check again."}
              </p>
            ) : (
              <div>
                <ul
                  className="space-y-3 sm:hidden"
                  aria-label="Imported activity"
                >
                  {overview.data.activity.map(row => (
                    <li
                      key={row.id}
                      className="min-w-0 rounded-xl border bg-card p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 flex-1 break-words font-medium">
                          {row.description}
                        </p>
                        <p className="shrink-0 font-semibold tabular-nums">
                          {money(row.amount, row.currency)}
                        </p>
                      </div>
                      <p className="mt-2 break-words text-xs text-muted-foreground">
                        {sourceNames.get(
                          `${row.connectionId}:${row.sourceAccountId}`
                        ) ?? "Connected account"}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{row.date}</span>
                        <span>{kinds[row.kind]}</span>
                        {row.pending && (
                          <Badge variant="outline">Pending</Badge>
                        )}
                        {row.environment === "sandbox" && (
                          <Badge variant="outline">Test data</Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto rounded-xl border sm:block">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Activity</th>
                        <th className="p-4">Source</th>
                        <th className="p-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.data.activity.map(row => (
                        <tr key={row.id} className="border-t">
                          <td className="p-4">{row.date}</td>
                          <td className="p-4">
                            <p className="font-medium">{row.description}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {kinds[row.kind]}
                              {row.pending ? " · Pending" : ""} ·{" "}
                              {row.environment}
                            </p>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {sourceNames.get(
                              `${row.connectionId}:${row.sourceAccountId}`
                            ) ?? "Connected account"}
                          </td>
                          <td className="p-4 text-right font-medium tabular-nums">
                            {money(row.amount, row.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {!!overview.data?.total && (
              <div className="mt-4 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(value => Math.max(0, value - 50))}
                >
                  Previous
                </Button>
                <p className="text-xs text-muted-foreground">
                  {overview.data?.total
                    ? `${offset + 1}–${Math.min(offset + 50, overview.data.total)} of ${overview.data.total}`
                    : "0 records"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + 50 >= (overview.data?.total ?? 0)}
                  onClick={() => setOffset(value => value + 50)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </DashboardPageShell>
  );
}
