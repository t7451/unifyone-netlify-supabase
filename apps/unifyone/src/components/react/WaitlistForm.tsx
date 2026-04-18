import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setMessage("");

    const utm: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      for (const key of [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
      ]) {
        const v = params.get(key);
        if (v) utm[key] = v;
      }
    }

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          source: "homepage",
          utm: Object.keys(utm).length ? utm : undefined,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (res.ok && data.ok) {
        setStatus("success");
        setMessage("You're on the list. We'll email you when your spot opens.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <section id="waitlist" className="bg-navy-500 py-20">
      <div className="max-w-xl mx-auto px-4 text-center text-white">
        <h2 className="text-3xl md:text-4xl font-bold">
          Reserve your spot
        </h2>
        <p className="mt-3 text-navy-100">
          Priority access as we onboard new platforms. Launch pricing locked in.
        </p>
        <form
          onSubmit={onSubmit}
          className="mt-8 flex flex-col sm:flex-row gap-3"
          noValidate
        >
          <label htmlFor="waitlist-email" className="sr-only">
            Email
          </label>
          <input
            id="waitlist-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 py-3 rounded-md text-navy-500 placeholder-navy-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300"
            disabled={status === "submitting"}
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="bg-teal-400 hover:bg-teal-500 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-md transition-colors"
          >
            {status === "submitting" ? "Joining…" : "Join waitlist"}
          </button>
        </form>
        {message && (
          <p
            className={`mt-4 text-sm ${
              status === "success" ? "text-teal-200" : "text-red-200"
            }`}
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
