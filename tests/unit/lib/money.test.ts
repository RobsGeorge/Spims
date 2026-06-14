import { describe, it, expect } from "vitest";
import {
  formatMinorUnits,
  toMinorUnits,
  addMinorUnits,
  subtractMinorUnits,
  assertMinorUnits,
  resolveRegionalCurrency,
} from "@/lib/money";

describe("toMinorUnits", () => {
  it("converts 10.99 USD to 1099", () => {
    expect(toMinorUnits(10.99, "USD")).toBe(1099);
  });

  it("converts 100 EGP to 10000", () => {
    expect(toMinorUnits(100, "EGP")).toBe(10000);
  });

  it("handles zero", () => {
    expect(toMinorUnits(0, "USD")).toBe(0);
  });

  it("throws on negative input", () => {
    expect(() => toMinorUnits(-1, "USD")).toThrow();
  });
});

describe("formatMinorUnits", () => {
  it("formats 1099 USD as $10.99", () => {
    const result = formatMinorUnits(1099, "USD");
    expect(result).toContain("10.99");
  });

  it("throws if value is not an integer", () => {
    expect(() => formatMinorUnits(10.5, "USD")).toThrow();
  });
});

describe("addMinorUnits", () => {
  it("adds two amounts", () => {
    expect(addMinorUnits(500, 300)).toBe(800);
  });

  it("throws on negative input", () => {
    expect(() => addMinorUnits(-1, 100)).toThrow();
  });
});

describe("subtractMinorUnits", () => {
  it("subtracts", () => {
    expect(subtractMinorUnits(1000, 400)).toBe(600);
  });

  it("throws on non-integer", () => {
    expect(() => subtractMinorUnits(10.5, 5)).toThrow();
  });
});

describe("assertMinorUnits", () => {
  it("passes for non-negative integers", () => {
    expect(() => assertMinorUnits(0)).not.toThrow();
    expect(() => assertMinorUnits(99999)).not.toThrow();
  });

  it("throws for floats", () => {
    expect(() => assertMinorUnits(1.5)).toThrow();
  });

  it("throws for negatives", () => {
    expect(() => assertMinorUnits(-1)).toThrow();
  });
});

describe("resolveRegionalCurrency", () => {
  it("returns EGP for EG country code", () => {
    expect(resolveRegionalCurrency("EG")).toBe("EGP");
    expect(resolveRegionalCurrency("eg")).toBe("EGP");
  });

  it("returns USD for non-EG codes", () => {
    expect(resolveRegionalCurrency("US")).toBe("USD");
    expect(resolveRegionalCurrency("GB")).toBe("USD");
  });

  it("returns USD for null/undefined", () => {
    expect(resolveRegionalCurrency(null)).toBe("USD");
    expect(resolveRegionalCurrency(undefined)).toBe("USD");
  });
});
