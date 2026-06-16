/** True when the user prefers reduced motion (SSR-safe default: false). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Duration in seconds — zero when reduced motion is preferred. */
export function motionDuration(seconds: number): number {
  return prefersReducedMotion() ? 0 : seconds;
}

/** Spring config that collapses to instant when reduced motion is preferred. */
export function motionTransition(fallback = { duration: 0.2 }) {
  if (prefersReducedMotion()) return { duration: 0 };
  return fallback;
}
