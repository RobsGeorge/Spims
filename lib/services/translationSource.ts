import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

const FIELD_RESOLVERS: Record<
  string,
  Record<string, (id: string) => Promise<string | null>>
> = {
  Course: {
    title: async (id) => {
      const row = await db.course.findUnique({ where: { id }, select: { title: true, deletedAt: true } });
      if (!row || row.deletedAt) return null;
      return row.title;
    },
    code: async (id) => {
      const row = await db.course.findUnique({ where: { id }, select: { code: true, deletedAt: true } });
      if (!row || row.deletedAt) return null;
      return row.code;
    },
  },
  Program: {
    name: async (id) => {
      const row = await db.program.findUnique({ where: { id }, select: { name: true, deletedAt: true } });
      if (!row || row.deletedAt) return null;
      return row.name;
    },
    code: async (id) => {
      const row = await db.program.findUnique({ where: { id }, select: { code: true, deletedAt: true } });
      if (!row || row.deletedAt) return null;
      return row.code;
    },
  },
  GradingScheme: {
    name: async (id) => {
      const row = await db.gradingScheme.findUnique({ where: { id }, select: { name: true } });
      return row?.name ?? null;
    },
  },
  AssessmentTemplate: {
    name: async (id) => {
      const row = await db.assessmentTemplate.findUnique({ where: { id }, select: { name: true } });
      return row?.name ?? null;
    },
  },
};

export async function resolveTranslationSourceText(
  entityType: string,
  entityId: string,
  field: string,
): Promise<string> {
  const resolver = FIELD_RESOLVERS[entityType]?.[field];
  if (!resolver) {
    throw AppError.badRequest(`Unsupported translation field: ${entityType}.${field}`);
  }
  const text = await resolver(entityId);
  if (!text) throw AppError.notFound(entityType);
  return text;
}
