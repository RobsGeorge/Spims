import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  academicYear: { findMany: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({
  withAudit: vi.fn(async (_ctx: unknown, mutation: (tx: typeof mockDb) => Promise<unknown>) =>
    mutation(mockDb),
  ),
}));

import { listAcademicYears, createAcademicYear } from "@/lib/services/academicYear";

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

describe("academicYear service", () => {
  it("listAcademicYears returns years with semesters", async () => {
    mockDb.academicYear.findMany.mockResolvedValue([{ id: "y1", name: "2025-26", semesters: [] }]);
    const years = await listAcademicYears();
    expect(years).toHaveLength(1);
  });

  it("createAcademicYear persists dates", async () => {
    const start = new Date("2025-09-01");
    const end = new Date("2026-06-30");
    mockDb.academicYear.create.mockResolvedValue({ id: "y1", name: "2025-26", startDate: start, endDate: end });
    const year = await createAcademicYear(ADM, { name: "2025-26", startDate: start, endDate: end });
    expect(year.id).toBe("y1");
    expect(mockDb.academicYear.create).toHaveBeenCalled();
  });
});
