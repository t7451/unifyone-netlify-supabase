export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
}

export function buildSitemapXml(urls: SitemapUrl[]): string {
  const body = urls
    .map(u => {
      const parts = [`    <loc>${escapeXml(u.loc)}</loc>`];
      if (u.lastmod)
        parts.push(`    <lastmod>${escapeXml(u.lastmod)}</lastmod>`);
      if (u.changefreq)
        parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (u.priority !== undefined) {
        if (!Number.isFinite(u.priority)) {
          throw new RangeError(
            "sitemap priority must be a finite number between 0 and 1"
          );
        }
        const clamped = Math.min(1, Math.max(0, u.priority));
        parts.push(`    <priority>${clamped.toFixed(1)}</priority>`);
      }
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

function escapeXml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
