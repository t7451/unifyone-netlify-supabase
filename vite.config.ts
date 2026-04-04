import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
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
  sitemapPlugin({
    hostname: SITE_HOSTNAME,
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    routes: [
      { path: "/", changefreq: "weekly", priority: 1.0 },
      { path: "/platform", changefreq: "monthly", priority: 0.9 },
      { path: "/pricing", changefreq: "monthly", priority: 0.9 },
      { path: "/cathedral-framework", changefreq: "monthly", priority: 0.8 },
      {
        path: "/blog/gig-economy-commerce-platform",
        changefreq: "weekly",
        priority: 0.7,
      },
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
