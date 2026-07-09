import { useState } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ToolEmailCaptureProps {
  /**
   * Per-tool lead source tag, e.g. "tool:mileage-deduction-calculator".
   * Flows through to leads.submit so leads can be segmented by which
   * calculator produced them.
   */
  source: string;
  /** Headline shown above the form. Keep it benefit-led and tool-specific. */
  heading?: string;
  /** Supporting line under the headline. */
  subheading?: string;
  /** CTA button label. */
  cta?: string;
  /**
   * Optional short, non-PII context (e.g. "Estimated set-aside: $312/mo")
   * stored on the lead so follow-up email can reference the calc result.
   */
  resultSummary?: string;
  className?: string;
}

/**
 * ToolEmailCapture -- compact email opt-in dropped into the free calculators.
 *
 * These pages previously captured zero emails ("no account required"), leaking
 * every high-intent visitor. This reuses the existing public, rate-limited
 * `leads.submit` mutation (no auth) and tags each lead with the originating
 * tool so the list can be worked and monetized (tax-software affiliate in
 * season, driver bonuses year-round, Pro upsell, etc.).
 */
export default function ToolEmailCapture({
  source,
  heading = "Email yourself this result + get quarterly tax reminders",
  subheading = "We'll send your numbers and a plain-English nudge before each IRS quarterly deadline. No spam, unsubscribe anytime.",
  cta = "Email me my result",
  resultSummary,
  className,
}: ToolEmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitLead = trpc.leads.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: err =>
      toast.error(err.message ?? "Something went wrong. Please try again."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    submitLead.mutate({
      email: trimmed,
      source,
      message: resultSummary ? `Tool result -- ${resultSummary}` : undefined,
    });
  };

  return (
    <section
      className={cn(
        "mt-12 rounded-xl border bg-card p-6 sm:p-8 text-card-foreground",
        className
      )}
    >
      {submitted ? (
        <p className="text-sm font-medium text-primary">
          &#10003; Done -- check your inbox. We&apos;ll also remind you before
          the next quarterly tax deadline.
        </p>
      ) : (
        <>
          <h2 className="text-lg font-semibold">{heading}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{subheading}</p>
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <div className="flex-1">
              <label htmlFor={`tool-email-${source}`} className="sr-only">
                Email address
              </label>
              <input
                id={`tool-email-${source}`}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="your@email.com"
                aria-invalid={Boolean(error)}
                className={cn(
                  "w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary",
                  error ? "border-red-500" : "border-input"
                )}
                required
              />
              {error && (
                <p className="mt-1 text-left text-xs text-red-600">{error}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={submitLead.isPending}
              className={cn(
                "shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90",
                submitLead.isPending && "opacity-70"
              )}
            >
              {submitLead.isPending ? "Sending..." : cta}
            </button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            By subscribing you agree to our{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            . Educational only -- not tax advice.
          </p>
        </>
      )}
    </section>
  );
}
