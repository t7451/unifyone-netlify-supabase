import { useState } from "react";
import { Link } from "wouter";
import { cn as classNames } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { EMAIL_PATTERN } from "../Home.constants";

export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const submitLead = trpc.leads.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: err => {
      toast.error(err.message ?? "Something went wrong. Please try again.");
    },
  });

  const validateEmail = (value: string) => EMAIL_PATTERN.test(value.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    setTouched(true);

    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");
    submitLead.mutate({
      email: trimmedEmail,
      source: "landing_page_blueprint",
    });
  };

  return (
    <section
      id="blueprint"
      className="parchment-alt-bg"
      style={{
        padding: "5rem 0",
        borderTop: "1px solid var(--parchment-line)",
        borderBottom: "1px solid var(--parchment-line)",
      }}
    >
      <div className="max-w-xl mx-auto px-6 sm:px-8 text-center">
        <span className="inscription-ink">Free resource</span>
        <h2
          className="font-cinzel text-2xl sm:text-3xl font-black mt-4 mb-3"
          style={{ color: "var(--ink)" }}
        >
          Get the Gig Worker Tax & Deduction Guide — the write-offs most drivers
          miss every single year.
        </h2>
        <p
          className="font-crimson text-lg mb-8 mobile-visibility-copy"
          style={{ color: "var(--ink-soft)", fontStyle: "italic" }}
        >
          A plain-English PDF on IRS mileage, quarterly estimated taxes, and the
          deductions that keep more money in your pocket at tax time.
        </p>
        {submitted ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{
              border: "1px solid rgba(212,168,67,0.5)",
              backgroundColor: "rgba(212,168,67,0.1)",
            }}
          >
            <p
              className="font-crimson text-base mobile-visibility-copy"
              style={{ color: "var(--gold-ink)" }}
            >
              ✓ You&apos;re on the list! Check your inbox for the Gig Worker Tax
              &amp; Deduction Guide.
            </p>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              noValidate
            >
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    const nextEmail = e.target.value;
                    setEmail(nextEmail);
                    if (touched) {
                      setError(
                        nextEmail.trim() && !validateEmail(nextEmail)
                          ? "Please enter a valid email address"
                          : ""
                      );
                    }
                  }}
                  onBlur={() => {
                    setTouched(true);
                    setError(
                      email.trim() && !validateEmail(email)
                        ? "Please enter a valid email address"
                        : ""
                    );
                  }}
                  placeholder="your@email.com"
                  aria-label="Email address"
                  aria-invalid={Boolean(error)}
                  className={classNames(
                    "w-full rounded-full border px-5 py-3 text-sm transition-colors",
                    error ? "border-red-500" : "border-[#e7ddca]"
                  )}
                  style={{
                    backgroundColor: "#fffdf8",
                    color: "var(--ink)",
                    outline: "none",
                  }}
                  required
                />
                {error && (
                  <p
                    className="mt-1 text-left text-xs"
                    style={{ color: "#DC2626" }}
                  >
                    {error}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={submitLead.isPending}
                className={classNames(
                  "btn-solid-gold shrink-0 whitespace-nowrap",
                  submitLead.isPending && "opacity-70"
                )}
              >
                {submitLead.isPending ? "Sending…" : "Send My Free Guide"}
              </button>
            </form>
            <p
              className="font-crimson text-xs mt-4 mobile-visibility-subtle"
              style={{ color: "var(--ink-faint)" }}
            >
              No spam. Unsubscribe anytime. We respect your privacy.{" "}
              <Link href="/privacy">
                <span
                  className="underline cursor-pointer mobile-visibility-subtle"
                  style={{ color: "var(--gold-ink)" }}
                >
                  Privacy Policy
                </span>
              </Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
