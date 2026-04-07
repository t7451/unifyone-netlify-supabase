import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [feedback, setFeedback] = useState("");

  const sendContact = trpc.contact.send.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setFeedback("");
    try {
      const res = await sendContact.mutateAsync({
        name,
        email,
        message,
        company,
      });
      if (res.success) {
        setStatus("sent");
        setFeedback(res.message);
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
        setFeedback(res.message);
      }
    } catch (err) {
      setStatus("error");
      setFeedback(
        err instanceof Error
          ? err.message
          : "Something went wrong. Try email instead."
      );
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#020202",
        color: "#F0E8D0",
        minHeight: "100vh",
      }}
    >
      <header className="border-b" style={{ borderColor: "#242424" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <span
              className="cursor-pointer font-cinzel text-sm font-700"
              style={{ color: "#D4A843", letterSpacing: "0.2em" }}
            >
              UNIFYONE
            </span>
          </Link>
          <Link href="/">
            <span
              className="cursor-pointer font-cinzel text-xs"
              style={{ color: "#5A5A5A", letterSpacing: "0.2em" }}
            >
              ← BACK TO HOME
            </span>
          </Link>
        </div>
      </header>

      <section className="max-w-2xl mx-auto px-6 sm:px-8 py-24">
        <div
          className="font-cinzel text-xs mb-6"
          style={{ color: "#D4A843", letterSpacing: "0.3em" }}
        >
          CONTACT
        </div>
        <h1
          className="font-cinzel text-4xl sm:text-5xl font-black mb-6"
          style={{ color: "#F0E8D0" }}
        >
          Talk to a human.
        </h1>
        <p
          className="font-crimson text-lg mb-12"
          style={{ color: "#8A8A8A", fontStyle: "italic" }}
        >
          Sales questions, partnership ideas, support escalations — write to us
          and we'll respond within one business day. Or email{" "}
          <a
            href="mailto:hello@1commerce.online"
            style={{ color: "#D4A843" }}
            className="underline"
          >
            hello@1commerce.online
          </a>{" "}
          directly.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="block font-cinzel text-xs mb-2"
              style={{ color: "#8A8A8A", letterSpacing: "0.2em" }}
            >
              NAME
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 font-crimson text-base"
              style={{
                backgroundColor: "#0A0A0A",
                border: "1px solid #242424",
                color: "#F0E8D0",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              className="block font-cinzel text-xs mb-2"
              style={{ color: "#8A8A8A", letterSpacing: "0.2em" }}
            >
              EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 font-crimson text-base"
              style={{
                backgroundColor: "#0A0A0A",
                border: "1px solid #242424",
                color: "#F0E8D0",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              className="block font-cinzel text-xs mb-2"
              style={{ color: "#8A8A8A", letterSpacing: "0.2em" }}
            >
              MESSAGE
            </label>
            <textarea
              required
              minLength={10}
              rows={6}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-4 py-3 font-crimson text-base resize-y"
              style={{
                backgroundColor: "#0A0A0A",
                border: "1px solid #242424",
                color: "#F0E8D0",
                outline: "none",
              }}
            />
          </div>

          {/* Honeypot — hidden from real users */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-9999px",
              width: 1,
              height: 1,
              overflow: "hidden",
            }}
          >
            <label>
              Company
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={e => setCompany(e.target.value)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={status === "sending"}
            className="btn-illuminate"
            style={{ opacity: status === "sending" ? 0.6 : 1 }}
          >
            {status === "sending" ? "Sending..." : "Send Message"}
          </button>

          {feedback && (
            <p
              className="font-crimson text-sm"
              style={{
                color: status === "error" ? "#FF6B6B" : "#D4A843",
              }}
            >
              {feedback}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
