import { useEffect, useRef } from "react";

/**
 * useScrollReveal
 *
 * Attaches an IntersectionObserver to a container ref. When a child element
 * with the `data-reveal` attribute enters the viewport, the hook adds the
 * `reveal-visible` class (which triggers the animate-rise keyframe defined in
 * index.css). Stagger delay is applied via the `data-reveal-delay` attribute
 * (value in milliseconds, e.g. data-reveal-delay="200").
 *
 * Usage:
 *   const containerRef = useScrollReveal();
 *   <div ref={containerRef}>
 *     <div data-reveal data-reveal-delay="0">First item</div>
 *     <div data-reveal data-reveal-delay="100">Second item</div>
 *   </div>
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.12
) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect prefers-reduced-motion — skip observer entirely
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      // Make all items immediately visible
      container
        .querySelectorAll<HTMLElement>("[data-reveal]")
        .forEach((el) => {
          el.classList.add("reveal-visible");
        });
      return;
    }

    // Set initial hidden state on all reveal targets
    container
      .querySelectorAll<HTMLElement>("[data-reveal]")
      .forEach((el) => {
        el.classList.add("reveal-hidden");
      });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = parseInt(el.dataset.revealDelay ?? "0", 10);
          setTimeout(() => {
            el.classList.remove("reveal-hidden");
            el.classList.add("reveal-visible");
          }, delay);
          // Unobserve after reveal — animate once
          observer.unobserve(el);
        });
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    container
      .querySelectorAll<HTMLElement>("[data-reveal]")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [threshold]);

  return containerRef;
}
