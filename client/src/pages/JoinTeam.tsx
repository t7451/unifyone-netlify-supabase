import { useLayoutEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { BrandLockup } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { landingPathForProduct } from "@/lib/primaryProduct";

const STORAGE_KEY = "unifyone.pending-team-invite";
const validToken = (value: string | null): value is string =>
  !!value && /^[a-f0-9]{96}$/i.test(value);
function invitationToken() {
  const urlToken = new URLSearchParams(window.location.search).get("token");
  if (urlToken !== null) return validToken(urlToken) ? urlToken : null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return validToken(stored) ? stored : null;
  } catch {
    return null;
  }
}

export default function JoinTeam() {
  const [token] = useState(invitationToken);
  const { user, loading, error: authError, refresh } = useAuth();
  const utils = trpc.useUtils();
  const accept = trpc.team.acceptInvite.useMutation();
  const [accepted, setAccepted] = useState(false);
  const [destination, setDestination] = useState("/settings");
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  useLayoutEffect(() => {
    // Keep the bearer token out of analytics/referrers and the sign-in URL.
    if (token)
      try {
        sessionStorage.setItem(STORAGE_KEY, token);
      } catch {
        setStorageUnavailable(true);
      }
    if (window.location.search)
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname
      );
  }, [token]);
  async function join() {
    if (!token || accept.isPending || accepted) return;
    try {
      await accept.mutateAsync({ token });
      setAccepted(true);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* no persistent token */
      }
      try {
        await utils.auth.me.invalidate();
        const current = await utils.auth.me.fetch();
        setDestination(landingPathForProduct(current?.primaryProduct));
      } catch {
        /* Membership succeeded; a full workspace reload can refresh auth. */
      }
    } catch {
      /* Mutation error is rendered; no membership change is claimed. */
    }
  }
  return (
    <div className="workspace-shell min-h-screen bg-[#111416] px-4 py-12 text-[#f4f2ed]">
      <Helmet>
        <title>Join a workspace | UnifyOne</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <main className="mx-auto max-w-lg space-y-6 rounded-xl border border-[#343a3d] bg-[#1d2325] p-6">
        <a href="/" aria-label="UnifyOne home">
          <BrandLockup />
        </a>
        <h1 className="text-2xl font-semibold">Join a workspace</h1>
        {!token ? (
          <p role="alert">
            This invitation link is missing or invalid. Ask the workspace admin
            for a new link.
          </p>
        ) : loading ? (
          <p role="status">Checking your account…</p>
        ) : authError ? (
          <div role="alert">
            <p>
              We could not check your account. Your invitation has not been
              accepted.
            </p>
            <Button onClick={() => void refresh()}>Retry account check</Button>
          </div>
        ) : accepted ? (
          <div role="status" className="space-y-4">
            <p>
              Invitation accepted. Your workspace membership has been updated.
            </p>
            <a
              href={destination}
              className="inline-flex min-h-11 items-center rounded-md bg-[#f39450] px-4 font-semibold text-[#111416]"
            >
              Open workspace
            </a>
          </div>
        ) : !user ? (
          <div className="space-y-4">
            <p>
              Sign in with the verified email address that received this
              invitation. You will confirm joining after sign-in.
            </p>
            {storageUnavailable && (
              <p>
                After signing in, reopen the original invitation link to
                continue.
              </p>
            )}
            <a
              href="/login?returnTo=%2Fjoin"
              className="inline-flex min-h-11 items-center rounded-md bg-[#f39450] px-4 font-semibold text-[#111416]"
            >
              Sign in to continue
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <p>Signed in as {user.email ?? "your account"}.</p>
            <p>
              Accepting switches this account to the invited workspace and its
              assigned role. You will stop accessing your current workspace
              through this account. Workspace owners must transfer ownership
              before switching.
            </p>
            {accept.error && <p role="alert">{accept.error.message}</p>}
            <Button
              className="min-h-11 bg-[#f39450] text-[#111416] hover:bg-[#ffad74]"
              disabled={accept.isPending}
              onClick={() => void join()}
            >
              {accept.isPending ? "Joining…" : "Accept invitation"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
