import type { CSSProperties } from "react";
import "./brand.css";

/** Framed geometry from the 1Commerce emblem, with an open U and a central one. */
export function BrandMark({
  size = 40,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      data-brand-mark="unifyone"
      className={`brand-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      <rect
        x="4.5"
        y="4.5"
        width="39"
        height="39"
        rx="2"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M12.5 12.5V27.5C12.5 33.5 17 36 24 36C31 36 35.5 33.5 35.5 27.5V12.5"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M20 17L25 13V35M14 22H34"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function BrandLockup({
  size = 40,
  className = "",
  byline = true,
}: {
  size?: number;
  className?: string;
  byline?: boolean;
}) {
  return (
    <span className={`brand-lockup ${className}`}>
      <BrandMark size={size} />
      <span className="brand-lockup-type">
        <span className="brand-wordmark">
          Unify<span>One</span>
        </span>
        {byline && <span className="brand-byline">by 1Commerce</span>}
      </span>
    </span>
  );
}
