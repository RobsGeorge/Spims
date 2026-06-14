import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  course: { findUnique: vi.fn() },
  program: { findUnique: vi.fn() },
  gradingScheme: { findUnique: vi.fn() },
  assessmentTemplate: { findUnique: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { resolveTranslationSourceText } from "@/lib/services/translationSource";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveTranslationSourceText", () => {
  it("returns course title for Course.title", async () => {
    mockDb.course.findUnique.mockResolvedValue({ title: "Intro to CS", deletedAt: null });
    const text = await resolveTranslationSourceText("Course", "course-1", "title");
    expect(text).toBe("Intro to CS");
  });

  it("throws NOT_FOUND for deleted course", async () => {
    mockDb.course.findUnique.mockResolvedValue({ title: "Intro", deletedAt: new Date() });
    await expect(resolveTranslationSourceText("Course", "course-1", "title")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws for unsupported entity field", async () => {
    await expect(resolveTranslationSourceText("Unknown", "x", "title")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("returns program name for Program.name", async () => {
    mockDb.program.findUnique.mockResolvedValue({ name: "CS Diploma", deletedAt: null });
    const text = await resolveTranslationSourceText("Program", "prog-1", "name");
    expect(text).toBe("CS Diploma");
  });
});
