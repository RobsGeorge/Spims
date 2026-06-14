import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { CreateProgramInput, UpdateProgramInput, SetProgramRequirementsInput } from "@/lib/validation/program";

export async function listPrograms(opts: { search?: string; page?: number; limit?: number } = {}) {
  const { search, page = 1, limit = 20 } = opts;
  const where = {
    deletedAt: null as null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { code: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    db.program.findMany({
      where,
      include: { gradingScheme: true, programCourses: { include: { course: true } } },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.program.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function getProgramById(id: string) {
  const program = await db.program.findUnique({
    where: { id },
    include: {
      gradingScheme: { include: { bands: true } },
      programCourses: { include: { course: true } },
    },
  });
  if (!program || program.deletedAt) throw AppError.notFound("Program");
  return program;
}

export async function createProgram(
  actor: SessionUser,
  data: CreateProgramInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  return withAudit(
    { actor, action: "program.manage", entityType: "Program", ...ctx },
    async (tx) =>
      tx.program.create({
        data: {
          code: data.code,
          name: data.name,
          type: data.type,
          passingThreshold: data.passingThreshold ?? 60,
          maxCreditsPerSemester: data.maxCreditsPerSemester,
          maxCoursesPerSemester: data.maxCoursesPerSemester,
          maxSemestersToGraduate: data.maxSemestersToGraduate,
          electiveCreditsRequired: data.electiveCreditsRequired ?? 0,
          signatoryName: data.signatoryName,
          signatoryTitle: data.signatoryTitle,
          gradingSchemeId: data.gradingSchemeId,
        },
      }),
  );
}

export async function updateProgram(
  actor: SessionUser,
  id: string,
  data: UpdateProgramInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const before = await db.program.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw AppError.notFound("Program");

  return withAudit(
    {
      actor,
      action: "program.manage",
      entityType: "Program",
      entityId: id,
      before: { name: before.name, code: before.code },
      ...ctx,
    },
    async (tx) =>
      tx.program.update({
        where: { id },
        data: {
          ...(data.code !== undefined && { code: data.code }),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.passingThreshold !== undefined && { passingThreshold: data.passingThreshold }),
          ...(data.maxCreditsPerSemester !== undefined && { maxCreditsPerSemester: data.maxCreditsPerSemester }),
          ...(data.maxCoursesPerSemester !== undefined && { maxCoursesPerSemester: data.maxCoursesPerSemester }),
          ...(data.maxSemestersToGraduate !== undefined && { maxSemestersToGraduate: data.maxSemestersToGraduate }),
          ...(data.electiveCreditsRequired !== undefined && { electiveCreditsRequired: data.electiveCreditsRequired }),
          ...(data.signatoryName !== undefined && { signatoryName: data.signatoryName }),
          ...(data.signatoryTitle !== undefined && { signatoryTitle: data.signatoryTitle }),
          ...(data.gradingSchemeId !== undefined && { gradingSchemeId: data.gradingSchemeId }),
        },
      }),
  );
}

export async function deleteProgram(
  actor: SessionUser,
  id: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const program = await db.program.findUnique({ where: { id } });
  if (!program || program.deletedAt) throw AppError.notFound("Program");

  return withAudit(
    { actor, action: "program.manage", entityType: "Program", entityId: id, before: { name: program.name }, ...ctx },
    async (tx) => tx.program.update({ where: { id }, data: { deletedAt: new Date() } }),
  );
}

export async function setRequirements(
  actor: SessionUser,
  id: string,
  input: SetProgramRequirementsInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const program = await db.program.findUnique({ where: { id } });
  if (!program || program.deletedAt) throw AppError.notFound("Program");

  return withAudit(
    {
      actor,
      action: "program.manage",
      entityType: "Program",
      entityId: id,
      before: { requirements: `${input.requirements.length} items` },
      ...ctx,
    },
    async (tx) => {
      await tx.programCourse.deleteMany({ where: { programId: id } });
      if (input.requirements.length > 0) {
        await tx.programCourse.createMany({
          data: input.requirements.map((r) => ({
            programId: id,
            courseId: r.courseId,
            requirement: r.requirement,
            yearLevel: r.yearLevel,
          })),
        });
      }
      return tx.program.findUnique({
        where: { id },
        include: { programCourses: { include: { course: true } } },
      });
    },
  );
}
