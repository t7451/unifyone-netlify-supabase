import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { trpc } from "@/lib/trpc";
import PublicLayout from "@/components/PublicLayout";
import { CdnImage } from "@/components/CdnImage";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/contact`;

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": CANONICAL,
  url: CANONICAL,
  name: "Contact | UnifyOne",
  description:
    "Get in touch with the UnifyOne team. Questions about pricing, enterprise plans, or integrations? We respond within one business day.",
  isPartOf: { "@id": `${SITE_URL}/#website` },
  inLanguage: "en-US",
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Contact", item: CANONICAL },
    ],
  },
};

function initialMessageFromQuery(): string {
  if (typeof window === "undefined") return "";
  const topic = new URLSearchParams(window.location.search).get("topic");
  if (topic !== "custom-resources") return "";

  return "I'd like to request custom UnifyOne resources for my business.";
}

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(initialMessageFromQuery);
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
        setFeedback(
          "Your message was received. We'll respond within one business day."
        );
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
        setFeedback(
          "Something went wrong. Please email us directly at hello@1commerce.online"
        );
      }
    } catch {
      setStatus("error");
      setFeedback(
        "Something went wrong. Please email us directly at hello@1commerce.online"
      );
    }
  };

  return (
    <PublicLayout>
      <Helmet>
        <title>Contact | UnifyOne</title>
        <meta
          name="description"
          content="Get in touch with the UnifyOne team. Questions about pricing, enterprise plans, or integrations? We respond within one business day."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Contact | UnifyOne" />
        <meta
          property="og:description"
          content="Get in touch with the UnifyOne team. We respond within one business day."
        />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>

      <section
        className="max-w-2xl mx-auto px-6 sm:px-8"
        style={{ paddingTop: "8rem", paddingBottom: "6rem" }}
      >
        <div className="inscription mb-6" style={{ color: "#D4A843" }}>
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
          style={{ color: "#6A6A6A", fontStyle: "italic", lineHeight: 1.7 }}
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

        {/* Instagram */}
        <div
          className="flex items-center gap-6 mb-12 pb-12"
          style={{ borderBottom: "1px solid #242424" }}
        >
          <a
            href="https://www.instagram.com/1commerce_llc"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex-shrink-0"
          >
            <CdnImage
              src="https://github.com/user-attachments/assets/6dbb3057-6f53-4fcd-9d50-edff38133fed"
              alt="Follow @1COMMERCE_LLC on Instagram — scan QR code"
              width={100}
              height={100}
              fit="cover"
              className="rounded-lg opacity-80 group-hover:opacity-100 transition-opacity duration-300"
              style={{ imageRendering: "pixelated" }}
            />
          </a>
          <div>
            <span
              className="inscription block mb-2"
              style={{ color: "#D4A843" }}
            >
              INSTAGRAM
            </span>
            <a
              href="https://www.instagram.com/1commerce_llc"
              target="_blank"
              rel="noopener noreferrer"
              className="font-cinzel text-sm tracking-widest transition-colors duration-200"
              style={{ color: "#8A8A8A", letterSpacing: "0.15em" }}
              onMouseEnter={e =>
                ((e.currentTarget as HTMLElement).style.color = "#D4A843")
              }
              onMouseLeave={e =>
                ((e.currentTarget as HTMLElement).style.color = "#8A8A8A")
              }
            >
              @1COMMERCE_LLC
            </a>
            <p
              className="font-crimson text-sm mt-1"
              style={{ color: "#5A5A5A", fontStyle: "italic" }}
            >
              Scan to follow — behind-the-scenes builds, product updates, and
              operator content.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="block inscription mb-2"
              style={{ color: "#5A5A5A" }}
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
              className="block inscription mb-2"
              style={{ color: "#5A5A5A" }}
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
              className="block inscription mb-2"
              style={{ color: "#5A5A5A" }}
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
            disabled={status === "sending" || status === "sent"}
            className="btn-illuminate"
            style={{ opacity: status === "sending" ? 0.6 : 1 }}
          >
            {status === "sending"
              ? "Sending..."
              : status === "sent"
                ? "Message Sent"
                : "Send Message"}
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
    </PublicLayout>
  );
}
