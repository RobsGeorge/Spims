import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { CreateGradingSchemeInput, UpdateGradingSchemeInput } from "@/lib/validation/gradingScheme";

export async function listGradingSchemes() {
  return db.gradingScheme.findMany({
    include: { bands: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getGradingSchemeById(id: string) {
  const scheme = await db.gradingScheme.findUnique({
    where: { id },
    include: { bands: true },
  });
  if (!scheme) throw AppError.notFound("GradingScheme");
  return scheme;
}

export async function createGradingScheme(
  actor: SessionUser,
  data: CreateGradingSchemeInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  return withAudit(
    { actor, action: "gradingScheme.manage", entityType: "GradingScheme", ...ctx },
    async (tx) =>
      tx.gradingScheme.create({
        data: {
          name: data.name,
          isDefault: data.isDefault ?? false,
          bands: { create: data.bands },
        },
        include: { bands: true },
      }),
  );
}

export async function updateGradingScheme(
  actor: SessionUser,
  id: string,
  data: UpdateGradingSchemeInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const before = await db.gradingScheme.findUnique({ where: { id }, include: { bands: true } });
  if (!before) throw AppError.notFound("GradingScheme");

  return withAudit(
    {
      actor,
      action: "gradingScheme.manage",
      entityType: "GradingScheme",
      entityId: id,
      before: { name: before.name, isDefault: before.isDefault },
      ...ctx,
    },
    async (tx) => {
      if (data.bands !== undefined) {
        await tx.gradeBand.deleteMany({ where: { schemeId: id } });
        await tx.gradeBand.createMany({
          data: data.bands.map((b) => ({ ...b, schemeId: id })),
        });
      }
      return tx.gradingScheme.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        },
        include: { bands: true },
      });
    },
  );
}

export async function deleteGradingScheme(
  actor: SessionUser,
  id: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const scheme = await db.gradingScheme.findUnique({ where: { id } });
  if (!scheme) throw AppError.notFound("GradingScheme");

  const refCount = await db.program.count({ where: { gradingSchemeId: id, deletedAt: null } });
  if (refCount > 0) {
    throw AppError.conflict("GradingScheme is referenced by active programs");
  }

  return withAudit(
    { actor, action: "gradingScheme.manage", entityType: "GradingScheme", entityId: id, before: scheme, ...ctx },
    async (tx) => tx.gradingScheme.delete({ where: { id } }),
  );
}
