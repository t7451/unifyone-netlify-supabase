import { useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import { SITE_URL } from "@/lib/siteConfig";

const DESCRIPTION =
  "Contact the UnifyOne team for product questions, account support, feedback, or partnerships. Use the form or email support@1commerce.online.";
function initialMessageFromQuery(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("topic") ===
    "custom-resources"
    ? "I'd like to request custom UnifyOne resources for my business."
    : "";
}
export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(initialMessageFromQuery);
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [feedback, setFeedback] = useState("");
  const sendContact = trpc.contact.send.useMutation();
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setFeedback("");
    try {
      const result = await sendContact.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        company,
      });
      if (!result.success) {
        setStatus("error");
        setFeedback(
          result.message ||
            "We could not send your message. Please try again or email support@1commerce.online."
        );
        return;
      }
      setStatus("sent");
      setFeedback("Your message was received. Thanks for getting in touch.");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
      setFeedback(
        "We could not send your message. Your text is still here. Try again, or email support@1commerce.online."
      );
    }
  };
  return (
    <PublicLayout>
      <PageHead
        title="Contact & support | UnifyOne"
        description={DESCRIPTION}
        canonical={SITE_URL + "/contact"}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact & support | UnifyOne",
            description: DESCRIPTION,
            url: SITE_URL + "/contact",
          },
        ]}
      />
      <div className="marketing-page">
        <header className="marketing-page-heading marketing-container">
          <p className="marketing-eyebrow">Contact & support</p>
          <h1>
            A question.
            <br />
            An idea.
            <br />
            <em>We’re listening.</em>
          </h1>
          <p className="marketing-lead">
            Tell us what you’re working through, or what would make UnifyOne
            more useful to you.
          </p>
        </header>
        <section
          className="marketing-contact-grid marketing-container"
          aria-label="Contact options"
        >
          <div>
            <h2>Talk to the team.</h2>
            <p>
              For account help, product questions, partnerships, or feedback,
              send us a note here.
            </p>
            <a
              href="mailto:support@1commerce.online"
              className="marketing-text-link"
            >
              <Mail size={18} aria-hidden="true" />
              support@1commerce.online
            </a>
            <p>
              Please keep passwords, payment details, and tax documents out of
              your message. A brief description is enough to get started.
            </p>
            <p>
              Looking for a quick answer?
              <br />
              <Link className="marketing-text-link" href="/pricing">
                Compare plans →
              </Link>
              <br />
              <Link className="marketing-text-link" href="/tools">
                Explore the free tools →
              </Link>
            </p>
          </div>
          <div className="marketing-contact-card">
            <form
              onSubmit={handleSubmit}
              className="marketing-contact-form"
              aria-busy={status === "sending"}
            >
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={name}
                  onChange={event => setName(event.target.value)}
                />
              </label>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                />
              </label>
              <label>
                Your message
                <textarea
                  name="message"
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={6}
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  aria-describedby="contact-message-hint"
                />
              </label>
              <span id="contact-message-hint" className="marketing-fine">
                At least 10 characters. Include the page or feature you’re
                asking about.
              </span>
              <div className="marketing-honeypot" aria-hidden="true">
                <label>
                  Company
                  <input
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    value={company}
                    onChange={event => setCompany(event.target.value)}
                  />
                </label>
              </div>
              {feedback && (
                <div
                  className="marketing-feedback"
                  data-error={status === "error"}
                  role={status === "error" ? "alert" : "status"}
                >
                  {feedback}
                </div>
              )}
              <button
                className="marketing-button"
                type="submit"
                disabled={status === "sending"}
              >
                {status === "sending"
                  ? "Sending…"
                  : status === "sent"
                    ? "Send another message"
                    : "Send message"}
                <ArrowUpRight size={18} aria-hidden="true" />
              </button>
              <p className="marketing-fine">
                We use your details to respond to your request.{" "}
                <Link href="/privacy">Privacy policy</Link>.
              </p>
            </form>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
