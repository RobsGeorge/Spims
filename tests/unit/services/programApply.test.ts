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
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({
  withAudit: vi.fn(async (_ctx: unknown, mutation: (tx: typeof mockDb) => Promise<unknown>) =>
    mutation(mockDb),
  ),
}));

import { listProgramsOpenForApplication } from "@/lib/services/program";

beforeEach(() => vi.clearAllMocks());

describe("listProgramsOpenForApplication", () => {
  it("queries active programs that have an active application form", async () => {
    mockDb.program.findMany.mockResolvedValue([
      { id: "p1", code: "DIP1", name: "Diploma", type: "DIPLOMA" },
    ]);

    const actual = await listProgramsOpenForApplication();

    expect(mockDb.program.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          active: true,
          applicationForms: { some: { active: true } },
        }),
      }),
    );
    expect(actual).toHaveLength(1);
    expect(actual[0]?.code).toBe("DIP1");
  });
});
