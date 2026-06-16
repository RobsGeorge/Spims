import { describe, it, expect } from "vitest";
import {
  assertThemePairsMeetAA,
  contrastRatioFromHsl,
  DEFAULT_AA_PAIRS,
} from "@/lib/a11y/contrast";

describe("contrastRatioFromHsl", () => {
  it("computes ratio for black on white", () => {
    const ratio = contrastRatioFromHsl("0 0% 0%", "0 0% 100%");
    expect(ratio).toBeGreaterThan(20);
  });
});

describe("assertThemePairsMeetAA", () => {
  it("default light theme pairs meet WCAG AA", () => {
    const result = assertThemePairsMeetAA(DEFAULT_AA_PAIRS);
    expect(result.ok).toBe(true);
    expect(result.failures).toHaveLength(0);
  });
});
