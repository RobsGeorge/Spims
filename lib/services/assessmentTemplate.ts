import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { CreateTemplateInput, UpdateTemplateInput } from "@/lib/validation/assessmentTemplate";

function assertWeightsSumTo100(components: Array<{ weightPercent: number }>) {
  const sum = components.reduce((acc, c) => acc + c.weightPercent, 0);
  if (Math.abs(sum - 100) > 0.001) {
    throw AppError.validation(
      `Component weights must sum to 100, got ${sum.toFixed(2)}`,
    );
  }
}

export async function listTemplates() {
  return db.assessmentTemplate.findMany({
    include: { components: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getTemplateById(id: string) {
  const template = await db.assessmentTemplate.findUnique({
    where: { id },
    include: { components: true },
  });
  if (!template) throw AppError.notFound("AssessmentTemplate");
  return template;
}

export async function createTemplate(
  actor: SessionUser,
  data: CreateTemplateInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  assertWeightsSumTo100(data.components);

  return withAudit(
    { actor, action: "assessmentTemplate.manage", entityType: "AssessmentTemplate", ...ctx },
    async (tx) =>
      tx.assessmentTemplate.create({
        data: {
          name: data.name,
          isDefault: data.isDefault ?? false,
          components: { create: data.components },
        },
        include: { components: true },
      }),
  );
}

export async function updateTemplate(
  actor: SessionUser,
  id: string,
  data: UpdateTemplateInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const before = await db.assessmentTemplate.findUnique({ where: { id }, include: { components: true } });
  if (!before) throw AppError.notFound("AssessmentTemplate");

  if (data.components !== undefined) {
    assertWeightsSumTo100(data.components);
  }

  return withAudit(
    {
      actor,
      action: "assessmentTemplate.manage",
      entityType: "AssessmentTemplate",
      entityId: id,
      before: { name: before.name },
      ...ctx,
    },
    async (tx) => {
      if (data.components !== undefined) {
        await tx.assessmentTemplateComponent.deleteMany({ where: { templateId: id } });
        await tx.assessmentTemplateComponent.createMany({
          data: data.components.map((c) => ({ ...c, templateId: id })),
        });
      }
      return tx.assessmentTemplate.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        },
        include: { components: true },
      });
    },
  );
}

export async function deleteTemplate(
  actor: SessionUser,
  id: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const template = await db.assessmentTemplate.findUnique({ where: { id } });
  if (!template) throw AppError.notFound("AssessmentTemplate");

  const refCount = await db.course.count({ where: { assessmentTemplateId: id, deletedAt: null } });
  if (refCount > 0) {
    throw AppError.conflict("AssessmentTemplate is referenced by active courses");
  }

  return withAudit(
    { actor, action: "assessmentTemplate.manage", entityType: "AssessmentTemplate", entityId: id, before: template, ...ctx },
    async (tx) => tx.assessmentTemplate.delete({ where: { id } }),
  );
}
