import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { assertMinorUnits } from "@/lib/money";
import type { CreateCourseInput, UpdateCourseInput, SetPrerequisitesInput, SetPricingInput } from "@/lib/validation/course";

export async function listCourses(opts: { search?: string; page?: number; limit?: number } = {}) {
  const { search, page = 1, limit = 20 } = opts;
  const where = {
    deletedAt: null as null,
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { code: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    db.course.findMany({
      where,
      include: { assessmentTemplate: true, prerequisites: { include: { prerequisite: true } } },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.course.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function getCourseById(id: string) {
  const course = await db.course.findUnique({
    where: { id },
    include: {
      assessmentTemplate: { include: { components: true } },
      prerequisites: { include: { prerequisite: true } },
    },
  });
  if (!course || course.deletedAt) throw AppError.notFound("Course");
  return course;
}

export async function createCourse(
  actor: SessionUser,
  data: CreateCourseInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  return withAudit(
    { actor, action: "course.manage", entityType: "Course", ...ctx },
    async (tx) =>
      tx.course.create({
        data: {
          code: data.code,
          title: data.title,
          creditHours: data.creditHours,
          isFree: data.isFree ?? false,
          isStandalone: data.isStandalone ?? false,
          passingThreshold: data.passingThreshold,
          assessmentTemplateId: data.assessmentTemplateId,
        },
      }),
  );
}

export async function updateCourse(
  actor: SessionUser,
  id: string,
  data: UpdateCourseInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const before = await db.course.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw AppError.notFound("Course");

  return withAudit(
    {
      actor,
      action: "course.manage",
      entityType: "Course",
      entityId: id,
      before: { title: before.title, code: before.code },
      ...ctx,
    },
    async (tx) =>
      tx.course.update({
        where: { id },
        data: {
          ...(data.code !== undefined && { code: data.code }),
          ...(data.title !== undefined && { title: data.title }),
          ...(data.creditHours !== undefined && { creditHours: data.creditHours }),
          ...(data.isFree !== undefined && { isFree: data.isFree }),
          ...(data.isStandalone !== undefined && { isStandalone: data.isStandalone }),
          ...(data.passingThreshold !== undefined && { passingThreshold: data.passingThreshold }),
          ...(data.assessmentTemplateId !== undefined && { assessmentTemplateId: data.assessmentTemplateId }),
        },
      }),
  );
}

export async function deleteCourse(
  actor: SessionUser,
  id: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const course = await db.course.findUnique({ where: { id } });
  if (!course || course.deletedAt) throw AppError.notFound("Course");

  return withAudit(
    { actor, action: "course.manage", entityType: "Course", entityId: id, before: { title: course.title }, ...ctx },
    async (tx) => tx.course.update({ where: { id }, data: { deletedAt: new Date() } }),
  );
}

export async function setPrerequisites(
  actor: SessionUser,
  id: string,
  input: SetPrerequisitesInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const course = await db.course.findUnique({ where: { id } });
  if (!course || course.deletedAt) throw AppError.notFound("Course");

  return withAudit(
    {
      actor,
      action: "course.manage",
      entityType: "Course",
      entityId: id,
      before: { prerequisites: input.prerequisiteIds.length },
      ...ctx,
    },
    async (tx) => {
      await tx.coursePrerequisite.deleteMany({ where: { courseId: id } });
      if (input.prerequisiteIds.length > 0) {
        await tx.coursePrerequisite.createMany({
          data: input.prerequisiteIds.map((prerequisiteId) => ({ courseId: id, prerequisiteId })),
        });
      }
      return tx.course.findUnique({
        where: { id },
        include: { prerequisites: { include: { prerequisite: true } } },
      });
    },
  );
}

export async function setPricing(
  actor: SessionUser,
  id: string,
  data: SetPricingInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  assertMinorUnits(data.defaultPriceUsd);
  assertMinorUnits(data.defaultPriceEgp);

  const course = await db.course.findUnique({ where: { id } });
  if (!course || course.deletedAt) throw AppError.notFound("Course");

  return withAudit(
    {
      actor,
      action: "course.setPricing",
      entityType: "Course",
      entityId: id,
      before: { defaultPriceUsd: course.defaultPriceUsd, defaultPriceEgp: course.defaultPriceEgp },
      ...ctx,
    },
    async (tx) =>
      tx.course.update({
        where: { id },
        data: {
          defaultPriceUsd: data.defaultPriceUsd,
          defaultPriceEgp: data.defaultPriceEgp,
        },
      }),
  );
}

export async function flagInterest(
  actor: SessionUser,
  courseId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  return withAudit(
    { actor, action: "courseInterest.flag", entityType: "CourseInterestFlag", ...ctx },
    async (tx) =>
      tx.courseInterestFlag.upsert({
        where: { studentId_courseId: { studentId: actor.id, courseId } },
        create: { studentId: actor.id, courseId },
        update: {},
      }),
  );
}

export async function unflagInterest(
  actor: SessionUser,
  courseId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  return withAudit(
    { actor, action: "courseInterest.flag", entityType: "CourseInterestFlag", ...ctx },
    async (tx) => {
      await tx.courseInterestFlag.deleteMany({
        where: { studentId: actor.id, courseId },
      });
      return { ok: true };
    },
  );
}

export async function getInterestCount(courseId: string) {
  const count = await db.courseInterestFlag.count({ where: { courseId } });
  return { count };
}

export async function getInterestCountsByCourseIds(courseIds: string[]) {
  if (courseIds.length === 0) return {} as Record<string, number>;
  const rows = await db.courseInterestFlag.groupBy({
    by: ["courseId"],
    where: { courseId: { in: courseIds } },
    _count: { courseId: true },
  });
  return Object.fromEntries(rows.map((r) => [r.courseId, r._count.courseId]));
}

export async function getStudentInterestCourseIds(studentId: string) {
  const flags = await db.courseInterestFlag.findMany({
    where: { studentId },
    select: { courseId: true },
  });
  return flags.map((f) => f.courseId);
}
