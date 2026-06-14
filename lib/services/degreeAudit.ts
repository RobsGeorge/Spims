import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function getDegreeAudit(studentId: string, programId: string) {
  const studentProgram = await db.studentProgram.findUnique({
    where: { studentId_programId: { studentId, programId } },
    include: {
      program: {
        include: {
          programCourses: { include: { course: true } },
        },
      },
    },
  });
  if (!studentProgram) throw AppError.notFound("Student program");

  const records = await db.academicRecord.findMany({
    where: { studentId, isPassing: true },
  });
  const recordByCourse = new Map(records.map((r) => [r.courseId, r]));

  const requirements = studentProgram.program.programCourses.map((pc) => {
    const record = recordByCourse.get(pc.courseId);
    return {
      courseId: pc.courseId,
      courseCode: pc.course.code,
      courseTitle: pc.course.title,
      requirement: pc.requirement,
      yearLevel: pc.yearLevel,
      creditHours: pc.course.creditHours,
      met: Boolean(record),
      record: record
        ? {
            letterGrade: record.letterGrade,
            percent: record.percent,
            completedAt: record.completedAt,
          }
        : null,
    };
  });

  const met = requirements.filter((r) => r.met);
  const remaining = requirements.filter((r) => !r.met);
  const electiveCreditsMet = met
    .filter((r) => r.requirement === "ELECTIVE")
    .reduce((s, r) => s + r.creditHours, 0);
  const electiveCreditsRequired = studentProgram.program.electiveCreditsRequired;

  return {
    program: {
      id: studentProgram.program.id,
      code: studentProgram.program.code,
      name: studentProgram.program.name,
    },
    studentProgramId: studentProgram.id,
    status: studentProgram.status,
    met,
    remaining,
    electiveCreditsMet,
    electiveCreditsRequired,
    electiveCreditsSatisfied: electiveCreditsMet >= electiveCreditsRequired,
  };
}
