import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  gradingScheme: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  gradeBand: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  program: { count: vi.fn() },
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
  listGradingSchemes,
  getGradingSchemeById,
  createGradingScheme,
  updateGradingScheme,
  deleteGradingScheme,
} from "@/lib/services/gradingScheme";

const ACTOR = {
  id: "aca-1",
  email: "aca@test.com",
  firstName: "ACA",
  lastName: "Admin",
  roles: ["ACADEMIC_ADMIN" as const],
  preferredLocale: "en",
  countryCode: null,
};

const SAMPLE_SCHEME = {
  id: "scheme-1",
  name: "Standard",
  isDefault: true,
  createdAt: new Date(),
  bands: [
    { id: "b1", schemeId: "scheme-1", letter: "A", minPercent: 90, maxPercent: 100, gpaPoints: 4.0, isPassing: true },
    { id: "b2", schemeId: "scheme-1", letter: "F", minPercent: 0, maxPercent: 59, gpaPoints: 0.0, isPassing: false },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe("listGradingSchemes", () => {
  it("returns schemes with bands", async () => {
    mockDb.gradingScheme.findMany.mockResolvedValue([SAMPLE_SCHEME]);
    const result = await listGradingSchemes();
    expect(result).toHaveLength(1);
    expect(result[0]!.bands).toHaveLength(2);
    expect(mockDb.gradingScheme.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { bands: true } }),
    );
  });
});

describe("getGradingSchemeById", () => {
  it("returns the scheme with bands", async () => {
    mockDb.gradingScheme.findUnique.mockResolvedValue(SAMPLE_SCHEME);
    const result = await getGradingSchemeById("scheme-1");
    expect(result.id).toBe("scheme-1");
    expect(result.bands).toHaveLength(2);
  });

  it("throws NOT_FOUND for unknown id", async () => {
    mockDb.gradingScheme.findUnique.mockResolvedValue(null);
    await expect(getGradingSchemeById("nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("createGradingScheme", () => {
  it("creates scheme with bands", async () => {
    mockDb.gradingScheme.create.mockResolvedValue(SAMPLE_SCHEME);
    const result = await createGradingScheme(ACTOR, {
      name: "Standard",
      isDefault: true,
      bands: [{ letter: "A", minPercent: 90, maxPercent: 100, gpaPoints: 4.0, isPassing: true }],
    });
    expect(result.id).toBe("scheme-1");
    expect(mockDb.gradingScheme.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Standard" }),
      }),
    );
  });
});

describe("updateGradingScheme", () => {
  it("replaces bands when provided", async () => {
    mockDb.gradingScheme.findUnique.mockResolvedValue(SAMPLE_SCHEME);
    mockDb.gradeBand.deleteMany.mockResolvedValue({ count: 2 });
    mockDb.gradeBand.createMany.mockResolvedValue({ count: 1 });
    mockDb.gradingScheme.update.mockResolvedValue({ ...SAMPLE_SCHEME, name: "Updated" });

    await updateGradingScheme(ACTOR, "scheme-1", {
      name: "Updated",
      bands: [{ letter: "A", minPercent: 90, maxPercent: 100, gpaPoints: 4.0, isPassing: true }],
    });

    expect(mockDb.gradeBand.deleteMany).toHaveBeenCalledWith({ where: { schemeId: "scheme-1" } });
    expect(mockDb.gradeBand.createMany).toHaveBeenCalled();
  });

  it("throws NOT_FOUND for unknown id", async () => {
    mockDb.gradingScheme.findUnique.mockResolvedValue(null);
    await expect(updateGradingScheme(ACTOR, "nope", { name: "X" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("deleteGradingScheme", () => {
  it("throws CONFLICT when referenced by active programs", async () => {
    mockDb.gradingScheme.findUnique.mockResolvedValue(SAMPLE_SCHEME);
    mockDb.program.count.mockResolvedValue(1);
    await expect(deleteGradingScheme(ACTOR, "scheme-1")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("deletes when not referenced", async () => {
    mockDb.gradingScheme.findUnique.mockResolvedValue(SAMPLE_SCHEME);
    mockDb.program.count.mockResolvedValue(0);
    mockDb.gradingScheme.delete.mockResolvedValue(SAMPLE_SCHEME);

    await deleteGradingScheme(ACTOR, "scheme-1");
    expect(mockDb.gradingScheme.delete).toHaveBeenCalledWith({ where: { id: "scheme-1" } });
  });

  it("throws NOT_FOUND for unknown id", async () => {
    mockDb.gradingScheme.findUnique.mockResolvedValue(null);
    await expect(deleteGradingScheme(ACTOR, "nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
