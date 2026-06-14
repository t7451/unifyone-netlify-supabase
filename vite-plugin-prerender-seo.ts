/**
 * vite-plugin-prerender-seo.ts
 *
 * Generates a static html file for every SEO landing page at build time so
 * crawlers receive fully-formed meta tags — title, description, canonical,
 * Open Graph, Twitter Card, and JSON-LD — in the initial HTTP response
 * rather than waiting for JavaScript hydration.
 *
 * Output layout (all inside Vite's build.outDir):
 *   seo.html                  → /seo
 *   seo/<slug>.html           → /seo/<slug>    (one file per SeoPage)
 *   <route>.html              → /<route>       (one file per extraRoute)
 *
 * Flat .html files (NOT directory/index.html) are used so that Netlify's
 * pretty_urls behavior keeps the trailing-slash-free URL canonical, matching
 * the canonical link tag and sitemap entries. Directory/index.html files
 * cause Netlify to canonicalize with a trailing slash, which forces a 301
 * redirect from the slug-without-slash URL — Ahrefs flags that as
 * "Canonical points to redirect" and "3XX redirect in sitemap".
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

export interface PrerenderExtraRoute {
  /** URL path, e.g. "/pricing" or "/blog/digital-retail-guide". Use "/" for home. */
  path: string;
  /** Optional: override <title> for this route */
  title?: string;
  /** Optional: override <meta name="description"> for this route */
  description?: string;
  /** Optional: explicit <h1>. Defaults to the title before " | ". */
  h1?: string;
  /** Optional: body paragraphs rendered into the prerendered <main>. */
  body?: string[];
}

export interface PrerenderSeoOptions {
  /** Full origin, e.g. "https://1commerce.online" */
  hostname: string;
  /** Absolute path to Vite's build.outDir (where index.html lives) */
  outDir: string;
  /** Array of SEO page definitions imported from seoPages.ts */
  pages: SeoPage[];
  /**
   * Additional routes (non-SEO landing pages) that need a static HTML file
   * so crawlers see a per-route canonical/og:url instead of the homepage's.
   * Used to fix Ahrefs "Non-canonical page in sitemap" issues for SPA routes.
   */
  extraRoutes?: PrerenderExtraRoute[];
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

function pageJsonLdScripts(
  page: SeoPage,
  canonical: string,
  origin: string
): string {
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
      mainEntity: page.faq.map(item => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
  }

  return schemas
    .map(
      s =>
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
      s =>
        `  <script type="application/ld+json">\n  ${safeJsonStringify(s)}\n  </script>`
    )
    .join("\n");
}

// ── Per-page HTML injection ───────────────────────────────────────────────

function injectPageMeta(
  baseHtml: string,
  page: SeoPage,
  origin: string
): string {
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
  const title = "UnifyOne Guides — 1Commerce, UnifOne, OneCommerce, 1-Commerce";
  const description =
    "Complete index of UnifyOne guides covering every brand variation operators search for — UnifyOne, UnifOne, 1Commerce, OneCommerce, and UnifyOne Solutions.";
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

function injectExtraRouteMeta(
  baseHtml: string,
  route: PrerenderExtraRoute,
  origin: string
): string {
  const canonical = `${origin}${route.path === "/" ? "/" : route.path}`;
  let html = baseHtml;

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

  if (route.title) {
    html = replaceAttr(
      html,
      /<title>[^<]*<\/title>/,
      `<title>${esc(route.title)}</title>`
    );
    html = replaceAttr(
      html,
      /<meta property="og:title" content="[^"]*"/,
      `<meta property="og:title" content="${esc(route.title)}"`
    );
    html = replaceAttr(
      html,
      /<meta name="twitter:title" content="[^"]*"/,
      `<meta name="twitter:title" content="${esc(route.title)}"`
    );
  }

