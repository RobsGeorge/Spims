import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { CreateSemesterInput, UpdateSemesterInput } from "@/lib/validation/semester";

export async function listSemesters(opts: { academicYearId?: string } = {}) {
  return db.semester.findMany({
    where: opts.academicYearId ? { academicYearId: opts.academicYearId } : undefined,
    include: { academicYear: true },
    orderBy: { startDate: "desc" },
  });
}

export async function getSemesterById(id: string) {
  const semester = await db.semester.findUnique({
    where: { id },
    include: { academicYear: true },
  });
  if (!semester) throw AppError.notFound("Semester");
  return semester;
}

export async function createSemester(
  actor: SessionUser,
  data: CreateSemesterInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const year = await db.academicYear.findUnique({ where: { id: data.academicYearId } });
  if (!year) throw AppError.notFound("Academic year");

  return withAudit(
    { actor, action: "semester.manage", entityType: "Semester", ...ctx },
    async (tx) =>
      tx.semester.create({
        data: {
          academicYearId: data.academicYearId,
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          registrationStart: data.registrationStart,
          registrationEnd: data.registrationEnd,
          addDropEndWeek: data.addDropEndWeek,
          lastWithdrawalWeek: data.lastWithdrawalWeek,
          withdrawalRefundPercent: data.withdrawalRefundPercent ?? 0,
          status: data.status,
        },
        include: { academicYear: true },
      }),
  );
}

export async function updateSemester(
  actor: SessionUser,
  id: string,
  data: UpdateSemesterInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const before = await db.semester.findUnique({ where: { id } });
  if (!before) throw AppError.notFound("Semester");

  return withAudit(
    {
      actor,
      action: "semester.manage",
      entityType: "Semester",
      entityId: id,
      before,
      ...ctx,
    },
    async (tx) =>
      tx.semester.update({
        where: { id },
        data,
        include: { academicYear: true },
      }),
  );
}
