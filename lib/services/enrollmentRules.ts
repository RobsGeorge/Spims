import { OfferingMode } from "@prisma/client";
import { db } from "@/lib/db";
import { hasFinancialHold } from "@/lib/services/wallet";

export type EnrollmentRuleContext = {
  studentId: string;
  offeringId: string;
  studentProgramId?: string;
  bypassRules?: boolean;
};

export type EnrollmentRuleResult = {
  allowed: boolean;
  waitlist: boolean;
  errors: string[];
  warnings: string[];
};

function semesterWeekNumber(semesterStart: Date, now: Date): number {
  const ms = now.getTime() - semesterStart.getTime();
  return Math.max(1, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1);
}

export async function evaluateEnrollmentRules(
  ctx: EnrollmentRuleContext,
): Promise<EnrollmentRuleResult> {
  if (ctx.bypassRules) {
    return { allowed: true, waitlist: false, errors: [], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const now = new Date();

  const offering = await db.courseOffering.findUnique({
    where: { id: ctx.offeringId },
    include: {
      course: {
        include: {
          prerequisites: true,
          programCourses: true,
        },
      },
      semester: true,
      liveSessions: true,
    },
  });
  if (!offering || offering.deletedAt) {
    return { allowed: false, waitlist: false, errors: ["Offering not found"], warnings: [] };
  }

  const existing = await db.enrollment.findUnique({
    where: {
      studentId_offeringId: { studentId: ctx.studentId, offeringId: ctx.offeringId },
    },
  });
  if (existing && ["ENROLLED", "WAITLISTED"].includes(existing.status)) {
    errors.push("Already enrolled or waitlisted");
  }

  if (offering.mode === OfferingMode.COHORT) {
    if (!offering.semester) {
      errors.push("Cohort offering has no semester");
    } else {
      const { registrationStart, registrationEnd } = offering.semester;
      if (now < registrationStart || now > registrationEnd) {
        errors.push("Outside registration window");
      }
    }
  }

  if (await hasFinancialHold(ctx.studentId)) {
    errors.push("Financial hold — unpaid invoice");
  }

  for (const prereq of offering.course.prerequisites) {
    const record = await db.academicRecord.findFirst({
      where: {
        studentId: ctx.studentId,
        courseId: prereq.prerequisiteId,
        isPassing: true,
      },
    });
    if (!record) {
      errors.push(`Missing prerequisite for course ${prereq.prerequisiteId}`);
    }
  }

  const course = offering.course;
  if (!course.isStandalone) {
    if (!ctx.studentProgramId) {
      errors.push("Program enrollment required for non-standalone courses");
    } else {
      const sp = await db.studentProgram.findUnique({
        where: { id: ctx.studentProgramId },
        include: { program: { include: { programCourses: true } } },
      });
      if (!sp || sp.studentId !== ctx.studentId || sp.status !== "ACTIVE") {
        errors.push("Invalid student program");
      } else {
        const inProgram = sp.program.programCourses.some((pc) => pc.courseId === course.id);
        if (!inProgram) errors.push("Course not in selected program");
      }
    }
  }

  if (offering.semesterId && offering.mode === OfferingMode.COHORT) {
    const semesterEnrollments = await db.enrollment.findMany({
      where: {
        studentId: ctx.studentId,
        status: "ENROLLED",
        offering: { semesterId: offering.semesterId },
      },
      include: { offering: { include: { course: true } } },
    });
    const program = ctx.studentProgramId
      ? await db.studentProgram.findUnique({
          where: { id: ctx.studentProgramId },
          include: { program: true },
        })
      : null;
    if (program) {
      const credits = semesterEnrollments.reduce(
        (sum, e) => sum + e.offering.course.creditHours,
        0,
      );
      const courses = semesterEnrollments.length;
      if (credits + course.creditHours > program.program.maxCreditsPerSemester) {
        errors.push("Exceeds max credits per semester");
      }
      if (courses + 1 > program.program.maxCoursesPerSemester) {
        errors.push("Exceeds max courses per semester");
      }
    }
  }

  let waitlist = false;
  if (offering.seatCapacity != null) {
    const enrolledCount = await db.enrollment.count({
      where: { offeringId: offering.id, status: "ENROLLED" },
    });
    if (enrolledCount >= offering.seatCapacity) {
      waitlist = true;
    }
  }

  const studentSessions = await db.enrollment.findMany({
    where: { studentId: ctx.studentId, status: "ENROLLED" },
    include: { offering: { include: { liveSessions: true } } },
  });
  const targetSessions = offering.liveSessions;
  for (const enr of studentSessions) {
    if (enr.offeringId === offering.id) continue;
    for (const a of enr.offering.liveSessions) {
      for (const b of targetSessions) {
        const aEnd = a.scheduledStart.getTime() + a.durationMinutes * 60_000;
        const bEnd = b.scheduledStart.getTime() + b.durationMinutes * 60_000;
        if (a.scheduledStart < new Date(bEnd) && b.scheduledStart < new Date(aEnd)) {
          warnings.push("Schedule conflict with another enrolled course");
        }
      }
    }
  }

  return {
    allowed: errors.length === 0,
    waitlist,
    errors,
    warnings,
  };
}

export function isWithinAddDropWeek(
  semesterStart: Date,
  addDropEndWeek: number,
  now: Date,
): boolean {
  return semesterWeekNumber(semesterStart, now) <= addDropEndWeek;
}

export function isWithinWithdrawalWeek(
  semesterStart: Date,
  lastWithdrawalWeek: number,
  now: Date,
): boolean {
  return semesterWeekNumber(semesterStart, now) <= lastWithdrawalWeek;
}

export { semesterWeekNumber };
