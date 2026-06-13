import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { FloatingCta } from "@/components/marketing/floating-cta";
import { AnalyticsListener } from "@/components/analytics/analytics-listener";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = "https://1commerce.online";
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "UnifyOne — Earn more, owe less, stop juggling apps",
    template: "%s · UnifyOne",
  },
  description:
    "UnifyOne syncs real earnings from DoorDash, Uber Eats, Shopify, Stripe and 10+ more. Tax Autopilot, Kai AI, and multi-tenant commerce — free forever to start.",
  applicationName: "UnifyOne",
  keywords: [
    "gig worker dashboard",
    "DoorDash earnings tracker",
    "Uber Eats earnings",
    "Instacart taxes",
    "multi-tenant commerce",
    "Shopify analytics",
    "AI for gig workers",
  ],
  authors: [{ name: "1Commerce LLC" }],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "UnifyOne",
    title: "UnifyOne — Earn more, owe less, stop juggling apps",
    description:
      "Real earnings sync, Tax Autopilot, Kai AI sidekick, and multi-tenant commerce — all in one platform.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "UnifyOne dashboard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UnifyOne — Earn more, owe less, stop juggling apps",
    description:
      "AI-powered commerce + gig earnings platform. Start free, no credit card.",
    images: ["/og-default.png"],
  },
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
};

const GTM_ID = "GTM-K2CL4G7H";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Google Tag Manager */}
        <Script
          id="gtm-head"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      </head>
      <body className="min-h-screen bg-white font-sans text-ink-900">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* JSON-LD organization schema for SEO */}
        <Script
          id="ld-org"
          type="application/ld+json"
          strategy="afterInteractive"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "UnifyOne",
              url: SITE_URL,
              logo: `${SITE_URL}/logo.png`,
              sameAs: [
                "https://twitter.com/unifyone",
                "https://www.linkedin.com/company/unifyone",
              ],
              parentOrganization: {
                "@type": "Organization",
                name: "1Commerce LLC",
              },
            }),
          }}
        />

        {/* Google Analytics 4 */}
        {GA4_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA4_ID}',{send_page_view:true});`}
            </Script>
          </>
        )}

        {/* Microsoft Clarity */}
        {CLARITY_ID && (
          <Script id="ms-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
          </Script>
        )}

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main">{children}</main>
        <Footer />
        <FloatingCta />
        <AnalyticsListener />
      </body>
    </html>
  );
}
