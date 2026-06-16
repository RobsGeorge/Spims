import { describe, it, expect } from "vitest";
import {
  applyLatePenalty,
  daysLate,
  penaltyPercentForDays,
  DEFAULT_LATE_PENALTY_TIERS,
} from "@/lib/services/latePenalty";

describe("latePenalty", () => {
  it("daysLate returns 0 when on time", () => {
    const due = new Date("2026-01-10T12:00:00Z");
    const submitted = new Date("2026-01-10T11:00:00Z");
    expect(daysLate(due, submitted)).toBe(0);
  });

  it("escalates penalty by tier", () => {
    expect(penaltyPercentForDays(0, DEFAULT_LATE_PENALTY_TIERS)).toBe(0);
    expect(penaltyPercentForDays(2, DEFAULT_LATE_PENALTY_TIERS)).toBe(5);
    expect(penaltyPercentForDays(5, DEFAULT_LATE_PENALTY_TIERS)).toBe(10);
    expect(penaltyPercentForDays(10, DEFAULT_LATE_PENALTY_TIERS)).toBe(25);
  });

  it("applyLatePenalty reduces score", () => {
    const due = new Date("2026-01-01T00:00:00Z");
    const submitted = new Date("2026-01-05T00:00:00Z");
    const { finalScore, isLate } = applyLatePenalty(
      100,
      due,
      submitted,
      DEFAULT_LATE_PENALTY_TIERS,
    );
    expect(isLate).toBe(true);
    expect(finalScore).toBe(90);
  });

  it("override percent replaces tiers", () => {
    const due = new Date("2026-01-01T00:00:00Z");
    const submitted = new Date("2026-01-02T00:00:00Z");
    const { finalScore } = applyLatePenalty(80, due, submitted, DEFAULT_LATE_PENALTY_TIERS, 20);
    expect(finalScore).toBe(64);
  });
});
