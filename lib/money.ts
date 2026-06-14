// All money is stored and passed as INTEGER MINOR UNITS (piastres / cents).
// Never use floats for money. Never convert between currencies.

export type Currency = "EGP" | "USD";

/** Format minor units for display. Does NOT convert — display only. */
export function formatMinorUnits(amountMinor: number, currency: Currency): string {
  if (!Number.isInteger(amountMinor)) {
    throw new Error(`Money must be integer minor units, got: ${amountMinor}`);
  }
  const major = amountMinor / 100;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(major);
}

/** Convert a decimal major-unit input (from a form) to integer minor units. */
export function toMinorUnits(majorUnits: number, currency: Currency): number {
  if (!isFinite(majorUnits) || majorUnits < 0) {
    throw new Error(`Invalid major units: ${majorUnits}`);
  }
  // Round to avoid IEEE-754 drift: 10.99 * 100 can give 1098.9999...
  const minor = Math.round(majorUnits * 100);
  if (!Number.isInteger(minor)) {
    throw new Error(`Cannot convert ${majorUnits} ${currency} to safe minor units`);
  }
  return minor;
}

/** Add two amounts in the same currency. Both must be minor units. */
export function addMinorUnits(a: number, b: number): number {
  assertMinorUnits(a);
  assertMinorUnits(b);
  return a + b;
}

/** Subtract. Result clamped to ≥ 0 is caller's responsibility. */
export function subtractMinorUnits(a: number, b: number): number {
  assertMinorUnits(a);
  assertMinorUnits(b);
  return a - b;
}

/** Assert that a value is a safe non-negative integer (minor units). */
export function assertMinorUnits(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Expected non-negative integer minor units, got: ${value}`);
  }
}

/** Resolve regional currency: Egypt => EGP, everywhere else => USD. */
export function resolveRegionalCurrency(countryCode: string | null | undefined): Currency {
  return countryCode?.toUpperCase() === "EG" ? "EGP" : "USD";
}
