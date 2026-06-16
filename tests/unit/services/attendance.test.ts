import { describe, it, expect, vi, beforeEach } from "vitest";
import { AttendanceStatus } from "@prisma/client";

const mockDb = vi.hoisted(() => ({
  liveSession: { findMany: vi.fn(), findUnique: vi.fn() },
  enrollment: { findMany: vi.fn() },
  attendanceRecord: { upsert: vi.fn(), findMany: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({
  withAudit: vi.fn(async (_ctx: unknown, fn: () => Promise<unknown>) => fn()),
}));

import {
  attendanceStatusForMinutes,
  computeAttendancePercent,
  importSessionAttendance,
} from "@/lib/services/attendance";

beforeEach(() => vi.clearAllMocks());

describe("attendanceStatusForMinutes", () => {
  it("uses offering threshold percent", () => {
    expect(attendanceStatusForMinutes(30, 60, 50)).toBe(AttendanceStatus.PRESENT);
    expect(attendanceStatusForMinutes(29, 60, 50)).toBe(AttendanceStatus.ABSENT);
  });
});

describe("computeAttendancePercent", () => {
  it("returns percent present across sessions", async () => {
    mockDb.liveSession.findMany.mockResolvedValue([{ id: "s1" }, { id: "s2" }]);
    mockDb.attendanceRecord.findMany.mockResolvedValue([
      { status: AttendanceStatus.PRESENT },
      { status: AttendanceStatus.ABSENT },
    ]);
    const pct = await computeAttendancePercent("off-1", "stu-1");
    expect(pct).toBe(50);
  });
});

describe("importSessionAttendance", () => {
  it("upserts records for enrolled students", async () => {
    mockDb.liveSession.findUnique.mockResolvedValue({
      id: "sess-1",
      durationMinutes: 60,
      offering: { attendanceThresholdPercent: 60 },
    });
    mockDb.enrollment.findMany.mockResolvedValue([
      { student: { id: "stu-1", email: "a@test.com" } },
    ]);
    mockDb.attendanceRecord.upsert.mockResolvedValue({ id: "rec-1" });

    const records = await importSessionAttendance("sess-1", [
      { email: "a@test.com", durationMinutes: 40 },
    ]);
    expect(records).toHaveLength(1);
    expect(mockDb.attendanceRecord.upsert).toHaveBeenCalled();
  });
});
