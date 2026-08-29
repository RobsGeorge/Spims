import {
  Currency,
  EnrollmentStatus,
  GradeType,
  OfferingMode,
  OfferingStatus,
  RefundStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { resolveRegionalCurrency } from "@/lib/money";
import {
  evaluateEnrollmentRules,
  isWithinAddDropWeek,
  isWithinWithdrawalWeek,
} from "@/lib/services/enrollmentRules";
import { resolveOfferingPricing } from "@/lib/services/offering";
import { creditWallet } from "@/lib/services/wallet";
import type { EnrollInput, EnrollmentOverrideInput } from "@/lib/validation/enrollment";

async function getEnrollmentPriceMinor(
  studentId: string,
  offeringId: string,
): Promise<{ amount: number; currency: Currency }> {
  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { course: true },
  });
  if (!offering) throw AppError.notFound("Offering");
  const user = await db.user.findUnique({ where: { id: studentId } });
  const currency = resolveRegionalCurrency(user?.countryCode);
  const pricing = resolveOfferingPricing(offering, offering.course);
  const amount = currency === "EGP" ? pricing.priceEgp : pricing.priceUsd;
  return { amount, currency };
}

export async function enrollStudent(
  actor: SessionUser,
  offeringId: string,
  input: EnrollInput,
  opts: { bypassRules?: boolean } = {},
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const rules = await evaluateEnrollmentRules({
    studentId: actor.id,
    offeringId,
    studentProgramId: input.studentProgramId,
    bypassRules: opts.bypassRules,
  });

  if (!rules.allowed) {
    throw AppError.validation(rules.errors.join("; "), { errors: rules.errors });
  }
  if (rules.warnings.length > 0 && !input.acknowledgeScheduleConflict) {
    throw AppError.validation("Schedule conflict — acknowledge to proceed", {
      warnings: rules.warnings,
      code: "SCHEDULE_CONFLICT",
    });
  }

  const status = rules.waitlist ? EnrollmentStatus.WAITLISTED : EnrollmentStatus.ENROLLED;

  const enrollment = await withAudit(
    { actor, action: "enrollment.self", entityType: "Enrollment", ...ctx },
    async (tx) =>
      tx.enrollment.upsert({
        where: {
          studentId_offeringId: { studentId: actor.id, offeringId },
        },
        create: {
          studentId: actor.id,
          offeringId,
          studentProgramId: input.studentProgramId ?? null,
          status,
        },
        update: { status, studentProgramId: input.studentProgramId ?? null },
        include: { offering: { include: { course: true } } },
      }),
  );

  if (status === EnrollmentStatus.ENROLLED) {
    await createInvoiceForEnrollment(actor, enrollment.id, ctx);
    const { notifyEnrollment } = await import("@/lib/services/notification");
    await notifyEnrollment(enrollment.studentId, enrollment.offering.course.title);
  }

  return enrollment;
}

async function createInvoiceForEnrollment(
  actor: SessionUser,
  enrollmentId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const { createInvoiceForEnrollment: create } = await import("@/lib/services/invoice");
  return create(actor, enrollmentId, ctx);
}

export async function overrideEnrollment(
  actor: SessionUser,
  offeringId: string,
  input: EnrollmentOverrideInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  return withAudit(
    {
      actor,
      action: "enrollment.override",
      entityType: "Enrollment",
      after: { reason: input.reason, studentId: input.studentId },
      ...ctx,
    },
    async (tx) =>
      tx.enrollment.upsert({
        where: {
          studentId_offeringId: { studentId: input.studentId, offeringId },
        },
        create: {
          studentId: input.studentId,
          offeringId,
          studentProgramId: input.studentProgramId ?? null,
          status: EnrollmentStatus.ENROLLED,
        },
        update: {
          status: EnrollmentStatus.ENROLLED,
          studentProgramId: input.studentProgramId ?? null,
        },
      }),
  ).then(async (enrollment) => {
    await createInvoiceForEnrollment(actor, enrollment.id, ctx);
    return enrollment;
  });
}

