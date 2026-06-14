import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { RoleType, UserStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const ELEVATED_ROLES: RoleType[] = [RoleType.SUPER_ADMIN, RoleType.ADMINISTRATIVE_ADMIN];

function assertCanAssignRoles(actor: SessionUser, roles: RoleType[]): void {
  const hasElevated = roles.some((r) => ELEVATED_ROLES.includes(r));
  if (hasElevated && !actor.roles.includes(RoleType.SUPER_ADMIN)) {
    throw AppError.forbidden("Only Super Admin can assign Super Admin or Administrative Admin roles");
  }
}

export async function getMe(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId, deletedAt: null },
    include: { roles: true },
  });
  if (!user) throw AppError.notFound("User");
  return user;
}

export async function updateMe(
  actor: SessionUser,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    preferredLocale?: string;
    themePreference?: "LIGHT" | "DARK" | "SYSTEM";
  },
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const before = await db.user.findUniqueOrThrow({ where: { id: actor.id } });

  return withAudit(
    {
      actor,
      action: "profile.editOwn",
      entityType: "User",
      entityId: actor.id,
      before: { firstName: before.firstName, lastName: before.lastName, phone: before.phone },
      ...ctx,
    },
    async (tx) =>
      tx.user.update({ where: { id: actor.id }, data, include: { roles: true } }),
  );
}

export async function listUsers(opts: {
  search?: string;
  status?: UserStatus;
  page?: number;
  limit?: number;
}) {
  const { search, status, page = 1, limit = 20 } = opts;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({ where, include: { roles: true }, skip, take: limit, orderBy: { createdAt: "desc" } }),
    db.user.count({ where }),
  ]);

  return { users, total, page, limit };
}

export async function getUserById(id: string) {
  const user = await db.user.findUnique({ where: { id, deletedAt: null }, include: { roles: true } });
  if (!user) throw AppError.notFound("User");
  return user;
}

export async function createUser(
  actor: SessionUser,
  data: { email: string; firstName: string; lastName: string; phone?: string; roles: RoleType[] },
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  assertCanAssignRoles(actor, data.roles);

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw AppError.conflict("Email already registered");

  return withAudit(
    { actor, action: "user.manage", entityType: "User", ...ctx },
    async (tx) =>
      tx.user.create({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          emailVerified: true,
          status: "ACTIVE",
          roles: { create: data.roles.map((role) => ({ role })) },
        },
        include: { roles: true },
      }),
  );
}

export async function updateUser(
  actor: SessionUser,
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    roles?: RoleType[];
    status?: UserStatus;
    isReviewer?: boolean;
  },
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  if (data.roles) assertCanAssignRoles(actor, data.roles);

  const before = await getUserById(id);
  const { roles, ...userData } = data;

  return withAudit(
    {
      actor,
      action: "user.manage",
      entityType: "User",
      entityId: id,
      before: { status: before.status, roles: before.roles.map((r) => r.role) },
      ...ctx,
    },
    async (tx) => {
      if (roles !== undefined) {
        await tx.userRole.deleteMany({ where: { userId: id } });
      }
      return tx.user.update({
        where: { id },
        data: {
          ...userData,
          ...(roles ? { roles: { create: roles.map((role) => ({ role })) } } : {}),
        },
        include: { roles: true },
      });
    },
  );
}

export async function suspendUser(
  actor: SessionUser,
  id: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  return withAudit(
    { actor, action: "user.suspend", entityType: "User", entityId: id, ...ctx },
    async (tx) => tx.user.update({ where: { id }, data: { status: "SUSPENDED" }, include: { roles: true } }),
  );
}

export async function activateUser(
  actor: SessionUser,
  id: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  return withAudit(
    { actor, action: "user.manage", entityType: "User", entityId: id, ...ctx },
    async (tx) => tx.user.update({ where: { id }, data: { status: "ACTIVE" }, include: { roles: true } }),
  );
}