  if (route.description) {
    html = replaceAttr(
      html,
      /<meta name="description" content="[^"]*"/,
      `<meta name="description" content="${esc(route.description)}"`
    );
    html = replaceAttr(
      html,
      /<meta property="og:description" content="[^"]*"/,
      `<meta property="og:description" content="${esc(route.description)}"`
    );
    html = replaceAttr(
      html,
      /<meta name="twitter:description" content="[^"]*"/,
      `<meta name="twitter:description" content="${esc(route.description)}"`
    );
  }

  return html;
}

/** Headline for a route: explicit h1, else the title before " | ". */
function routeHeadline(route: PrerenderExtraRoute): string {
  if (route.h1) return route.h1;
  return (route.title ?? "").split(" | ")[0].trim() || "UnifyOne";
}

/**
 * Build the per-route pre-hydration <main> body. Gives each non-SEO route its
 * own crawler-visible content (unique h1 + paragraphs) and a static internal-
 * links nav (keyword-rich anchors to every other route + the guides index), so
 * no-JS crawlers see real content and internal links instead of the homepage's.
 * React replaces this on hydration, so it only affects crawlers / no-JS users.
 */
function buildExtraRouteMain(
  route: PrerenderExtraRoute,
  allRoutes: PrerenderExtraRoute[]
): string {
  const h1 = routeHeadline(route);
  const paras = (
    route.body && route.body.length
      ? route.body
      : route.description
        ? [route.description]
        : []
  )
    .map(p => `        <p>${esc(p)}</p>`)
    .join("\n");

  const links = allRoutes
    .filter(r => r.path !== route.path)
    .map(
      r => `          <li><a href="${r.path}">${esc(routeHeadline(r))}</a></li>`
    )
    .join("\n");

  return `<main id="seo-prerender">
        <h1>${esc(h1)}</h1>
${paras}
        <nav aria-label="Explore UnifyOne">
          <h2>Explore UnifyOne</h2>
          <ul>
${links}
            <li><a href="/seo">All UnifyOne guides</a></li>
            <li><a href="/">UnifyOne home</a></li>
          </ul>
        </nav>
      </main>`;
}

function injectExtraRouteBody(
  html: string,
  route: PrerenderExtraRoute,
  allRoutes: PrerenderExtraRoute[]
): string {
  return html.replace(/<main id="seo-prerender">[\s\S]*?<\/main>/, () =>
    buildExtraRouteMain(route, allRoutes)
  );
}

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

      // /seo  → seo.html (flat file; pretty_urls makes it canonical without trailing slash)
      const seoIndexHtml = buildSeoIndexHtml(baseHtml, origin);
      fs.writeFileSync(
        path.join(options.outDir, "seo.html"),
        seoIndexHtml,
        "utf-8"
      );

      // /seo/:slug → seo/<slug>.html (flat files inside seo/ directory)
      const seoDir = path.join(options.outDir, "seo");
      fs.mkdirSync(seoDir, { recursive: true });
      for (const page of options.pages) {
        const html = injectPageMeta(baseHtml, page, origin);
        fs.writeFileSync(path.join(seoDir, `${page.slug}.html`), html, "utf-8");
      }

      // Extra routes (non-SEO sitemap pages): write flat <route>.html with
      // proper canonical so crawlers stop seeing the homepage canonical.
      const extras = options.extraRoutes ?? [];
      for (const route of extras) {
        if (route.path === "/" || route.path === "") continue; // homepage already canonical
        const cleanPath = route.path.replace(/^\/+|\/+$/g, "");
        if (!cleanPath) continue;
        const filePath = path.join(options.outDir, `${cleanPath}.html`);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        let html = injectExtraRouteMeta(baseHtml, route, origin);
        html = injectExtraRouteBody(html, route, extras);
        fs.writeFileSync(filePath, html, "utf-8");
      }

      const total = options.pages.length + 1 + extras.length;
      console.log(
        `[prerender-seo] Pre-rendered ${total} pages (1 SEO index + ${options.pages.length} SEO pages + ${extras.length} extra routes)`
      );
    },
  };
}
