export {
  organization,
  website,
  article,
  faqPage,
  breadcrumb,
  buildMeta,
} from "@1commerce/seo";
export type {
  ArticlePost,
  FaqItem,
  BreadcrumbItem,
  MetaInput,
  BuiltMeta,
} from "@1commerce/seo";

export const SITE_URL = "https://marketing.1commerce.online";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

export function canonical(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}
