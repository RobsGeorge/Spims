import { describe, it, expect } from "vitest";
import { computeWeightedGpa } from "@/lib/services/grading";

describe("computeWeightedGpa", () => {
  it("weights by credit hours", () => {
    const gpa = computeWeightedGpa([
      { gpaPoints: 4, creditHours: 3 },
      { gpaPoints: 2, creditHours: 1 },
    ]);
    expect(gpa).toBe(3.5);
  });

  it("returns null when no credits", () => {
    expect(computeWeightedGpa([])).toBeNull();
  });
});
