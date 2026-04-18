import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { buildSitemapXml, type SitemapUrl } from "@1commerce/seo";

const DEFAULT_SITE = "https://1commerce.online";

function resolveSiteUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_SITE;
  try {
    return new URL(value).origin.replace(/\/$/, "");
  } catch {
    return DEFAULT_SITE;
  }
}

const SITE = resolveSiteUrl(import.meta.env.PUBLIC_SITE_URL);

const STATIC_ROUTES: SitemapUrl[] = [
  { loc: `${SITE}/`, changefreq: "weekly", priority: 1.0 },
  { loc: `${SITE}/pricing`, changefreq: "weekly", priority: 0.9 },
  { loc: `${SITE}/gig-workers`, changefreq: "weekly", priority: 0.8 },
  { loc: `${SITE}/freelancers`, changefreq: "weekly", priority: 0.8 },
  { loc: `${SITE}/smb`, changefreq: "weekly", priority: 0.8 },
  { loc: `${SITE}/developers`, changefreq: "weekly", priority: 0.8 },
  { loc: `${SITE}/blog`, changefreq: "weekly", priority: 0.7 },
];

export const GET: APIRoute = async () => {
  const posts = await getCollection(
    "blog",
    ({ data }: CollectionEntry<"blog">) => !data.draft
  );
  const postUrls: SitemapUrl[] = posts.map((p: CollectionEntry<"blog">) => ({
    loc: `${SITE}/blog/${p.slug}`,
    lastmod: (p.data.updatedAt ?? p.data.publishedAt)
      .toISOString()
      .slice(0, 10),
    changefreq: "monthly",
    priority: 0.6,
  }));

  const xml = buildSitemapXml([...STATIC_ROUTES, ...postUrls]);
  return new Response(xml, {
    status: 200,
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};
