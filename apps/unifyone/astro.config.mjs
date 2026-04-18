import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import netlify from "@astrojs/netlify";
import clerk from "@clerk/astro";

export default defineConfig({
  site: "https://1commerce.online",
  output: "hybrid",
  adapter: netlify(),
  integrations: [
    clerk(),
    react(),
    tailwind({ applyBaseStyles: false }),
    mdx(),
    sitemap({
      filter: (page) =>
        !page.includes("/api/") &&
        !page.includes("/sign-in") &&
        !page.includes("/sign-up"),
    }),
  ],
  vite: {
    ssr: {
      noExternal: ["@clerk/astro"],
    },
  },
});
