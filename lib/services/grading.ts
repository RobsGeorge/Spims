import { GradeStatus, GradeType } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { computeEnrollmentPercent, isGradeLocked } from "@/lib/services/gradebook";
import type { ReopenGradesInput } from "@/lib/validation/assessment";

function letterForPercent(
  percent: number,
  bands: Array<{ letter: string; minPercent: number; maxPercent: number; gpaPoints: number; isPassing: boolean }>,
) {
  const band = bands.find((b) => percent >= b.minPercent && percent <= b.maxPercent);
  if (!band) {
    const sorted = [...bands].sort((a, b) => a.minPercent - b.minPercent);
    return sorted[0] ?? { letter: "F", gpaPoints: 0, isPassing: false };
  }
  return band;
}

async function resolveGradingScheme(offeringId: string) {
  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: {
      course: true,
      enrollments: {
        where: { status: "ENROLLED" },
        include: { studentProgram: { include: { program: { include: { gradingScheme: { include: { bands: true } } } } } } },
        take: 1,
      },
    },
  });
  if (!offering) throw AppError.notFound("Offering");

  let scheme = offering.enrollments[0]?.studentProgram?.program.gradingScheme;
  if (!scheme) {
    scheme = await db.gradingScheme.findFirst({
      where: { isDefault: true },
      include: { bands: true },
    });
  }
  if (!scheme) throw AppError.validation("No grading scheme configured");
  return { offering, scheme };
}

export async function lockOfferingGrades(
  actor: SessionUser,
  offeringId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const { offering, scheme } = await resolveGradingScheme(offeringId);
  const passingThreshold = offering.course.passingThreshold ?? 60;

  const enrollments = await db.enrollment.findMany({
    where: { offeringId, status: "ENROLLED" },
    include: { studentProgram: true },
  });

  return withAudit(
    { actor, action: "grade.lock", entityType: "CourseOffering", entityId: offeringId, ...ctx },
    async (tx) => {
      const locked = [];
      for (const enrollment of enrollments) {
        if (isGradeLocked(enrollment.gradeStatus)) continue;

        const { percent } = await computeEnrollmentPercent(offeringId, enrollment.studentId, false);
        if (percent == null && enrollment.gradeType === GradeType.IN_PROGRESS) {
          continue;
        }

        const effectivePercent = percent ?? 0;
        const band = letterForPercent(effectivePercent, scheme.bands);
        const isPassing = band.isPassing && effectivePercent >= passingThreshold;

        let gpaPoints = enrollment.gradeType === GradeType.PASS_FAIL ? 0 : band.gpaPoints;
        let letterGrade = band.letter;
        if (enrollment.gradeType === GradeType.WITHDRAWAL) letterGrade = "W";
        if (enrollment.gradeType === GradeType.AUDIT) letterGrade = "AU";
        if (enrollment.gradeType === GradeType.IN_PROGRESS) letterGrade = "IP";
        if (enrollment.isAudit) {
          letterGrade = "AU";
          gpaPoints = 0;
        }

        const term =
          offering.semesterId != null
            ? (await tx.semester.findUnique({ where: { id: offering.semesterId! } }))?.name ?? "Term"
            : "Self-paced";

        const record = await tx.academicRecord.upsert({
          where: { enrollmentId: enrollment.id },
          create: {
            studentId: enrollment.studentId,
            courseId: offering.courseId,
            enrollmentId: enrollment.id,
            letterGrade,
            percent: effectivePercent,
            gpaPoints,
            creditHours: offering.course.creditHours,
            term,
            isPassing,
          },
          update: {
            letterGrade,
            percent: effectivePercent,
            gpaPoints,
            isPassing,
            completedAt: new Date(),
          },
        });

        if (isPassing && enrollment.studentProgramId) {
          const programCourse = await tx.programCourse.findUnique({
            where: {
              programId_courseId: {
                programId: enrollment.studentProgram!.programId,
                courseId: offering.courseId,
              },
            },
          });
          if (programCourse) {
            await tx.programRequirementFulfillment.upsert({
              where: {
                studentProgramId_programCourseId: {
                  studentProgramId: enrollment.studentProgramId,
                  programCourseId: programCourse.id,
                },
              },
              create: {
                studentProgramId: enrollment.studentProgramId,
                programCourseId: programCourse.id,
                academicRecordId: record.id,
              },
              update: { academicRecordId: record.id },
            });
          }
        }

        const studentPrograms = await tx.studentProgram.findMany({
          where: { studentId: enrollment.studentId, status: "ACTIVE" },
        });
        for (const sp of studentPrograms) {
          const pc = await tx.programCourse.findUnique({
            where: { programId_courseId: { programId: sp.programId, courseId: offering.courseId } },
          });
          if (!pc || !isPassing) continue;
          await tx.programRequirementFulfillment.upsert({
            where: {
              studentProgramId_programCourseId: {
                studentProgramId: sp.id,
                programCourseId: pc.id,
              },
            },
            create: {
              studentProgramId: sp.id,
              programCourseId: pc.id,
              academicRecordId: record.id,
            },
            update: { academicRecordId: record.id },
          });
        }

        for (const sp of studentPrograms) {
          const records = await tx.academicRecord.findMany({
            where: {
              studentId: enrollment.studentId,
              isPassing: true,
              gpaPoints: { gt: 0 },
            },
          });
          const fulfillments = await tx.programRequirementFulfillment.findMany({
            where: { studentProgramId: sp.id },
            include: { academicRecord: true },
          });
          const fulfilledRecords = fulfillments.map((f) => f.academicRecord);
          const relevant = records.filter((r) =>
            fulfilledRecords.some((fr) => fr.id === r.id),
          );
          if (relevant.length > 0) {
            const avg = relevant.reduce((s, r) => s + r.gpaPoints, 0) / relevant.length;
            await tx.studentProgram.update({
              where: { id: sp.id },
              data: { cachedGpa: Math.round(avg * 100) / 100 },
            });
          }
        }

        await tx.enrollment.update({
          where: { id: enrollment.id },
          data: {
            gradeStatus: GradeStatus.LOCKED,
            finalPercent: effectivePercent,
            finalLetter: letterGrade,
            finalGpaPoints: gpaPoints,
            gradeLockedById: actor.id,
            gradeLockedAt: new Date(),
          },
        });

        locked.push(enrollment.id);
      }
      return { locked: locked.length, enrollmentIds: locked };
    },
  );
}

export async function reopenOfferingGrades(
  actor: SessionUser,
  offeringId: string,
  data: ReopenGradesInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  return withAudit(
    {
      actor,
      action: "grade.reopen",
      entityType: "CourseOffering",
      entityId: offeringId,
      after: { reason: data.reason },
      ...ctx,
    },
    async (tx) => {
      const result = await tx.enrollment.updateMany({
        where: { offeringId, gradeStatus: GradeStatus.LOCKED },
        data: { gradeStatus: GradeStatus.IN_PROGRESS, gradeLockedById: null, gradeLockedAt: null },
      });
      return { reopened: result.count };
    },
  );
}

export async function getStudentTranscript(studentId: string) {
  return db.academicRecord.findMany({
    where: { studentId },
    include: { course: { select: { code: true, title: true, creditHours: true } } },
    orderBy: { completedAt: "desc" },
  });
}
