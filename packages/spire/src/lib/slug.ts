// Deterministic slug generator — never produces Unicode garbage or empty string.
// Matches Astro's content collection expectations (lowercase, hyphen-separated).

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "and",
  "or",
  "but",
  "is",
  "are",
  "was",
  "were",
  "be",
]);

export function slugify(
  input: string,
  options?: { maxLength?: number; stripStopWords?: boolean }
): string {
  const maxLength = options?.maxLength ?? 80;
  const stripStop = options?.stripStopWords ?? false;

  const ascii = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase();

  let parts = ascii
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(p => p.length > 0);

  if (stripStop) {
    parts = parts.filter(p => !STOP_WORDS.has(p));
    if (parts.length === 0) {
      // Don't leave the slug empty just because every word was a stop word.
      parts = ascii
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter(p => p.length > 0);
    }
  }

  const joined = parts
    .join("-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (joined.length === 0) {
    // Input was pure punctuation / emoji. Fall back to a hash so we never
    // write an empty-string slug into the DB's unique index.
    return "post-" + simpleHash(input);
  }
  return joined.length > maxLength
    ? joined.slice(0, maxLength).replace(/-+$/, "")
    : joined;
}

// FNV-1a 32-bit — deterministic, short, no crypto needed (slug collision only
// matters within a single site_id and the unique index catches real dupes).
function simpleHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
