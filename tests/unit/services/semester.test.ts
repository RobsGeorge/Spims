import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  semester: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  academicYear: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({
  withAudit: vi.fn(async (_ctx: unknown, mutation: (tx: typeof mockDb) => Promise<unknown>) =>
    mutation(mockDb),
  ),
}));

import { createSemester, updateSemester } from "@/lib/services/semester";
import { AppError } from "@/lib/errors";

const ADM = {
  id: "adm-1",
  email: "adm@test.com",
  firstName: "Admin",
  lastName: "User",
  roles: ["ADMINISTRATIVE_ADMIN" as const],
  preferredLocale: "en",
  countryCode: null,
};

beforeEach(() => vi.clearAllMocks());

describe("semester service", () => {
  it("createSemester requires academic year", async () => {
    mockDb.academicYear.findUnique.mockResolvedValue(null);
    await expect(
      createSemester(ADM, {
        academicYearId: "missing",
        name: "Fall",
        startDate: new Date(),
        endDate: new Date(),
        registrationStart: new Date(),
        registrationEnd: new Date(),
        addDropEndWeek: 2,
        lastWithdrawalWeek: 10,
      }),
    ).rejects.toThrow(AppError);
  });

  it("createSemester stores refund and withdrawal weeks", async () => {
    mockDb.academicYear.findUnique.mockResolvedValue({ id: "y1" });
    mockDb.semester.create.mockResolvedValue({ id: "s1", name: "Fall" });
    const semester = await createSemester(ADM, {
      academicYearId: "y1",
      name: "Fall 2026",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-15"),
      registrationStart: new Date("2026-08-01"),
      registrationEnd: new Date("2026-08-31"),
      addDropEndWeek: 2,
      lastWithdrawalWeek: 10,
      withdrawalRefundPercent: 50,
    });
    expect(semester.id).toBe("s1");
  });

  it("updateSemester patches fields", async () => {
    mockDb.semester.findUnique.mockResolvedValue({ id: "s1", withdrawalRefundPercent: 0 });
    mockDb.semester.update.mockResolvedValue({ id: "s1", withdrawalRefundPercent: 25 });
    const semester = await updateSemester(ADM, "s1", { withdrawalRefundPercent: 25 });
    expect(semester.withdrawalRefundPercent).toBe(25);
  });
});
