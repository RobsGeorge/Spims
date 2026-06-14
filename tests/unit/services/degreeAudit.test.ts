import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  studentProgram: { findUnique: vi.fn() },
  academicRecord: { findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { getDegreeAudit } from "@/lib/services/degreeAudit";
import { AppError } from "@/lib/errors";

beforeEach(() => vi.clearAllMocks());

describe("degreeAudit service", () => {
  it("throws when student not in program", async () => {
    mockDb.studentProgram.findUnique.mockResolvedValue(null);
    await expect(getDegreeAudit("stu-1", "prog-1")).rejects.toThrow(AppError);
  });

  it("splits met vs remaining requirements", async () => {
    mockDb.studentProgram.findUnique.mockResolvedValue({
      id: "sp-1",
      status: "ACTIVE",
      program: {
        id: "prog-1",
        code: "BS",
        name: "Bachelor",
        electiveCreditsRequired: 6,
        programCourses: [
          {
            courseId: "c1",
            requirement: "REQUIRED",
            yearLevel: 1,
            course: { code: "CS101", title: "Intro", creditHours: 3 },
          },
          {
            courseId: "c2",
            requirement: "REQUIRED",
            yearLevel: 1,
            course: { code: "CS102", title: "Data", creditHours: 3 },
          },
        ],
      },
    });
    mockDb.academicRecord.findMany.mockResolvedValue([
      { courseId: "c1", isPassing: true, letterGrade: "A", percent: 95, completedAt: new Date() },
    ]);

    const audit = await getDegreeAudit("stu-1", "prog-1");
    expect(audit.met).toHaveLength(1);
    expect(audit.remaining).toHaveLength(1);
    expect(audit.met[0]?.courseCode).toBe("CS101");
    expect(audit.remaining[0]?.courseCode).toBe("CS102");
  });
});
