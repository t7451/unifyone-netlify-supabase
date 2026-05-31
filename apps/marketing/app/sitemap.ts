import type { MetadataRoute } from "next";

const ROUTES = [
  "",
  "/features",
  "/pricing",
  "/integrations",
  "/solutions",
  "/how-it-works",
  "/blog",
  "/contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://1commerce.online";
  return ROUTES.map((r) => ({
    url: `${base}${r}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: r === "" ? 1 : 0.7,
  }));
}
