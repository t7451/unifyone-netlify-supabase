import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import netlify from "@astrojs/netlify";
import clerk from "@clerk/astro";

// Sitemap is served by the manual endpoint at src/pages/sitemap.xml.ts
// (uses @1commerce/seo, includes blog collection). Do not re-add
// @astrojs/sitemap — two competing sitemap files caused ambiguity.
export default defineConfig({
  site: "https://1commerce.online",
  // Astro 5 removed `output: "hybrid"`. The new default `static` is the
  // direct equivalent: pages are pre-rendered unless they opt in to
  // on-demand rendering via `export const prerender = false` (already set
  // on the API routes in src/pages/api/*).
  output: "static",
  adapter: netlify(),
  integrations: [
    clerk(),
    react(),
    tailwind({ applyBaseStyles: false }),
    mdx(),
  ],
  vite: {
    ssr: {
      noExternal: ["@clerk/astro"],
    },
  },
});
