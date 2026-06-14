import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  week: { findUnique: vi.fn() },
  enrollment: { findFirst: vi.fn() },
  weekProgress: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  academicRecord: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({
  withAudit: vi.fn(async (_ctx: unknown, mutation: (tx: typeof mockDb) => Promise<unknown>) =>
    mutation(mockDb),
  ),
}));
vi.mock("@/lib/services/offering", () => ({
  studentHasPassedCourse: vi.fn(async () => false),
}));

import { getCompletedWeekNumbers, markWeekComplete } from "@/lib/services/weekProgress";
import { AppError } from "@/lib/errors";

const STUDENT = {
  id: "stu-1",
  email: "s@test.com",
  firstName: "Stu",
  lastName: "Dent",
  roles: ["STUDENT" as const],
  preferredLocale: "en",
  countryCode: null,
};

beforeEach(() => vi.clearAllMocks());

describe("weekProgress service", () => {
  it("getCompletedWeekNumbers returns sorted week numbers", async () => {
    mockDb.weekProgress.findMany.mockResolvedValue([
      { week: { number: 2 } },
      { week: { number: 1 } },
    ]);
    const nums = await getCompletedWeekNumbers("stu-1", "off-1");
    expect(nums).toEqual([1, 2]);
  });

  it("markWeekComplete rejects when not enrolled", async () => {
    mockDb.week.findUnique.mockResolvedValue({
      id: "w1",
      number: 1,
      offeringId: "off-1",
      offering: { mode: "SELF_PACED", courseId: "c1", weeks: [{ number: 1 }] },
    });
    mockDb.weekProgress.findMany.mockResolvedValue([]);
    mockDb.enrollment.findFirst.mockResolvedValue(null);

    await expect(markWeekComplete(STUDENT, "w1")).rejects.toThrow(AppError);
  });

  it("markWeekComplete upserts progress when week is unlocked", async () => {
    mockDb.week.findUnique.mockResolvedValue({
      id: "w1",
      number: 1,
      offeringId: "off-1",
      offering: {
        mode: "SELF_PACED",
        courseId: "c1",
        weeks: [{ number: 1 }, { number: 2 }],
      },
    });
    mockDb.weekProgress.findMany.mockResolvedValue([]);
    mockDb.enrollment.findFirst.mockResolvedValue({ id: "enr-1", status: "ENROLLED" });
    mockDb.weekProgress.findFirst.mockResolvedValue(null);
    mockDb.weekProgress.create.mockResolvedValue({ id: "wp-1" });

    const result = await markWeekComplete(STUDENT, "w1");
    expect(result.id).toBe("wp-1");
    expect(mockDb.weekProgress.create).toHaveBeenCalled();
  });
});
