/**
 * Canonical site URL used for SEO metadata (canonical links, JSON-LD, OG tags).
 * Resolved at build time via VITE_APP_URL, or falls back to 1commerce.online.
 */
export const SITE_URL = (import.meta.env.VITE_APP_URL || 'https://1commerce.online').replace(/\/+$/, '');
