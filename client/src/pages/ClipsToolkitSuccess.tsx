import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AlertTriangle, CheckCircle2, Download, Loader2 } from "lucide-react";

import PageHead from "@/components/PageHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SITE_URL } from "@/lib/siteConfig";
import { trpc } from "@/lib/trpc";
import { trackPurchase } from "@/lib/behaviorTracking";

const CANONICAL = `${SITE_URL}/clips/success`;

export default function ClipsToolkitSuccess() {
  const [location] = useLocation();
  const sessionId = useMemo(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    return params.get("session_id");
  }, [location]);

  const getDownload = trpc.clipsToolkit.getDownload.useMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Guard so the mutation fires exactly once per session id — Stripe redirects
  // here with a stable session_id and we don't want to re-mint tokens on every
  // render or React StrictMode double-invoke.
  const fetchedForSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setErrorMessage("Missing checkout session id.");
      return;
    }
    if (fetchedForSessionRef.current === sessionId) return;
    fetchedForSessionRef.current = sessionId;

    getDownload.mutateAsync({ sessionId }).catch((err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : "Could not verify your purchase. Please contact support.";
      setErrorMessage(message);
    });
  }, [sessionId, getDownload]);

  const downloadInfo = getDownload.data;
  const isVerifying = !errorMessage && !downloadInfo;

  // Record the confirmed purchase exactly once, when Stripe verification
  // succeeds (no-op until the visitor granted analytics consent).
  const purchaseTrackedRef = useRef(false);
  useEffect(() => {
    if (downloadInfo && !purchaseTrackedRef.current) {
      purchaseTrackedRef.current = true;
      trackPurchase({ itemCount: 1 });
    }
  }, [downloadInfo]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <PageHead
        title="Download your toolkit | 1Commerce"
        description="Your 1Commerce Gen AI Research Toolkit is ready to download."
        canonical={CANONICAL}
      />
      <div className="w-full max-w-md space-y-8 text-center">
        {isVerifying ? (
          <>
            <div className="flex justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#00D9FF]" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Verifying your purchase…</h1>
              <p className="text-sm text-muted-foreground">
                Hang tight — we're confirming payment with Stripe.
              </p>
            </div>
          </>
        ) : errorMessage ? (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="space-y-4 p-6">
              <div className="flex justify-center">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold">We couldn't deliver yet</h1>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <div className="flex flex-col gap-2">
                <Button asChild variant="outline">
                  <Link href="/clips">Return to product page</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/contact">Contact support</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : downloadInfo ? (
          <>
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Payment received</h1>
              <p className="text-muted-foreground">
                Thanks for purchasing the 1Commerce Gen AI Research Toolkit.
                {downloadInfo.email ? (
                  <>
                    {" "}
                    A receipt was sent to{" "}
                    <span className="text-foreground">
                      {downloadInfo.email}
                    </span>
                    .
                  </>
                ) : null}
              </p>
            </div>
            <Card className="border-border/40">
              <CardContent className="space-y-3 p-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Your download
                </p>
                <p className="font-medium">{downloadInfo.filename}</p>
                <Button
                  asChild
                  className="w-full bg-[#00D9FF] font-semibold text-black hover:bg-[#00B8D9]"
                >
                  <a
                    href={downloadInfo.downloadUrl}
                    download={downloadInfo.filename}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download research workbook
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground">
                  This download link is valid for 15 minutes. Reload this page
                  if it expires.
                </p>
              </CardContent>
            </Card>
            <Button asChild variant="ghost" className="text-muted-foreground">
              <Link href="/clips">Back to product page</Link>
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
