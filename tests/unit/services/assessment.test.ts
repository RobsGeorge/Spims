import { describe, it, expect } from "vitest";
import { scoreFromAttempts, computeDueAt } from "@/lib/services/assessment";

describe("assessment helpers", () => {
  it("scoreFromAttempts HIGHEST picks max", () => {
    const score = scoreFromAttempts(
      [
        { totalScore: 70, submittedAt: new Date("2026-01-01"), attemptNo: 1 },
        { totalScore: 90, submittedAt: new Date("2026-01-02"), attemptNo: 2 },
      ],
      "HIGHEST",
    );
    expect(score).toBe(90);
  });

  it("scoreFromAttempts AVERAGE averages scores", () => {
    const score = scoreFromAttempts(
      [
        { totalScore: 80, submittedAt: new Date(), attemptNo: 1 },
        { totalScore: 60, submittedAt: new Date(), attemptNo: 2 },
      ],
      "AVERAGE",
    );
    expect(score).toBe(70);
  });

  it("computeDueAt uses minimum of limit and close", () => {
    const started = new Date("2026-06-01T10:00:00Z");
    const closes = new Date("2026-06-01T10:30:00Z");
    const due = computeDueAt({ timeLimitMinutes: 60, closesAt: closes }, started);
    expect(due.getTime()).toBe(closes.getTime());
  });
});
