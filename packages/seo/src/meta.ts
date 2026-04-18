const SITE_URL = "https://1commerce.online";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;
const TWITTER_HANDLE = "@unifyone";

export type MetaType = "website" | "article";

export interface MetaInput {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
  type?: MetaType;
}

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface MetaLink {
  rel: string;
  href: string;
  type?: string;
  sizes?: string;
}

export interface BuiltMeta {
  title: string;
  tags: MetaTag[];
  links: MetaLink[];
  canonicalUrl: string;
}

export function buildMeta(input: MetaInput): BuiltMeta {
  const ogImage = input.ogImage ?? DEFAULT_OG_IMAGE;
  const type = input.type ?? "website";

  const tags: MetaTag[] = [
    { name: "description", content: input.description },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:type", content: type },
    { property: "og:url", content: input.canonicalUrl },
    { property: "og:image", content: ogImage },
    { property: "og:site_name", content: "UnifyOne" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: TWITTER_HANDLE },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: ogImage },
    { name: "theme-color", content: "#0B1E3F" },
  ];

  const links: MetaLink[] = [
    { rel: "canonical", href: input.canonicalUrl },
  ];

  return {
    title: input.title,
    tags,
    links,
    canonicalUrl: input.canonicalUrl,
  };
}
