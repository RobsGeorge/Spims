import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertMinorUnits } from "@/lib/money";

const mockDb = vi.hoisted(() => ({
  course: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  coursePrerequisite: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  courseInterestFlag: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
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
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  setPrerequisites,
  setPricing,
  flagInterest,
  unflagInterest,
  getInterestCount,
  getInterestCountsByCourseIds,
  getStudentInterestCourseIds,
} from "@/lib/services/course";

const ACA_ACTOR = {
  id: "aca-1",
  email: "aca@test.com",
  firstName: "ACA",
  lastName: "Admin",
  roles: ["ACADEMIC_ADMIN" as const],
  preferredLocale: "en",
  countryCode: null,
};

const STU_ACTOR = {
  id: "stu-1",
  email: "stu@test.com",
  firstName: "Student",
  lastName: "User",
  roles: ["STUDENT" as const],
  preferredLocale: "en",
  countryCode: null,
};

const FIN_ACTOR = {
  id: "fin-1",
  email: "fin@test.com",
  firstName: "Finance",
  lastName: "Admin",
  roles: ["FINANCIAL_ADMIN" as const],
  preferredLocale: "en",
  countryCode: null,
};

const SAMPLE_COURSE = {
  id: "course-1",
  code: "CS101",
  title: "Introduction to CS",
  creditHours: 3,
  defaultPriceUsd: 0,
  defaultPriceEgp: 0,
  isFree: false,
  isStandalone: false,
  passingThreshold: null,
  assessmentTemplateId: null,
  active: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("listCourses", () => {
  it("filters out soft-deleted courses", async () => {
    mockDb.course.findMany.mockResolvedValue([SAMPLE_COURSE]);
    mockDb.course.count.mockResolvedValue(1);
    await listCourses();
    expect(mockDb.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
    );
  });
});

describe("getCourseById", () => {
  it("returns the course", async () => {
    mockDb.course.findUnique.mockResolvedValue({ ...SAMPLE_COURSE, assessmentTemplate: null, prerequisites: [] });
    const result = await getCourseById("course-1");
    expect(result.id).toBe("course-1");
  });

  it("throws NOT_FOUND for unknown id", async () => {
    mockDb.course.findUnique.mockResolvedValue(null);
    await expect(getCourseById("nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND for soft-deleted course", async () => {
    mockDb.course.findUnique.mockResolvedValue({ ...SAMPLE_COURSE, deletedAt: new Date() });
    await expect(getCourseById("course-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("createCourse", () => {
  it("creates a course", async () => {
    mockDb.course.create.mockResolvedValue(SAMPLE_COURSE);
    const result = await createCourse(ACA_ACTOR, { code: "CS101", title: "Intro CS", creditHours: 3 });
    expect(result.id).toBe("course-1");
    expect(mockDb.course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: "CS101", title: "Intro CS" }),
      }),
    );
  });
});

describe("updateCourse", () => {
  it("updates course fields", async () => {
    mockDb.course.findUnique.mockResolvedValue(SAMPLE_COURSE);
    mockDb.course.update.mockResolvedValue({ ...SAMPLE_COURSE, title: "Updated" });
    const result = await updateCourse(ACA_ACTOR, "course-1", { title: "Updated" });
    expect(result.title).toBe("Updated");
  });

  it("throws NOT_FOUND for unknown id", async () => {
    mockDb.course.findUnique.mockResolvedValue(null);
    await expect(updateCourse(ACA_ACTOR, "nope", { title: "X" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("deleteCourse", () => {
  it("soft-deletes by setting deletedAt", async () => {
    mockDb.course.findUnique.mockResolvedValue(SAMPLE_COURSE);
    mockDb.course.update.mockResolvedValue({ ...SAMPLE_COURSE, deletedAt: new Date() });

    await deleteCourse(ACA_ACTOR, "course-1");
    expect(mockDb.course.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });
});

describe("setPrerequisites", () => {
  it("replaces all CoursePrerequisite rows atomically", async () => {
    mockDb.course.findUnique.mockResolvedValue(SAMPLE_COURSE).mockResolvedValueOnce(SAMPLE_COURSE).mockResolvedValueOnce({
      ...SAMPLE_COURSE,
      prerequisites: [],
    });
    mockDb.coursePrerequisite.deleteMany.mockResolvedValue({ count: 0 });
    mockDb.coursePrerequisite.createMany.mockResolvedValue({ count: 1 });

    await setPrerequisites(ACA_ACTOR, "course-1", { prerequisiteIds: ["prereq-1"] });

    expect(mockDb.coursePrerequisite.deleteMany).toHaveBeenCalledWith({ where: { courseId: "course-1" } });
    expect(mockDb.coursePrerequisite.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ courseId: "course-1", prerequisiteId: "prereq-1" }],
      }),
    );
  });
});

describe("setPricing", () => {
  it("succeeds with valid integer minor units", async () => {
    mockDb.course.findUnique.mockResolvedValue(SAMPLE_COURSE);
    mockDb.course.update.mockResolvedValue({ ...SAMPLE_COURSE, defaultPriceUsd: 1000, defaultPriceEgp: 50000 });

    const result = await setPricing(FIN_ACTOR, "course-1", { defaultPriceUsd: 1000, defaultPriceEgp: 50000 });
    expect(result.defaultPriceUsd).toBe(1000);
    expect(result.defaultPriceEgp).toBe(50000);
  });

  it("assertMinorUnits rejects float values", () => {
    expect(() => assertMinorUnits(9.99)).toThrow();
    expect(() => assertMinorUnits(-1)).toThrow();
  });
});

describe("flagInterest", () => {
  it("upserts interest flag for student", async () => {
    mockDb.courseInterestFlag.upsert.mockResolvedValue({
      id: "flag-1",
      studentId: STU_ACTOR.id,
      courseId: "course-1",
      createdAt: new Date(),
    });

    await flagInterest(STU_ACTOR, "course-1");

    expect(mockDb.courseInterestFlag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId_courseId: { studentId: STU_ACTOR.id, courseId: "course-1" } },
        create: { studentId: STU_ACTOR.id, courseId: "course-1" },
      }),
    );
  });

  it("is idempotent (upsert handles duplicate)", async () => {
    mockDb.courseInterestFlag.upsert.mockResolvedValue({
      id: "flag-1",
      studentId: STU_ACTOR.id,
      courseId: "course-1",
      createdAt: new Date(),
    });
    // Second call should also succeed
    await flagInterest(STU_ACTOR, "course-1");
    await flagInterest(STU_ACTOR, "course-1");
    expect(mockDb.courseInterestFlag.upsert).toHaveBeenCalledTimes(2);
  });
});

describe("unflagInterest", () => {
  it("uses deleteMany for idempotency", async () => {
    mockDb.courseInterestFlag.deleteMany.mockResolvedValue({ count: 1 });
    await unflagInterest(STU_ACTOR, "course-1");
    expect(mockDb.courseInterestFlag.deleteMany).toHaveBeenCalledWith({
      where: { studentId: STU_ACTOR.id, courseId: "course-1" },
    });
  });

  it("does not throw when flag does not exist", async () => {
    mockDb.courseInterestFlag.deleteMany.mockResolvedValue({ count: 0 });
    await expect(unflagInterest(STU_ACTOR, "course-1")).resolves.toBeDefined();
  });
});

describe("getInterestCount", () => {
  it("returns the count of interest flags", async () => {
    mockDb.courseInterestFlag.count.mockResolvedValue(3);
    const result = await getInterestCount("course-1");
    expect(result.count).toBe(3);
  });
});

describe("getInterestCountsByCourseIds", () => {
  it("returns empty object for no ids", async () => {
    const result = await getInterestCountsByCourseIds([]);
    expect(result).toEqual({});
    expect(mockDb.courseInterestFlag.groupBy).not.toHaveBeenCalled();
  });

  it("maps groupBy results to courseId counts", async () => {
    mockDb.courseInterestFlag.groupBy.mockResolvedValue([
      { courseId: "course-1", _count: { courseId: 2 } },
      { courseId: "course-2", _count: { courseId: 5 } },
    ]);
    const result = await getInterestCountsByCourseIds(["course-1", "course-2"]);
    expect(result).toEqual({ "course-1": 2, "course-2": 5 });
  });
});

describe("getStudentInterestCourseIds", () => {
  it("returns course ids flagged by student", async () => {
    mockDb.courseInterestFlag.findMany.mockResolvedValue([
      { courseId: "course-1" },
      { courseId: "course-3" },
    ]);
    const result = await getStudentInterestCourseIds("stu-1");
    expect(result).toEqual(["course-1", "course-3"]);
  });
});
