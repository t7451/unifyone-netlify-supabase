import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import netlify from "@astrojs/netlify";

// Sitemap is served by the manual endpoint at src/pages/sitemap.xml.ts
// (uses @1commerce/seo, includes blog collection). Do not re-add
// @astrojs/sitemap — two competing sitemap files caused ambiguity.
export default defineConfig({
  site: "https://marketing.1commerce.online",
  // Astro 5 removed `output: "hybrid"`. The new default `static` is the
  // direct equivalent: pages are pre-rendered unless they opt in to
  // on-demand rendering via `export const prerender = false` (already set
  // on the API routes in src/pages/api/*).
  output: "static",
  adapter: netlify(),
  integrations: [react(), tailwind({ applyBaseStyles: false }), mdx()],
  // Auth lives on the legacy app at 1commerce.online (custom JWT, not Clerk).
  // These two routes preserve any inbound /sign-in or /sign-up links from
  // old marketing copy and forward them to the real login/signup pages.
  // Using the redirects config (not Astro.redirect() in a .astro file) so
  // the Netlify adapter emits real HTTP 302 rules — meta-refresh HTML has
  // a noticeable delay and isn't crawler-friendly.
  redirects: {
    "/sign-in": { status: 302, destination: "https://1commerce.online/login" },
    "/sign-up": {
      status: 302,
      destination: "https://1commerce.online/signup",
    },
  },
});
