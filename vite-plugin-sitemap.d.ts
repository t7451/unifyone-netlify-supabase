// Type declarations for vite-plugin-sitemap.js
import type { Plugin } from "vite";

export interface SitemapRoute {
  path: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  lastmod?: string;
}

export interface SitemapPluginOptions {
  hostname: string;
  outDir: string;
  routes: SitemapRoute[];
}

export function sitemapPlugin(options: SitemapPluginOptions): Plugin;
