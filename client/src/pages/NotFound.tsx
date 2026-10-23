import "@/components/reading.css";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
export default function NotFound() {
  return (
    <PublicLayout>
      <Helmet>
        <title>404 — Page not found | UnifyOne</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <div className="marketing-page">
        <section className="marketing-container marketing-page-heading marketing-not-found">
          <span className="marketing-eyebrow">404 · Page not found</span>
          <h1>Let's get you back on track.</h1>
          <p className="marketing-lead">
            This address may have changed, or the page may no longer be here.
            Start with a free tool or browse the guide library.
          </p>
          <div className="reference-actions">
            <Link href="/" className="marketing-button">
              Go home →
            </Link>
            <Link
              href="/tools"
              className="marketing-button marketing-button-outline"
            >
              Browse free tools →
            </Link>
            <Link
              href="/resources"
              className="marketing-button marketing-button-outline"
            >
              Read the guides →
            </Link>
          </div>
          <p>
            Still looking for something?{" "}
            <Link href="/contact">Contact support</Link>.
          </p>
        </section>
      </div>
    </PublicLayout>
  );
}
