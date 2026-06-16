import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { SEO_PAGES } from "./client/src/content/seoPages";
import { ROUTE_SEO } from "./client/src/content/routeSeo";
import { prerenderSeoPlugin } from "./vite-plugin-prerender-seo";
import { sitemapPlugin } from "./vite-plugin-sitemap";

const SITE_HOSTNAME = (
  process.env.PUBLIC_APP_URL ||
  process.env.APP_URL ||
  process.env.URL ||
  "https://1commerce.online"
).replace(/\/+$/, "");

type SitemapRoute = {
  path: string;
  changefreq:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
};

// Build date stamped on every sitemap entry so crawlers see fresh lastmod on
// each deploy. Matches the format other build-time freshness stamps use.
const BUILD_DATE = new Date().toISOString().slice(0, 10);

// Path prefixes that must never be sitemapped — the canonical source is the
// hand-maintained client/public/robots.txt Disallow list (auth/app/dev/API
// surface). Mirrored here so any route derived from the registries that lands
// under one of these is dropped, keeping the sitemap and robots.txt in sync.
const SITEMAP_DISALLOW_PREFIXES = [
  "/dashboard",
  "/setup",
  "/settings",
  "/products",
  "/orders",
  "/customers",
  "/analytics",
  "/integrations",
  "/team",
  "/billing",
  "/social",
  "/referrals",
  "/leads",
  "/automations",
  "/notifications",
  "/my-themes",
  "/admin",
  "/rewards",
  "/revenue-streams",
  "/affiliates",
  "/shopify",
  "/checkout",
  "/master-control",
  "/revenue-command",
  "/discounts",
  "/clips",
  "/marketing",
  "/gig-worker-plans",
  "/auth",
  "/reset-password",
  "/verify-email",
  "/components",
  "/design-system",
  "/api",
];

function isDisallowed(routePath: string): boolean {
  return SITEMAP_DISALLOW_PREFIXES.some(
    prefix => routePath === prefix || routePath.startsWith(`${prefix}/`)
  );
}

// Assign changefreq/priority by section so the derived sitemap matches the
// hand-tuned weights without per-route bookkeeping.
function classifyRoute(routePath: string): {
  changefreq: SitemapRoute["changefreq"];
  priority: number;
} {
  if (routePath === "/") return { changefreq: "weekly", priority: 1.0 };

  // Pricing + the free tools hub and every individual tool: top conversion
  // value, crawl weekly-to-monthly.
  if (routePath === "/pricing") return { changefreq: "monthly", priority: 0.9 };
  if (routePath === "/tools") return { changefreq: "weekly", priority: 0.9 };
  if (routePath.startsWith("/tools/"))
    return { changefreq: "monthly", priority: 0.9 };

  // Blog index + posts.
  if (routePath === "/blog") return { changefreq: "weekly", priority: 0.8 };
  if (routePath.startsWith("/blog/"))
    return { changefreq: "monthly", priority: 0.8 };

  // /seo guides index and the data-driven /seo/:slug answer pages.
  if (routePath === "/seo") return { changefreq: "weekly", priority: 0.6 };
  if (routePath.startsWith("/seo/"))
    return { changefreq: "monthly", priority: 0.8 };

  // Gig / GEO landing pages and high-intent product pages.
  if (
    routePath === "/about" ||
    routePath === "/contact" ||
    routePath === "/documents" ||
    routePath === "/gig-income-aggregator" ||
    routePath === "/1099-tax-management" ||
    routePath === "/gig-earnings-optimizer" ||
    routePath === "/financial-intelligence-gig-workers" ||
    routePath === "/gig-route-intelligence"
  ) {
    return { changefreq: "monthly", priority: 0.7 };
  }

  // Everything else (legal, docs, secondary marketing, login/register).
  return { changefreq: "monthly", priority: 0.6 };
}

// Single source of truth for the sitemap: the homepage, the guides index, every
// ROUTE_SEO path, and every /seo/:slug page — all derived at config time from
// the same registries that drive prerendering, then filtered against the
// robots.txt Disallow list and deduped. No hand-maintained route list.
const SITEMAP_ROUTES: SitemapRoute[] = (() => {
  const paths = [
    "/",
    "/seo",
    ...ROUTE_SEO.map(r => r.path),
    ...SEO_PAGES.map(p => `/seo/${p.slug}`),
  ];

  const seen = new Set<string>();
  const routes: SitemapRoute[] = [];
  for (const routePath of paths) {
    if (seen.has(routePath)) continue;
    seen.add(routePath);
    if (isDisallowed(routePath)) continue;
    routes.push({ path: routePath, ...classifyRoute(routePath) });
  }
  return routes;
})();

