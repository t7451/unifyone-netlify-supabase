// Shared Tailwind class tokens for outline-style status badges used across the
// analytics panels. Strings are byte-identical to the original inline copies so
// rendering is unchanged.

/** Neutral / default outline badge (muted border + faint fill + gray text). */
export const BADGE_NEUTRAL = "border-white/10 bg-white/5 text-gray-300";

/** Positive / "good" highlight badge. */
export const BADGE_EMERALD =
  "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

/** Negative / "warning" highlight badge. */
export const BADGE_ROSE = "border-rose-500/30 bg-rose-500/10 text-rose-300";
