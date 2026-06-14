import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import type { CreateAcademicYearInput } from "@/lib/validation/academicYear";

export async function listAcademicYears() {
  return db.academicYear.findMany({
    include: { semesters: true },
    orderBy: { startDate: "desc" },
  });
}

export async function createAcademicYear(
  actor: SessionUser,
  data: CreateAcademicYearInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  return withAudit(
    { actor, action: "semester.manage", entityType: "AcademicYear", ...ctx },
    async (tx) =>
      tx.academicYear.create({
        data: {
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
        },
      }),
  );
}
