import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEFAULT_GRADE_BANDS,
  SEED_COURSE,
  SEED_PROGRAM,
} from "@/lib/seed/default-data";

const mockPrisma = vi.hoisted(() => ({
  language: { upsert: vi.fn() },
  gradingScheme: { findFirst: vi.fn(), create: vi.fn() },
  theme: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  user: { upsert: vi.fn() },
  userRole: { create: vi.fn() },
  program: { upsert: vi.fn() },
  course: { upsert: vi.fn() },
  programCourse: { upsert: vi.fn() },
  courseOffering: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

vi.mock("argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
}));

import { seedBootstrap } from "@/lib/seed/bootstrap";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.language.upsert.mockResolvedValue({});
  mockPrisma.gradingScheme.findFirst.mockResolvedValue(null);
  mockPrisma.gradingScheme.create.mockResolvedValue({ id: "scheme-1" });
  mockPrisma.theme.findFirst.mockResolvedValue(null);
  mockPrisma.theme.create.mockResolvedValue({ id: "theme-1", isActive: true });
  mockPrisma.user.upsert.mockResolvedValue({
    id: "admin-1",
    roles: [{ role: "SUPER_ADMIN" }],
  });
  mockPrisma.program.upsert.mockResolvedValue({ id: "program-1" });
  mockPrisma.course.upsert.mockResolvedValue({ id: "course-1" });
  mockPrisma.programCourse.upsert.mockResolvedValue({});
  mockPrisma.courseOffering.findFirst.mockResolvedValue(null);
  mockPrisma.courseOffering.create.mockResolvedValue({ id: "offering-1" });
});

describe("seedBootstrap", () => {
  it("creates default academic bootstrap records", async () => {
    const result = await seedBootstrap(mockPrisma as never, {
      adminEmail: "admin@spims.local",
      adminPassword: "ChangeMe!123",
    });

    expect(result).toEqual({
      adminUserId: "admin-1",
      gradingSchemeId: "scheme-1",
      themeId: "theme-1",
      programId: "program-1",
      courseId: "course-1",
      offeringId: "offering-1",
    });

    expect(mockPrisma.gradingScheme.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bands: { create: [...DEFAULT_GRADE_BANDS] },
        }),
      }),
    );

    expect(mockPrisma.program.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: SEED_PROGRAM.code },
      }),
    );

    expect(mockPrisma.course.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: SEED_COURSE.code },
      }),
    );
  });
});

describe("default seed data", () => {
  it("defines five grade bands", () => {
    expect(DEFAULT_GRADE_BANDS).toHaveLength(5);
  });
});
