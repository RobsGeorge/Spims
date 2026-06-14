import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  assessmentTemplate: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  assessmentTemplateComponent: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  course: { count: vi.fn() },
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
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/services/assessmentTemplate";

const ACTOR = {
  id: "aca-1",
  email: "aca@test.com",
  firstName: "ACA",
  lastName: "Admin",
  roles: ["ACADEMIC_ADMIN" as const],
  preferredLocale: "en",
  countryCode: null,
};

const SAMPLE_TEMPLATE = {
  id: "tmpl-1",
  name: "Default Template",
  isDefault: true,
  createdAt: new Date(),
  components: [
    { id: "c1", templateId: "tmpl-1", name: "Assignments", weightPercent: 40, kind: "ASSIGNMENT" as const },
    { id: "c2", templateId: "tmpl-1", name: "Midterm Exam", weightPercent: 30, kind: "EXAM" as const },
    { id: "c3", templateId: "tmpl-1", name: "Final Exam", weightPercent: 30, kind: "EXAM" as const },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe("listTemplates", () => {
  it("returns templates with components", async () => {
    mockDb.assessmentTemplate.findMany.mockResolvedValue([SAMPLE_TEMPLATE]);
    const result = await listTemplates();
    expect(result).toHaveLength(1);
    expect(result[0]!.components).toHaveLength(3);
  });
});

describe("getTemplateById", () => {
  it("returns template with components", async () => {
    mockDb.assessmentTemplate.findUnique.mockResolvedValue(SAMPLE_TEMPLATE);
    const result = await getTemplateById("tmpl-1");
    expect(result.name).toBe("Default Template");
  });

  it("throws NOT_FOUND for unknown id", async () => {
    mockDb.assessmentTemplate.findUnique.mockResolvedValue(null);
    await expect(getTemplateById("nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("createTemplate", () => {
  it("succeeds when weights sum to 100", async () => {
    mockDb.assessmentTemplate.create.mockResolvedValue(SAMPLE_TEMPLATE);
    const result = await createTemplate(ACTOR, {
      name: "Default Template",
      isDefault: true,
      components: [
        { name: "Assignments", weightPercent: 40, kind: "ASSIGNMENT" as const },
        { name: "Midterm", weightPercent: 30, kind: "EXAM" as const },
        { name: "Final", weightPercent: 30, kind: "EXAM" as const },
      ],
    });
    expect(result.id).toBe("tmpl-1");
  });

  it("throws VALIDATION when weights sum to less than 100", async () => {
    await expect(
      createTemplate(ACTOR, {
        name: "Bad Template",
        components: [
          { name: "A", weightPercent: 40, kind: "ASSIGNMENT" as const },
          { name: "B", weightPercent: 30, kind: "EXAM" as const },
          { name: "C", weightPercent: 20, kind: "EXAM" as const },
        ],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION when weights sum to more than 100", async () => {
    await expect(
      createTemplate(ACTOR, {
        name: "Bad Template",
        components: [
          { name: "A", weightPercent: 40, kind: "ASSIGNMENT" as const },
          { name: "B", weightPercent: 30, kind: "EXAM" as const },
          { name: "C", weightPercent: 35, kind: "EXAM" as const },
        ],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("updateTemplate", () => {
  it("replaces components atomically when provided", async () => {
    mockDb.assessmentTemplate.findUnique.mockResolvedValue(SAMPLE_TEMPLATE);
    mockDb.assessmentTemplateComponent.deleteMany.mockResolvedValue({ count: 3 });
    mockDb.assessmentTemplateComponent.createMany.mockResolvedValue({ count: 2 });
    mockDb.assessmentTemplate.update.mockResolvedValue({ ...SAMPLE_TEMPLATE, name: "Updated" });

    await updateTemplate(ACTOR, "tmpl-1", {
      components: [
        { name: "X", weightPercent: 60, kind: "ASSIGNMENT" as const },
        { name: "Y", weightPercent: 40, kind: "EXAM" as const },
      ],
    });

    expect(mockDb.assessmentTemplateComponent.deleteMany).toHaveBeenCalledWith({ where: { templateId: "tmpl-1" } });
    expect(mockDb.assessmentTemplateComponent.createMany).toHaveBeenCalled();
  });

  it("throws VALIDATION when new components do not sum to 100", async () => {
    mockDb.assessmentTemplate.findUnique.mockResolvedValue(SAMPLE_TEMPLATE);
    await expect(
      updateTemplate(ACTOR, "tmpl-1", {
        components: [{ name: "X", weightPercent: 50, kind: "ASSIGNMENT" as const }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("deleteTemplate", () => {
  it("throws CONFLICT when referenced by active courses", async () => {
    mockDb.assessmentTemplate.findUnique.mockResolvedValue(SAMPLE_TEMPLATE);
    mockDb.course.count.mockResolvedValue(1);
    await expect(deleteTemplate(ACTOR, "tmpl-1")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("deletes when not referenced", async () => {
    mockDb.assessmentTemplate.findUnique.mockResolvedValue(SAMPLE_TEMPLATE);
    mockDb.course.count.mockResolvedValue(0);
    mockDb.assessmentTemplate.delete.mockResolvedValue(SAMPLE_TEMPLATE);

    await deleteTemplate(ACTOR, "tmpl-1");
    expect(mockDb.assessmentTemplate.delete).toHaveBeenCalledWith({ where: { id: "tmpl-1" } });
  });
});
