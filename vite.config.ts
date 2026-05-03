import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { SEO_PAGES } from "./client/src/content/seoPages";
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
      // Replace __APP_URL__ in static public files copied to dist
      const outDir = path.resolve(import.meta.dirname, "dist/public");
      for (const file of ["robots.txt", "sitemap.xml"]) {
        const filePath = path.join(outDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          fs.writeFileSync(
            filePath,
            content.replaceAll("__APP_URL__", SITE_HOSTNAME),
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
    // Non-SEO sitemap routes — emit a flat <path>.html for each so crawlers
    // see the page's own canonical/og:url, not the homepage's. Without this,
    // every SPA route inherits index.html's canonical=/ and Ahrefs flags the
    // page as "Non-canonical page in sitemap".
    extraRoutes: [
      { path: "/architecture" },
      { path: "/the-system" },
      { path: "/pricing" },
      { path: "/about" },
      { path: "/contact" },
      { path: "/tithes" },
      { path: "/privacy" },
      { path: "/terms" },
      { path: "/documents" },
      { path: "/documents/case-studies" },
      { path: "/documents/integrations" },
      { path: "/documents/work-proof" },
      { path: "/docs-chat" },
      { path: "/video-production" },
      { path: "/marketing/ad-copy" },
      { path: "/resources" },
      { path: "/sovereign" },
      { path: "/governance" },
      { path: "/themes" },
      { path: "/blog/gig-economy-commerce-platform" },
      { path: "/blog/multi-tenant-ecommerce-saas" },
      { path: "/blog/manus-ai-gig-workers" },
      { path: "/blog/digital-retail-guide" },
    ],
  }),
  sitemapPlugin({
    hostname: SITE_HOSTNAME,
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    routes: [
      { path: "/", changefreq: "weekly", priority: 1.0 },
      { path: "/pricing", changefreq: "weekly", priority: 0.95 },
      { path: "/tithes", changefreq: "weekly", priority: 0.92 },
      { path: "/architecture", changefreq: "monthly", priority: 0.92 },
      { path: "/the-system", changefreq: "monthly", priority: 0.9 },
      { path: "/about", changefreq: "monthly", priority: 0.85 },
      { path: "/documents", changefreq: "monthly", priority: 0.85 },
      {
        path: "/documents/case-studies",
        changefreq: "monthly",
        priority: 0.85,
      },
      {
        path: "/documents/integrations",
        changefreq: "monthly",
        priority: 0.85,
      },
      { path: "/documents/work-proof", changefreq: "monthly", priority: 0.85 },
      { path: "/docs-chat", changefreq: "monthly", priority: 0.8 },
      { path: "/contact", changefreq: "monthly", priority: 0.7 },
      { path: "/video-production", changefreq: "monthly", priority: 0.75 },
      { path: "/marketing/ad-copy", changefreq: "monthly", priority: 0.75 },
      { path: "/resources", changefreq: "monthly", priority: 0.75 },
      { path: "/sovereign", changefreq: "monthly", priority: 0.7 },
      { path: "/governance", changefreq: "monthly", priority: 0.7 },
      { path: "/themes", changefreq: "monthly", priority: 0.65 },
      {
        path: "/blog/gig-economy-commerce-platform",
        changefreq: "monthly",
        priority: 0.9,
      },
      {
        path: "/blog/multi-tenant-ecommerce-saas",
        changefreq: "monthly",
        priority: 0.9,
      },
      {
        path: "/blog/manus-ai-gig-workers",
        changefreq: "monthly",
        priority: 0.9,
      },
      {
        path: "/blog/digital-retail-guide",
        changefreq: "monthly",
        priority: 0.9,
      },
      { path: "/seo", changefreq: "weekly", priority: 0.9 },
      { path: "/seo/unifyone", changefreq: "weekly", priority: 0.95 },
      { path: "/seo/unifyone-solutions", changefreq: "weekly", priority: 0.92 },
      { path: "/seo/unifyone-platform", changefreq: "weekly", priority: 0.9 },
      { path: "/seo/unifyone-commerce", changefreq: "weekly", priority: 0.9 },
      { path: "/seo/unifyone-login", changefreq: "monthly", priority: 0.85 },
      { path: "/seo/unifyone-pricing", changefreq: "weekly", priority: 0.9 },
      { path: "/seo/unifyone-reviews", changefreq: "monthly", priority: 0.85 },
      { path: "/seo/unifone", changefreq: "monthly", priority: 0.85 },
      { path: "/seo/1-commerce", changefreq: "weekly", priority: 0.95 },
      { path: "/seo/1commerce", changefreq: "weekly", priority: 0.95 },
      { path: "/seo/1commerce-llc", changefreq: "weekly", priority: 0.92 },
      { path: "/seo/1commerce-solutions", changefreq: "weekly", priority: 0.9 },
      { path: "/seo/1commerce-login", changefreq: "monthly", priority: 0.85 },
      { path: "/seo/1commerce-pnw", changefreq: "monthly", priority: 0.8 },
      { path: "/seo/onecommerc", changefreq: "monthly", priority: 0.85 },
      { path: "/seo/onecommerce", changefreq: "weekly", priority: 0.9 },
      {
        path: "/seo/onecommerce-platform",
        changefreq: "monthly",
        priority: 0.85,
      },
      {
        path: "/seo/onecommerce-solutions",
        changefreq: "monthly",
        priority: 0.85,
      },
      { path: "/seo/pnw-enterprises", changefreq: "monthly", priority: 0.85 },
      { path: "/seo/pnw-1commerce", changefreq: "monthly", priority: 0.8 },
      {
        path: "/seo/unifyone-vs-shopify",
        changefreq: "monthly",
        priority: 0.85,
      },
      {
        path: "/seo/unifyone-vs-squarespace",
        changefreq: "monthly",
        priority: 0.8,
      },
      {
        path: "/seo/unifyone-multi-tenant-commerce",
        changefreq: "monthly",
        priority: 0.85,
      },
      {
        path: "/seo/unifyone-gig-economy",
        changefreq: "monthly",
        priority: 0.85,
      },
      {
        path: "/seo/unifyone-ai-commerce",
        changefreq: "monthly",
        priority: 0.85,
      },
      { path: "/seo/unifyone-stripe", changefreq: "monthly", priority: 0.8 },
      { path: "/seo/unifyone-paypal", changefreq: "monthly", priority: 0.8 },
      {
        path: "/seo/unifyone-shopify-integration",
        changefreq: "monthly",
        priority: 0.85,
      },
      {
        path: "/seo/unifyone-square-integration",
        changefreq: "monthly",
        priority: 0.8,
      },
      {
        path: "/seo/unifyone-affiliates",
        changefreq: "monthly",
        priority: 0.8,
      },
      { path: "/seo/unifyone-analytics", changefreq: "monthly", priority: 0.8 },
      {
        path: "/seo/unifyone-subscription-billing",
        changefreq: "monthly",
        priority: 0.8,
      },
      {
        path: "/seo/unifyone-gamification",
        changefreq: "monthly",
        priority: 0.75,
      },
      {
        path: "/seo/unifyone-free-trial",
        changefreq: "weekly",
        priority: 0.9,
      },
      {
        path: "/seo/unifyone-enterprise",
        changefreq: "monthly",
        priority: 0.85,
      },
      { path: "/privacy", changefreq: "yearly", priority: 0.3 },
      { path: "/terms", changefreq: "yearly", priority: 0.3 },
    ],
  }),
];

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
