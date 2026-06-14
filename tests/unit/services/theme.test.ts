import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ────────────────────────────────────────────────────────────
const mockDb = vi.hoisted(() => ({
  theme: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/audit", () => ({
  withAudit: vi.fn(async (_ctx: unknown, mutation: (tx: typeof mockDb) => Promise<unknown>) =>
    mutation(mockDb),
  ),
  writeAuditLog: vi.fn(),
}));

// ── Subject ──────────────────────────────────────────────────────────────────
import { listThemes, getActiveTheme, createTheme, updateTheme, deleteTheme } from "@/lib/services/theme";

const ACTOR = {
  id: "admin-1",
  email: "admin@test.com",
  firstName: "Admin",
  lastName: "User",
  roles: ["ADMINISTRATIVE_ADMIN" as const],
  preferredLocale: "en",
  countryCode: null,
};

const SAMPLE_THEME = {
  id: "theme-1",
  name: "Default",
  siteName: "Spims",
  isActive: true,
  tokens: { "--primary": "240 5.9% 10%" },
  logoLightUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  updatedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

// ── listThemes ────────────────────────────────────────────────────────────────
describe("listThemes", () => {
  it("returns all themes ordered by createdAt", async () => {
    mockDb.theme.findMany.mockResolvedValue([SAMPLE_THEME]);
    const result = await listThemes();
    expect(result).toHaveLength(1);
    expect(mockDb.theme.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: "asc" } });
  });
});

// ── getActiveTheme ────────────────────────────────────────────────────────────
describe("getActiveTheme", () => {
  it("returns the active theme", async () => {
    mockDb.theme.findFirst.mockResolvedValue(SAMPLE_THEME);
    const result = await getActiveTheme();
    expect(result?.isActive).toBe(true);
    expect(mockDb.theme.findFirst).toHaveBeenCalledWith({ where: { isActive: true } });
  });

  it("returns null when no active theme", async () => {
    mockDb.theme.findFirst.mockResolvedValue(null);
    expect(await getActiveTheme()).toBeNull();
  });
});

// ── createTheme ───────────────────────────────────────────────────────────────
describe("createTheme", () => {
  it("creates a theme with provided data", async () => {
    const created = { ...SAMPLE_THEME, id: "theme-new", name: "New Theme" };
    mockDb.theme.create.mockResolvedValue(created);

    const result = await createTheme(ACTOR, {
      name: "New Theme",
      siteName: "Spims",
      tokens: { "--primary": "0 0% 0%" },
    });

    expect(result.name).toBe("New Theme");
    expect(mockDb.theme.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "New Theme", updatedById: ACTOR.id }),
      }),
    );
  });
});

// ── updateTheme ───────────────────────────────────────────────────────────────
describe("updateTheme", () => {
  it("updates theme fields", async () => {
    mockDb.theme.findUnique.mockResolvedValue(SAMPLE_THEME);
    const updated = { ...SAMPLE_THEME, name: "Renamed" };
    mockDb.theme.update.mockResolvedValue(updated);

    const result = await updateTheme(ACTOR, "theme-1", { name: "Renamed" });
    expect(result.name).toBe("Renamed");
  });

  it("deactivates all others when activating a theme", async () => {
    mockDb.theme.findUnique.mockResolvedValue({ ...SAMPLE_THEME, isActive: false });
    mockDb.theme.updateMany.mockResolvedValue({ count: 1 });
    mockDb.theme.update.mockResolvedValue({ ...SAMPLE_THEME, isActive: true });

    await updateTheme(ACTOR, "theme-1", { isActive: true });

    expect(mockDb.theme.updateMany).toHaveBeenCalledWith({
      where: { isActive: true },
      data: { isActive: false },
    });
  });

  it("throws NOT_FOUND for unknown theme", async () => {
    mockDb.theme.findUnique.mockResolvedValue(null);
    await expect(updateTheme(ACTOR, "no-theme", { name: "X" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ── deleteTheme ───────────────────────────────────────────────────────────────
describe("deleteTheme", () => {
  it("deletes an inactive theme", async () => {
    mockDb.theme.findUnique.mockResolvedValue({ ...SAMPLE_THEME, isActive: false });
    mockDb.theme.delete.mockResolvedValue({});

    await deleteTheme(ACTOR, "theme-1");
    expect(mockDb.theme.delete).toHaveBeenCalledWith({ where: { id: "theme-1" } });
  });

  it("throws CONFLICT when trying to delete the active theme", async () => {
    mockDb.theme.findUnique.mockResolvedValue({ ...SAMPLE_THEME, isActive: true });
    await expect(deleteTheme(ACTOR, "theme-1")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("throws NOT_FOUND for unknown theme", async () => {
    mockDb.theme.findUnique.mockResolvedValue(null);
    await expect(deleteTheme(ACTOR, "no-theme")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
