/**
 * vite-plugin-prerender-seo.ts
 *
 * Generates a static index.html for every SEO landing page at build time.
 * Netlify (and any static host) will serve these files directly for their
 * corresponding URL paths, so crawlers receive fully-formed meta tags —
 * title, description, canonical, Open Graph, Twitter Card, and JSON-LD —
 * in the initial HTTP response rather than waiting for JavaScript hydration.
 *
 * Output layout (all inside Vite's build.outDir):
 *   seo/index.html            → /seo
 *   seo/<slug>/index.html     → /seo/<slug>    (one file per SeoPage)
 *
 * Netlify file-based routing rule: if a physical file exists at the requested
 * path, it is served directly; the SPA catch-all redirect (`/* → /index.html`)
 * only fires for paths without a matching file.  No netlify.toml changes are
 * needed.
 */

import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

// ── Minimal mirror of SeoPage so this file has zero runtime deps ──────────

interface SeoPageSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface SeoPage {
  slug: string;
  title: string;
  h1: string;
  tagline: string;
  description: string;
  keywords: string[];
  sections: SeoPageSection[];
  faq: { q: string; a: string }[];
  related?: string[];
}

export interface PrerenderSeoOptions {
  /** Full origin, e.g. "https://1commerce.online" */
  hostname: string;
  /** Absolute path to Vite's build.outDir (where index.html lives) */
  outDir: string;
  /** Array of SEO page definitions imported from seoPages.ts */
  pages: SeoPage[];
}

// ── HTML helpers ─────────────────────────────────────────────────────────

/** Escape a string for use inside an HTML attribute value (double-quoted). */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Serialize a value as JSON and neutralise any embedded `</script>` sequences
 * so the output is safe to embed inside a `<script>` element.
 */
function safeJsonStringify(value: object): string {
  return JSON.stringify(value).replace(/<\//g, "<\\/");
}

/** Replace the first regex match in html; silently skips if no match. */
function replaceAttr(html: string, re: RegExp, replacement: string): string {
  return html.replace(re, replacement);
}

// ── JSON-LD builders ──────────────────────────────────────────────────────

function pageJsonLdScripts(page: SeoPage, canonical: string, origin: string): string {
  const schemas: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      description: page.description,
      url: canonical,
      inLanguage: "en-US",
      isPartOf: {
        "@type": "WebSite",
        name: "UnifyOne by 1Commerce",
        url: `${origin}/`,
      },
      about: {
        "@type": "SoftwareApplication",
        name: "UnifyOne",
        alternateName: [
          "UnifOne",
          "1Commerce",
          "1-Commerce",
          "1Commerce LLC",
          "OneCommerce",
          "OneCommerc",
          "UnifyOne Solutions",
          "PNW Enterprises",
        ],
        applicationCategory: "BusinessApplication",
      },
      publisher: {
        "@type": "Organization",
        name: "1Commerce LLC",
        alternateName: ["PNW Enterprises", "1Commerce Solutions"],
        url: origin,
      },
      keywords: page.keywords.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: "SEO",
          item: `${origin}/seo`,
        },
        { "@type": "ListItem", position: 3, name: page.h1, item: canonical },
      ],
    },
  ];

  if (page.faq.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
  }

  return schemas
    .map(
      (s) =>
        `  <script type="application/ld+json">\n  ${safeJsonStringify(s)}\n  </script>`
    )
    .join("\n");
}

function seoIndexJsonLdScripts(
  title: string,
  description: string,
  canonical: string,
  origin: string
): string {
  const schemas: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description,
      url: canonical,
      inLanguage: "en-US",
      isPartOf: {
        "@type": "WebSite",
        name: "UnifyOne by 1Commerce",
        url: `${origin}/`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: "UnifyOne Guides",
          item: canonical,
        },
      ],
    },
  ];

  return schemas
    .map(
      (s) =>
        `  <script type="application/ld+json">\n  ${safeJsonStringify(s)}\n  </script>`
    )
    .join("\n");
}

// ── Per-page HTML injection ───────────────────────────────────────────────

