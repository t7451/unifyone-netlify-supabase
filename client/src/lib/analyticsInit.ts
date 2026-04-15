/**
 * Umami analytics — conditional loader.
 *
 * The script is injected at runtime only when both env vars are present,
 * so missing variables produce a true no-op instead of a broken <script src>.
 */
const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;

if (endpoint && websiteId) {
  const script = document.createElement("script");
  script.defer = true;
  script.src = `${endpoint}/umami`;
  script.dataset.websiteId = websiteId;
  document.head.appendChild(script);
}