export async function dropEnrollment(
  actor: SessionUser,
  enrollmentId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      offering: { include: { semester: true, course: true } },
    },
  });
  if (!enrollment) throw AppError.notFound("Enrollment");
  if (enrollment.studentId !== actor.id) throw AppError.forbidden();

  const offering = enrollment.offering;
  if (
    offering.mode === OfferingMode.COHORT &&
    offering.semester &&
    !isWithinAddDropWeek(
      offering.semester.startDate,
      offering.semester.addDropEndWeek,
      new Date(),
    )
  ) {
    throw AppError.validation("Add/drop period has ended");
  }

  const { amount, currency } = await getEnrollmentPriceMinor(actor.id, offering.id);

  await withAudit(
    {
      actor,
      action: "enrollment.self",
      entityType: "Enrollment",
      entityId: enrollmentId,
      before: { status: enrollment.status },
      ...ctx,
    },
    async (tx) => {
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status: EnrollmentStatus.DROPPED, droppedAt: new Date() },
      });
      if (amount > 0 && !offering.course.isFree) {
        await tx.refund.create({
          data: {
            studentId: actor.id,
            enrollmentId,
            amountMinor: amount,
            currency,
            status: RefundStatus.APPROVED,
            reason: "Drop within add/drop window",
          },
        });
      }
    },
  );

  if (amount > 0 && !offering.course.isFree) {
    await creditWallet({
      userId: actor.id,
      currency,
      amountMinor: amount,
      reason: "REFUND",
      note: `Drop refund for offering ${offering.id}`,
    });
  }

  return { ok: true, refundedMinor: amount, currency };
}

export async function withdrawEnrollment(
  actor: SessionUser,
  enrollmentId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      offering: { include: { semester: true, course: true } },
    },
  });
  if (!enrollment) throw AppError.notFound("Enrollment");
  if (enrollment.studentId !== actor.id) throw AppError.forbidden();

  const semester = enrollment.offering.semester;
  if (!semester) throw AppError.validation("Withdrawal requires a semester offering");

  if (
    isWithinAddDropWeek(semester.startDate, semester.addDropEndWeek, new Date())
  ) {
    throw AppError.validation("Use drop during add/drop period");
  }
  if (
    !isWithinWithdrawalWeek(semester.startDate, semester.lastWithdrawalWeek, new Date())
  ) {
    throw AppError.validation("Withdrawal period has ended");
  }

  const refundPercent = semester.withdrawalRefundPercent;
  const { amount, currency } = await getEnrollmentPriceMinor(actor.id, enrollment.offeringId);
  const refundMinor = Math.round((amount * refundPercent) / 100);

  await withAudit(
    {
      actor,
      action: "enrollment.self",
      entityType: "Enrollment",
      entityId: enrollmentId,
      before: { status: enrollment.status },
      ...ctx,
    },
    async (tx) => {
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: EnrollmentStatus.WITHDRAWN,
          droppedAt: new Date(),
          gradeType: GradeType.WITHDRAWAL,
          finalLetter: "W",
        },
      });
      if (refundMinor > 0) {
        await tx.refund.create({
          data: {
            studentId: actor.id,
            enrollmentId,
            amountMinor: refundMinor,
            currency,
            status: RefundStatus.APPROVED,
            reason: `Withdrawal refund ${refundPercent}%`,
          },
        });
      }
    },
  );

  if (refundMinor > 0) {
    await creditWallet({
      userId: actor.id,
      currency,
      amountMinor: refundMinor,
      reason: "REFUND",
      note: `Withdrawal refund for enrollment ${enrollmentId}`,
    });
  }

  return { ok: true, refundedMinor: refundMinor, currency, grade: "W" };
}

