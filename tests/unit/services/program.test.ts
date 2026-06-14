import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  program: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  programCourse: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({
  withAudit: vi.fn(async (_ctx: unknown, mutation: (tx: typeof mockDb) => Promise<unknown>) =>
    mutation(mockDb),
  ),
}));

import {
  listPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
  setRequirements,
} from "@/lib/services/program";

const ACTOR = {
  id: "aca-1",
  email: "aca@test.com",
  firstName: "ACA",
  lastName: "Admin",
  roles: ["ACADEMIC_ADMIN" as const],
  preferredLocale: "en",
  countryCode: null,
};

const SAMPLE_PROGRAM = {
  id: "prog-1",
  code: "CS101",
  name: "Computer Science Diploma",
  type: "DIPLOMA" as const,
  passingThreshold: 60,
  maxCreditsPerSemester: 18,
  maxCoursesPerSemester: 6,
  maxSemestersToGraduate: 8,
  electiveCreditsRequired: 6,
  signatoryName: null,
  signatoryTitle: null,
  gradingSchemeId: null,
  active: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("listPrograms", () => {
  it("filters out soft-deleted programs", async () => {
    mockDb.program.findMany.mockResolvedValue([SAMPLE_PROGRAM]);
    mockDb.program.count.mockResolvedValue(1);
    const result = await listPrograms();
    expect(mockDb.program.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
    );
    expect(result.items).toHaveLength(1);
  });
});

describe("getProgramById", () => {
  it("returns program with courses", async () => {
    mockDb.program.findUnique.mockResolvedValue({ ...SAMPLE_PROGRAM, gradingScheme: null, programCourses: [] });
    const result = await getProgramById("prog-1");
    expect(result.id).toBe("prog-1");
  });

  it("throws NOT_FOUND for unknown id", async () => {
    mockDb.program.findUnique.mockResolvedValue(null);
    await expect(getProgramById("nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND for soft-deleted program", async () => {
    mockDb.program.findUnique.mockResolvedValue({ ...SAMPLE_PROGRAM, deletedAt: new Date() });
    await expect(getProgramById("prog-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("createProgram", () => {
  it("creates program with all fields", async () => {
    mockDb.program.create.mockResolvedValue(SAMPLE_PROGRAM);
    const result = await createProgram(ACTOR, {
      code: "CS101",
      name: "Computer Science Diploma",
      type: "DIPLOMA",
      maxCreditsPerSemester: 18,
      maxCoursesPerSemester: 6,
      maxSemestersToGraduate: 8,
    });
    expect(result.id).toBe("prog-1");
    expect(mockDb.program.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: "CS101", name: "Computer Science Diploma" }),
      }),
    );
  });
});

describe("updateProgram", () => {
  it("updates name", async () => {
    mockDb.program.findUnique.mockResolvedValue(SAMPLE_PROGRAM);
    mockDb.program.update.mockResolvedValue({ ...SAMPLE_PROGRAM, name: "Updated Name" });
    const result = await updateProgram(ACTOR, "prog-1", { name: "Updated Name" });
    expect(result.name).toBe("Updated Name");
  });

  it("throws NOT_FOUND for unknown id", async () => {
    mockDb.program.findUnique.mockResolvedValue(null);
    await expect(updateProgram(ACTOR, "nope", { name: "X" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("deleteProgram", () => {
  it("soft-deletes by setting deletedAt", async () => {
    mockDb.program.findUnique.mockResolvedValue(SAMPLE_PROGRAM);
    mockDb.program.update.mockResolvedValue({ ...SAMPLE_PROGRAM, deletedAt: new Date() });

    await deleteProgram(ACTOR, "prog-1");
    expect(mockDb.program.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prog-1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it("throws NOT_FOUND for already-deleted program", async () => {
    mockDb.program.findUnique.mockResolvedValue({ ...SAMPLE_PROGRAM, deletedAt: new Date() });
    await expect(deleteProgram(ACTOR, "prog-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("setRequirements", () => {
  it("replaces all ProgramCourse rows atomically", async () => {
    mockDb.program.findUnique.mockResolvedValue(SAMPLE_PROGRAM);
    mockDb.programCourse.deleteMany.mockResolvedValue({ count: 0 });
    mockDb.programCourse.createMany.mockResolvedValue({ count: 2 });
    mockDb.program.findUnique.mockResolvedValueOnce(SAMPLE_PROGRAM).mockResolvedValueOnce({
      ...SAMPLE_PROGRAM,
      programCourses: [],
    });

    await setRequirements(ACTOR, "prog-1", {
      requirements: [
        { courseId: "course-1", requirement: "REQUIRED", yearLevel: 1 },
        { courseId: "course-2", requirement: "ELECTIVE" },
      ],
    });

    expect(mockDb.programCourse.deleteMany).toHaveBeenCalledWith({ where: { programId: "prog-1" } });
    expect(mockDb.programCourse.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ courseId: "course-1", requirement: "REQUIRED" }),
        ]),
      }),
    );
  });
});