function injectPageMeta(baseHtml: string, page: SeoPage, origin: string): string {
  const canonical = `${origin}/seo/${page.slug}`;
  let html = baseHtml;

  // Primary meta
  html = replaceAttr(
    html,
    /<title>[^<]*<\/title>/,
    `<title>${esc(page.title)}</title>`
  );
  html = replaceAttr(
    html,
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${esc(page.description)}"`
  );
  html = replaceAttr(
    html,
    /<meta name="keywords" content="[^"]*"/,
    `<meta name="keywords" content="${esc(page.keywords.join(", "))}"`
  );
  html = replaceAttr(
    html,
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${canonical}"`
  );

  // Open Graph
  html = replaceAttr(
    html,
    /<meta property="og:type" content="[^"]*"/,
    `<meta property="og:type" content="article"`
  );
  html = replaceAttr(
    html,
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${canonical}"`
  );
  html = replaceAttr(
    html,
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${esc(page.title)}"`
  );
  html = replaceAttr(
    html,
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${esc(page.description)}"`
  );

  // Twitter / X Card
  html = replaceAttr(
    html,
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${esc(page.title)}"`
  );
  html = replaceAttr(
    html,
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${esc(page.description)}"`
  );

  // Inject page-specific JSON-LD just before </head>
  const jsonLd = pageJsonLdScripts(page, canonical, origin);
  if (!html.includes("</head>")) {
    console.warn(
      `[prerender-seo] </head> not found in base HTML for slug "${page.slug}" — JSON-LD not injected`
    );
  } else {
    html = html.replace("</head>", `${jsonLd}\n  </head>`);
  }

  return html;
}

function buildSeoIndexHtml(baseHtml: string, origin: string): string {
  const canonical = `${origin}/seo`;
  const title =
    "UnifyOne Guides — 1Commerce, UnifOne, OneCommerce, 1-Commerce";
  const description =
    "Complete index of UnifyOne guides — covering every brand variation operators search for: UnifyOne, UnifOne, 1Commerce, 1-commerce, 1Commerce LLC, OneCommerc, OneCommerce, UnifyOne Solutions, PNW Enterprises.";
  const keywords =
    "UnifyOne, UnifOne, 1Commerce, 1-commerce, 1commerce, 1Commerce LLC, 1Commerce Solutions, OneCommerc, OneCommerce, UnifyOne Solutions, PNW Enterprises, multi-tenant commerce platform";

  let html = baseHtml;

  html = replaceAttr(
    html,
    /<title>[^<]*<\/title>/,
    `<title>${esc(title)}</title>`
  );
  html = replaceAttr(
    html,
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${esc(description)}"`
  );
  html = replaceAttr(
    html,
    /<meta name="keywords" content="[^"]*"/,
    `<meta name="keywords" content="${esc(keywords)}"`
  );
  html = replaceAttr(
    html,
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${canonical}"`
  );
  html = replaceAttr(
    html,
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${canonical}"`
  );
  html = replaceAttr(
    html,
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${esc(title)}"`
  );
  html = replaceAttr(
    html,
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${esc(description)}"`
  );
  html = replaceAttr(
    html,
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${esc(title)}"`
  );
  html = replaceAttr(
    html,
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${esc(description)}"`
  );

  const jsonLd = seoIndexJsonLdScripts(title, description, canonical, origin);
  if (!html.includes("</head>")) {
    console.warn(
      "[prerender-seo] </head> not found in base HTML for /seo — JSON-LD not injected"
    );
  } else {
    html = html.replace("</head>", `${jsonLd}\n  </head>`);
  }

  return html;
}

// ── Plugin export ─────────────────────────────────────────────────────────

export function prerenderSeoPlugin(options: PrerenderSeoOptions): Plugin {
  return {
    name: "vite-prerender-seo",
    apply: "build",
    closeBundle() {
      const origin = options.hostname.replace(/\/+$/, "");
      const indexPath = path.join(options.outDir, "index.html");

      if (!fs.existsSync(indexPath)) {
        console.warn(
          `[prerender-seo] ${indexPath} not found — skipping SEO pre-render`
        );
        return;
      }

      const baseHtml = fs.readFileSync(indexPath, "utf-8");
      const seoDir = path.join(options.outDir, "seo");
      fs.mkdirSync(seoDir, { recursive: true });

      // /seo  (index page)
      const seoIndexHtml = buildSeoIndexHtml(baseHtml, origin);
      fs.writeFileSync(path.join(seoDir, "index.html"), seoIndexHtml, "utf-8");

      // /seo/:slug  (one file per page)
      for (const page of options.pages) {
        const dir = path.join(seoDir, page.slug);
        fs.mkdirSync(dir, { recursive: true });
        const html = injectPageMeta(baseHtml, page, origin);
        fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
      }

      const total = options.pages.length + 1; // +1 for the index
      console.log(
        `[prerender-seo] Pre-rendered ${total} SEO pages in ${seoDir}`
      );
    },
  };
}