export async function promoteWaitlist(
  actor: SessionUser,
  offeringId: string,
  count = 1,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const offering = await db.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");

  const enrolledCount = await db.enrollment.count({
    where: { offeringId, status: EnrollmentStatus.ENROLLED },
  });
  const capacity = offering.seatCapacity ?? Number.MAX_SAFE_INTEGER;
  const slots = Math.max(0, capacity - enrolledCount);
  const toPromote = Math.min(count, slots);

  const waitlisted = await db.enrollment.findMany({
    where: { offeringId, status: EnrollmentStatus.WAITLISTED },
    orderBy: { enrolledAt: "asc" },
    take: toPromote,
  });

  const result = await withAudit(
    { actor, action: "enrollment.waitlist", entityType: "CourseOffering", entityId: offeringId, ...ctx },
    async (tx) => {
      for (const e of waitlisted) {
        await tx.enrollment.update({
          where: { id: e.id },
          data: { status: EnrollmentStatus.ENROLLED },
        });
      }
      return { promoted: waitlisted.length, ids: waitlisted.map((w) => w.id) };
    },
  );

  for (const id of result.ids) {
    await createInvoiceForEnrollment(actor, id, ctx);
  }

  const { notifyWaitlistPromotion } = await import("@/lib/services/notification");
  const offeringWithCourse = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { course: true },
  });
  const courseTitle = offeringWithCourse?.course.title ?? "course";
  const promoted = await db.enrollment.findMany({
    where: { id: { in: result.ids }, status: EnrollmentStatus.ENROLLED },
    select: { studentId: true },
  });
  for (const e of promoted) {
    await notifyWaitlistPromotion(e.studentId, courseTitle);
  }

  return result;
}

export async function getStudentEnrollments(studentId: string) {
  return db.enrollment.findMany({
    where: { studentId },
    include: { offering: { include: { course: true, semester: true } } },
    orderBy: { enrolledAt: "desc" },
  });
}

export type StudentEnrollmentAction = "drop" | "withdraw" | null;

/** Determines whether drop or withdraw is available for a student enrollment. */
export function resolveEnrollmentAction(enrollment: {
  status: EnrollmentStatus;
  offering: {
    mode: OfferingMode;
    semester: {
      startDate: Date;
      addDropEndWeek: number;
      lastWithdrawalWeek: number;
    } | null;
  };
}): StudentEnrollmentAction {
  if (enrollment.status !== EnrollmentStatus.ENROLLED && enrollment.status !== EnrollmentStatus.WAITLISTED) {
    return null;
  }
  const now = new Date();
  const semester = enrollment.offering.semester;
  if (enrollment.offering.mode === OfferingMode.SELF_PACED || !semester) {
    if (enrollment.status === EnrollmentStatus.ENROLLED || enrollment.status === EnrollmentStatus.WAITLISTED) {
      return "drop";
    }
    return null;
  }
  if (isWithinAddDropWeek(semester.startDate, semester.addDropEndWeek, now)) {
    return "drop";
  }
  if (
    enrollment.status === EnrollmentStatus.ENROLLED &&
    isWithinWithdrawalWeek(semester.startDate, semester.lastWithdrawalWeek, now)
  ) {
    return "withdraw";
  }
  return null;
}

/** Admin console: open offerings with enrolled/waitlist counts and FIFO waitlist preview. */
export async function listEnrollmentConsole(opts: { limit?: number } = {}) {
  const limit = opts.limit ?? 50;
  const offerings = await db.courseOffering.findMany({
    where: {
      deletedAt: null,
      status: { in: [OfferingStatus.OPEN, OfferingStatus.IN_PROGRESS] },
    },
    include: {
      course: { select: { id: true, code: true, title: true } },
      semester: { select: { id: true, name: true } },
      enrollments: {
        where: { status: { in: [EnrollmentStatus.ENROLLED, EnrollmentStatus.WAITLISTED] } },
        orderBy: { enrolledAt: "asc" },
        select: {
          id: true,
          status: true,
          enrolledAt: true,
          student: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return offerings.map((offering) => {
    const enrolled = offering.enrollments.filter((e) => e.status === EnrollmentStatus.ENROLLED);
    const waitlisted = offering.enrollments.filter((e) => e.status === EnrollmentStatus.WAITLISTED);
    return {
      id: offering.id,
      mode: offering.mode,
      seatCapacity: offering.seatCapacity,
      course: offering.course,
      semester: offering.semester,
      enrolledCount: enrolled.length,
      waitlistCount: waitlisted.length,
      waitlist: waitlisted.slice(0, 10).map((e) => ({
        enrollmentId: e.id,
        enrolledAt: e.enrolledAt,
        student: e.student,
      })),
    };
  });
}