/**
 * Replace __APP_URL__ placeholder in index.html with the resolved site hostname.
 * This allows SEO metadata and structured data (JSON-LD) to use the correct
 * canonical domain at build time without hardcoding.
 */
function vitePluginAppUrl(): Plugin {
  return {
    name: "app-url-replace",
    transformIndexHtml(html) {
      return html.replaceAll("__APP_URL__", SITE_HOSTNAME);
    },
    closeBundle() {
      // Replace __APP_URL__ (and __BUILD_DATE__ for llms.txt freshness) in
      // static public files copied to dist. The build date re-stamps on every
      // deploy so LLM crawlers see a recently-updated llms.txt.
      const outDir = path.resolve(import.meta.dirname, "dist/public");
      const buildDate = new Date().toISOString().split("T")[0];
      for (const file of ["robots.txt", "sitemap.xml", "llms.txt"]) {
        const filePath = path.join(outDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          fs.writeFileSync(
            filePath,
            content
              .replaceAll("__APP_URL__", SITE_HOSTNAME)
              .replaceAll("__BUILD_DATE__", buildDate),
            "utf-8"
          );
        }
      }
    },
  };
}

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  vitePluginAppUrl(),
  prerenderSeoPlugin({
    hostname: SITE_HOSTNAME,
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    pages: SEO_PAGES,
    // Non-SEO sitemap routes — emit a flat <path>.html for each with its own
    // per-route title + meta description (from ROUTE_SEO), so crawlers see
    // accurate, unique meta instead of inheriting the homepage's title and
    // description. Also fixes "Non-canonical page in sitemap" by giving each
    // route its own canonical/og:url.
    extraRoutes: ROUTE_SEO,
  }),
  sitemapPlugin({
    hostname: SITE_HOSTNAME,
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    // Derived from SEO_PAGES + ROUTE_SEO (see SITEMAP_ROUTES above) so the
    // sitemap is always in lockstep with the prerendered routes. lastmod is
    // the build date so every deploy re-stamps freshness.
    routes: SITEMAP_ROUTES.map(r => ({ ...r, lastmod: BUILD_DATE })),
  }),
];

const normalizeChunkId = (id: string) => id.replaceAll("\\", "/");

function manualChunks(id: string): string | undefined {
  const normalizedId = normalizeChunkId(id);

  if (!normalizedId.includes("/node_modules/")) return undefined;

  // Shiki language grammars are lazy-loaded by streamdown. Let Rollup keep
  // those grammar files split by language instead of merging them together.
  if (normalizedId.includes("/node_modules/@shikijs/langs/")) {
    return undefined;
  }

  if (
    normalizedId.includes("/node_modules/react/") ||
    normalizedId.includes("/node_modules/react-dom/") ||
    normalizedId.includes("/node_modules/scheduler/")
  ) {
    return "react-vendor";
  }

  if (
    normalizedId.includes("/node_modules/@tanstack/react-query/") ||
    normalizedId.includes("/node_modules/@trpc/") ||
    normalizedId.includes("/node_modules/superjson/")
  ) {
    return "api-vendor";
  }

  if (normalizedId.includes("/node_modules/@clerk/")) {
    return "auth-vendor";
  }

  if (
    normalizedId.includes("/node_modules/@radix-ui/") ||
    normalizedId.includes("/node_modules/cmdk/") ||
    normalizedId.includes("/node_modules/date-fns/") ||
    normalizedId.includes("/node_modules/input-otp/") ||
    normalizedId.includes("/node_modules/lucide-react/") ||
    normalizedId.includes("/node_modules/next-themes/") ||
    normalizedId.includes("/node_modules/sonner/") ||
    normalizedId.includes("/node_modules/vaul/")
  ) {
    return "ui-vendor";
  }

  if (
    normalizedId.includes("/node_modules/framer-motion/") ||
    normalizedId.includes("/node_modules/motion-dom/") ||
    normalizedId.includes("/node_modules/motion-utils/")
  ) {
    return "animation-vendor";
  }

  if (
    normalizedId.includes("/node_modules/recharts/") ||
    normalizedId.includes("/node_modules/d3-")
  ) {
    return "charts-vendor";
  }

  if (
    normalizedId.includes("/node_modules/@xterm/") ||
    normalizedId.includes("/node_modules/ssh2/")
  ) {
    return "terminal-vendor";
  }

  if (
    normalizedId.includes("/node_modules/@stripe/") ||
    normalizedId.includes("/node_modules/stripe/") ||
    normalizedId.includes("/node_modules/@paypal/")
  ) {
    return "payments-vendor";
  }

  return undefined;
}

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // The largest remaining client chunks are isolated lazy-loaded syntax /
    // diagram renderers. Keep the warning focused on app-shell regressions.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    host: true,
    allowedHosts: [
      ".1commerce.online",
      ".netlify.app",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
