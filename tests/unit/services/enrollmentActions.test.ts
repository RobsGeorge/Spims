import { describe, it, expect, vi, beforeEach } from "vitest";
import { EnrollmentStatus, OfferingMode } from "@prisma/client";

const mockDb = vi.hoisted(() => ({
  courseOffering: { findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({
  withAudit: vi.fn(async (_ctx: unknown, mutation: (tx: typeof mockDb) => Promise<unknown>) =>
    mutation(mockDb),
  ),
}));
vi.mock("@/lib/services/enrollmentRules", () => ({
  evaluateEnrollmentRules: vi.fn(),
  isWithinAddDropWeek: vi.fn((start: Date, endWeek: number, now: Date) => {
    const ms = now.getTime() - start.getTime();
    const week = Math.max(1, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1);
    return week <= endWeek;
  }),
  isWithinWithdrawalWeek: vi.fn((start: Date, lastWeek: number, now: Date) => {
    const ms = now.getTime() - start.getTime();
    const week = Math.max(1, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1);
    return week <= lastWeek;
  }),
}));
vi.mock("@/lib/services/offering", () => ({
  resolveOfferingPricing: vi.fn(),
}));
vi.mock("@/lib/services/wallet", () => ({
  creditWallet: vi.fn(),
}));

import {
  listEnrollmentConsole,
  resolveEnrollmentAction,
} from "@/lib/services/enrollment";

beforeEach(() => vi.clearAllMocks());

describe("resolveEnrollmentAction", () => {
  it("returns drop during add/drop window for cohort enrollments", () => {
    const start = new Date();
    start.setDate(start.getDate() - 3);
    const actual = resolveEnrollmentAction({
      status: EnrollmentStatus.ENROLLED,
      offering: {
        mode: OfferingMode.COHORT,
        semester: { startDate: start, addDropEndWeek: 2, lastWithdrawalWeek: 8 },
      },
    });
    expect(actual).toBe("drop");
  });

  it("returns withdraw after add/drop and within withdrawal window", () => {
    const start = new Date();
    start.setDate(start.getDate() - 21);
    const actual = resolveEnrollmentAction({
      status: EnrollmentStatus.ENROLLED,
      offering: {
        mode: OfferingMode.COHORT,
        semester: { startDate: start, addDropEndWeek: 1, lastWithdrawalWeek: 8 },
      },
    });
    expect(actual).toBe("withdraw");
  });

  it("returns drop for self-paced enrollments", () => {
    const actual = resolveEnrollmentAction({
      status: EnrollmentStatus.WAITLISTED,
      offering: { mode: OfferingMode.SELF_PACED, semester: null },
    });
    expect(actual).toBe("drop");
  });

  it("returns null for completed enrollments", () => {
    const actual = resolveEnrollmentAction({
      status: EnrollmentStatus.COMPLETED,
      offering: { mode: OfferingMode.SELF_PACED, semester: null },
    });
    expect(actual).toBeNull();
  });
});

describe("listEnrollmentConsole", () => {
  it("aggregates enrolled and waitlist counts with FIFO preview", async () => {
    mockDb.courseOffering.findMany.mockResolvedValue([
      {
        id: "off-1",
        mode: "COHORT",
        seatCapacity: 2,
        course: { id: "c1", code: "TH101", title: "Intro" },
        semester: { id: "s1", name: "Fall" },
        enrollments: [
          {
            id: "e1",
            status: "ENROLLED",
            enrolledAt: new Date("2026-01-01"),
            student: { id: "u1", email: "a@test.com", firstName: "A", lastName: "One" },
          },
          {
            id: "e2",
            status: "WAITLISTED",
            enrolledAt: new Date("2026-01-02"),
            student: { id: "u2", email: "b@test.com", firstName: "B", lastName: "Two" },
          },
          {
            id: "e3",
            status: "WAITLISTED",
            enrolledAt: new Date("2026-01-03"),
            student: { id: "u3", email: "c@test.com", firstName: "C", lastName: "Three" },
          },
        ],
      },
    ]);

    const actual = await listEnrollmentConsole();
    expect(actual).toHaveLength(1);
    expect(actual[0]?.enrolledCount).toBe(1);
    expect(actual[0]?.waitlistCount).toBe(2);
    expect(actual[0]?.waitlist[0]?.student.email).toBe("b@test.com");
  });
});
