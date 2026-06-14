import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ────────────────────────────────────────────────────────────
const mockDb = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  userRole: { deleteMany: vi.fn() },
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
import { getMe, updateMe, listUsers, getUserById, createUser, updateUser, suspendUser } from "@/lib/services/user";
import { RoleType } from "@prisma/client";

const ADMIN_ACTOR = {
  id: "admin-1",
  email: "admin@test.com",
  firstName: "Admin",
  lastName: "User",
  roles: [RoleType.ADMINISTRATIVE_ADMIN],
  preferredLocale: "en",
  countryCode: null,
};

const SA_ACTOR = {
  ...ADMIN_ACTOR,
  roles: [RoleType.SUPER_ADMIN],
};

const EXISTING_USER = {
  id: "user-1",
  email: "user@test.com",
  firstName: "Test",
  lastName: "User",
  status: "ACTIVE",
  deletedAt: null,
  roles: [{ role: RoleType.STUDENT }],
};

beforeEach(() => vi.clearAllMocks());

// ── getMe ─────────────────────────────────────────────────────────────────────
describe("getMe", () => {
  it("returns user with roles", async () => {
    mockDb.user.findUnique.mockResolvedValue(EXISTING_USER);
    const result = await getMe("user-1");
    expect(result).toEqual(EXISTING_USER);
    expect(mockDb.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1", deletedAt: null } }),
    );
  });

  it("throws NOT_FOUND for missing user", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    await expect(getMe("bad-id")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ── updateMe ──────────────────────────────────────────────────────────────────
describe("updateMe", () => {
  it("updates profile fields and audits the change", async () => {
    mockDb.user.findUniqueOrThrow.mockResolvedValue(EXISTING_USER);
    const updated = { ...EXISTING_USER, firstName: "Updated" };
    mockDb.user.update.mockResolvedValue(updated);

    const result = await updateMe(ADMIN_ACTOR, { firstName: "Updated" });

    expect(result).toEqual(updated);
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ADMIN_ACTOR.id } }),
    );
  });
});

// ── listUsers ─────────────────────────────────────────────────────────────────
describe("listUsers", () => {
  it("returns paginated users and total count", async () => {
    mockDb.user.findMany.mockResolvedValue([EXISTING_USER]);
    mockDb.user.count.mockResolvedValue(1);

    const result = await listUsers({ page: 1, limit: 10 });

    expect(result.users).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it("applies search filter", async () => {
    mockDb.user.findMany.mockResolvedValue([]);
    mockDb.user.count.mockResolvedValue(0);

    await listUsers({ search: "john" });

    expect(mockDb.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
    );
  });
});

// ── getUserById ───────────────────────────────────────────────────────────────
describe("getUserById", () => {
  it("returns user by id", async () => {
    mockDb.user.findUnique.mockResolvedValue(EXISTING_USER);
    const result = await getUserById("user-1");
    expect(result.id).toBe("user-1");
  });

  it("throws NOT_FOUND for unknown id", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    await expect(getUserById("no-such")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ── createUser ────────────────────────────────────────────────────────────────
describe("createUser", () => {
  it("creates user with given roles (ADMIN can create STUDENT)", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    const created = { ...EXISTING_USER, email: "new@test.com" };
    mockDb.user.create.mockResolvedValue(created);

    const result = await createUser(ADMIN_ACTOR, {
      email: "new@test.com",
      firstName: "New",
      lastName: "User",
      roles: [RoleType.STUDENT],
    });

    expect(result.email).toBe("new@test.com");
    expect(mockDb.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ emailVerified: true, status: "ACTIVE" }) }),
    );
  });

  it("throws FORBIDDEN when non-SA tries to assign SUPER_ADMIN", async () => {
    await expect(
      createUser(ADMIN_ACTOR, {
        email: "sa@test.com",
        firstName: "SA",
        lastName: "User",
        roles: [RoleType.SUPER_ADMIN],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows SA to assign SUPER_ADMIN role", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.user.create.mockResolvedValue({ ...EXISTING_USER, roles: [{ role: RoleType.SUPER_ADMIN }] });

    await expect(
      createUser(SA_ACTOR, {
        email: "sa2@test.com",
        firstName: "SA",
        lastName: "Two",
        roles: [RoleType.SUPER_ADMIN],
      }),
    ).resolves.toBeDefined();
  });

  it("throws CONFLICT for duplicate email", async () => {
    mockDb.user.findUnique.mockResolvedValue(EXISTING_USER);
    await expect(
      createUser(ADMIN_ACTOR, { email: "user@test.com", firstName: "X", lastName: "Y", roles: [RoleType.STUDENT] }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

// ── updateUser ────────────────────────────────────────────────────────────────
describe("updateUser", () => {
  it("updates user fields", async () => {
    mockDb.user.findUnique.mockResolvedValue(EXISTING_USER);
    const updated = { ...EXISTING_USER, firstName: "Renamed" };
    mockDb.user.update.mockResolvedValue(updated);

    const result = await updateUser(ADMIN_ACTOR, "user-1", { firstName: "Renamed" });
    expect(result.firstName).toBe("Renamed");
  });

  it("replaces roles when roles is provided", async () => {
    mockDb.user.findUnique.mockResolvedValue(EXISTING_USER);
    mockDb.userRole.deleteMany.mockResolvedValue({ count: 1 });
    mockDb.user.update.mockResolvedValue({ ...EXISTING_USER, roles: [{ role: RoleType.INSTRUCTOR }] });

    await updateUser(ADMIN_ACTOR, "user-1", { roles: [RoleType.INSTRUCTOR] });

    expect(mockDb.userRole.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });
});

// ── suspendUser ───────────────────────────────────────────────────────────────
describe("suspendUser", () => {
  it("sets status to SUSPENDED", async () => {
    mockDb.user.update.mockResolvedValue({ ...EXISTING_USER, status: "SUSPENDED" });

    const result = await suspendUser(ADMIN_ACTOR, "user-1");
    expect(result.status).toBe("SUSPENDED");
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "SUSPENDED" }, include: { roles: true } }),
    );
  });
});
