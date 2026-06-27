import { cn } from "@/lib/utils";

/**
 * Spims brand mark — a burgundy tile carrying a clean Greek cross in gold.
 * Reverence through restraint (DESIGN.md): a geometric monogram, never a
 * skeuomorphic gold-leaf or Byzantine ornament.
 */
export function BrandMark({
  className,
  ariaHidden = true,
}: {
  className?: string;
  ariaHidden?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-primary text-gold shadow-soft",
        "h-10 w-10",
        className,
      )}
      aria-hidden={ariaHidden}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="currentColor"
        role="presentation"
      >
        {/* Greek cross, equal arms, gently rounded */}
        <rect x="10.4" y="3.5" width="3.2" height="17" rx="1.1" />
        <rect x="3.5" y="10.4" width="17" height="3.2" rx="1.1" />
      </svg>
    </span>
  );
}
