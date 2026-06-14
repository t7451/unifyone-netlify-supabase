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
    routes: [
      { path: "/", changefreq: "weekly", priority: 1.0, lastmod: "2026-05-06" },
      {
        path: "/pricing",
        changefreq: "monthly",
        priority: 0.9,
        lastmod: "2026-05-06",
      },
      {
        path: "/about",
        changefreq: "monthly",
        priority: 0.7,
        lastmod: "2026-05-06",
      },
      {
        path: "/contact",
        changefreq: "monthly",
        priority: 0.7,
        lastmod: "2026-05-06",
      },
      {
        path: "/architecture",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
      {
        path: "/the-system",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
      {
        path: "/manus-ai",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
      {
        path: "/tithes",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
      {
        path: "/documents",
        changefreq: "monthly",
        priority: 0.7,
        lastmod: "2026-05-06",
      },
      {
        path: "/documents/case-studies",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
      {
        path: "/documents/integrations",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
      {
        path: "/documents/work-proof",
        changefreq: "monthly",
        priority: 0.5,
        lastmod: "2026-05-06",
      },
      {
        path: "/tools",
        changefreq: "weekly",
        priority: 0.9,
        lastmod: "2026-06-13",
      },
      {
        path: "/blog",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: "2026-06-13",
      },
      {
        path: "/blog/gig-worker-shift-intelligence",
        changefreq: "weekly",
        priority: 0.9,
        lastmod: "2026-06-13",
      },
      {
        path: "/tools/mileage-deduction-calculator",
        changefreq: "monthly",
        priority: 0.9,
        lastmod: "2026-06-13",
      },
      {
        path: "/tools/quarterly-tax-estimator",
        changefreq: "monthly",
        priority: 0.9,
        lastmod: "2026-06-13",
      },
      {
        path: "/tools/earnings-consolidator",
        changefreq: "monthly",
        priority: 0.9,
        lastmod: "2026-06-13",
      },
      {
        path: "/tools/reseller-break-even",
        changefreq: "monthly",
        priority: 0.9,
        lastmod: "2026-06-13",
      },
      {
        path: "/tools/cashflow-tracker",
        changefreq: "monthly",
        priority: 0.9,
        lastmod: "2026-06-13",
      },
      {
        path: "/tools/se-tax-calculator",
        changefreq: "monthly",
        priority: 0.9,
        lastmod: "2026-06-13",
      },
      {
        path: "/tools/gig-hourly-rate",
        changefreq: "monthly",
        priority: 0.9,
        lastmod: "2026-06-13",
      },
      {
        path: "/tools/tax-set-aside",
        changefreq: "monthly",
        priority: 0.9,
        lastmod: "2026-06-13",
      },
      {
        path: "/gig-income-aggregator",
        changefreq: "monthly",
        priority: 0.8,
        lastmod: "2026-06-13",
      },
      {
        path: "/1099-tax-management",
        changefreq: "monthly",
        priority: 0.8,
        lastmod: "2026-06-13",
      },
      {
        path: "/gig-earnings-optimizer",
        changefreq: "monthly",
        priority: 0.8,
        lastmod: "2026-06-13",
      },
      {
        path: "/financial-intelligence-gig-workers",
        changefreq: "monthly",
        priority: 0.8,
        lastmod: "2026-06-13",
      },
      {
        path: "/gig-route-intelligence",
        changefreq: "monthly",
        priority: 0.8,
        lastmod: "2026-06-13",
      },
      {
        path: "/blog/gig-economy-commerce-platform",
        changefreq: "monthly",
        priority: 0.8,
        lastmod: "2026-05-06",
      },
      {
        path: "/blog/multi-tenant-ecommerce-saas",
        changefreq: "monthly",
        priority: 0.8,
        lastmod: "2026-05-06",
      },
      {
        path: "/blog/manus-ai-gig-workers",
        changefreq: "monthly",
        priority: 0.8,
        lastmod: "2026-05-06",
      },
      {
        path: "/blog/digital-retail-guide",
        changefreq: "monthly",
        priority: 0.8,
        lastmod: "2026-05-06",
      },
      {
        path: "/privacy",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
      {
        path: "/terms",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
      {
        path: "/themes",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
      {
        path: "/docs-chat",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
      {
        path: "/resources",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
      {
        path: "/sovereign",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
      {
        path: "/design-system",
        changefreq: "monthly",
        priority: 0.5,
        lastmod: "2026-05-18",
      },
      {
        path: "/login",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
      {
        path: "/register",
        changefreq: "monthly",
        priority: 0.6,
        lastmod: "2026-05-06",
      },
    ],
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
