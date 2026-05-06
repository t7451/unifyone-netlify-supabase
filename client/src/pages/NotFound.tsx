import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";

export default function NotFound() {
  return (
    <PublicLayout>
      <Helmet>
        <title>404 — Page Not Found | UnifyOne</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <section style={{ paddingTop: "8rem", paddingBottom: "6rem" }}>
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <div
            className="text-center px-6 py-12 sm:px-10 sm:py-16"
            style={{
              backgroundColor: "#020202",
              border: "1px solid #242424",
              boxShadow: "inset 0 1px 0 rgba(212,168,67,0.08)",
            }}
          >
            <div
              className="font-cinzel text-7xl sm:text-[8rem] font-black leading-none mb-6"
              style={{ color: "#D4A843" }}
            >
              404
            </div>

            <h1
              className="font-cinzel text-3xl sm:text-5xl font-black mb-5"
              style={{ color: "#F0E8D0" }}
            >
              Page Not Found
            </h1>

            <p
              className="font-crimson text-lg sm:text-xl mb-10"
              style={{ color: "#6A6A6A", fontStyle: "italic" }}
            >
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved.
            </p>

            <div
              id="not-found-button-group"
              className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4"
            >
              <Link href="/">
                <span className="btn-illuminate inline-block cursor-pointer">
                  Go Home
                </span>
              </Link>
              <Link href="/pricing">
                <span className="btn-ghost-gold inline-block cursor-pointer">
                  View Pricing
                </span>
              </Link>
              <Link href="/contact">
                <span className="btn-ghost-gold inline-block cursor-pointer">
                  Contact
                </span>
              </Link>
            </div>

            <p
              className="font-crimson text-sm sm:text-base mt-8"
              style={{ color: "#5A5A5A", fontStyle: "italic" }}
            >
              Use the navigation above to find your way back.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
