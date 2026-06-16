import { describe, it, expect } from "vitest";
import {
  sessionEnd,
  sessionsOverlap,
  isJoinWindowOpen,
  JOIN_WINDOW_MINUTES,
} from "@/lib/services/session";
import { attendanceStatusForMinutes } from "@/lib/services/attendance";
import { computeParticipationScore, countWords } from "@/lib/services/discussion";
import { isZoomConfigured } from "@/lib/zoom/client";
import { verifyZoomWebhookSignature } from "@/lib/zoom/webhook";

describe("session helpers", () => {
  const base = { scheduledStart: new Date("2026-06-15T10:00:00Z"), durationMinutes: 60 };

  it("computes session end", () => {
    expect(sessionEnd(base).toISOString()).toBe("2026-06-15T11:00:00.000Z");
  });

  it("detects overlapping sessions", () => {
    const a = base;
    const b = { scheduledStart: new Date("2026-06-15T10:30:00Z"), durationMinutes: 60 };
    expect(sessionsOverlap(a, b)).toBe(true);
  });

  it("allows non-overlapping sessions", () => {
    const a = base;
    const b = { scheduledStart: new Date("2026-06-15T11:00:00Z"), durationMinutes: 60 };
    expect(sessionsOverlap(a, b)).toBe(false);
  });

  it("opens join window 15 minutes before start", () => {
    const openAt = new Date(base.scheduledStart.getTime() - JOIN_WINDOW_MINUTES * 60_000);
    expect(isJoinWindowOpen(base, openAt)).toBe(true);
    expect(isJoinWindowOpen(base, new Date(openAt.getTime() - 1000))).toBe(false);
  });
});

describe("attendanceStatusForMinutes", () => {
  it("marks present at threshold", () => {
    expect(attendanceStatusForMinutes(36, 60, 60)).toBe("PRESENT");
    expect(attendanceStatusForMinutes(35, 60, 60)).toBe("ABSENT");
  });
});

describe("discussion scoring", () => {
  it("counts words", () => {
    expect(countWords("hello world")).toBe(2);
  });

  it("scores full participation when requirements met", () => {
    const score = computeParticipationScore(
      { isGraded: true, participationMinWords: 10, participationMinPosts: 1, participationMinReplies: null },
      [{ body: "one two three four five six seven eight nine ten", parentPostId: null }],
    );
    expect(score).toBe(100);
  });

  it("returns partial score when some requirements met", () => {
    const score = computeParticipationScore(
      { isGraded: true, participationMinWords: 100, participationMinPosts: 1, participationMinReplies: null },
      [{ body: "short post", parentPostId: null }],
    );
    expect(score).toBe(50);
  });
});

describe("zoom client", () => {
  it("is not configured without env", () => {
    expect(isZoomConfigured()).toBe(false);
  });

  it("allows webhook without secret in dev", () => {
    expect(verifyZoomWebhookSignature("{}", null, null)).toBe(true);
  });
});
