import { OfferingMode, OfferingStatus, RoleType } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { assertMinorUnits } from "@/lib/money";
import { getStaffOfferingIds } from "@/lib/services/offeringScope";
import type {
  CloneOfferingInput,
  CreateOfferingInput,
  SetOfferingPricingInput,
  SetOfferingStaffInput,
  UpdateOfferingInput,
} from "@/lib/validation/offering";

const offeringInclude = {
  course: true,
  semester: { include: { academicYear: true } },
  staff: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } },
  weeks: { orderBy: { order: "asc" as const }, include: { items: { orderBy: { order: "asc" as const } } } },
};

export async function listOfferings(
  actor: SessionUser,
  opts: { courseId?: string; page?: number; limit?: number } = {},
) {
  const { courseId, page = 1, limit = 20 } = opts;
  const isAca =
    actor.roles.includes(RoleType.ACADEMIC_ADMIN) ||
    actor.roles.includes(RoleType.SUPER_ADMIN);

  let offeringIds: string[] | undefined;
  if (!isAca) {
    offeringIds = await getStaffOfferingIds(actor.id);
    if (offeringIds.length === 0) {
      return { items: [], total: 0, page, limit };
    }
  }

  const where = {
    deletedAt: null as null,
    ...(courseId && { courseId }),
    ...(offeringIds && { id: { in: offeringIds } }),
  };

  const [items, total] = await Promise.all([
    db.courseOffering.findMany({
      where,
      include: {
        course: true,
        semester: true,
        staff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        _count: { select: { weeks: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.courseOffering.count({ where }),
  ]);

  return { items, total, page, limit };
}

/** Student-facing catalog — all non-deleted enrollable offerings. */
export async function listCatalogOfferings(opts: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = opts;
  const where = {
    deletedAt: null as null,
    status: { in: [OfferingStatus.OPEN, OfferingStatus.IN_PROGRESS] },
  };

  const [items, total] = await Promise.all([
    db.courseOffering.findMany({
      where,
      include: { course: true, semester: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.courseOffering.count({ where }),
  ]);

  return { items, total, page, limit };
}

export async function getOfferingById(id: string) {
  const offering = await db.courseOffering.findUnique({
    where: { id },
    include: offeringInclude,
  });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");
  return offering;
}

export function resolveOfferingPricing(
  offering: { priceUsdOverride: number | null; priceEgpOverride: number | null },
  course: { defaultPriceUsd: number; defaultPriceEgp: number; isFree: boolean },
) {
  return {
    priceUsd: offering.priceUsdOverride ?? course.defaultPriceUsd,
    priceEgp: offering.priceEgpOverride ?? course.defaultPriceEgp,
    isFree: course.isFree,
  };
}

export async function createOffering(
  actor: SessionUser,
  data: CreateOfferingInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const course = await db.course.findUnique({ where: { id: data.courseId } });
  if (!course || course.deletedAt) throw AppError.notFound("Course");

  if (data.mode === OfferingMode.COHORT && !data.semesterId) {
    throw AppError.validation("Cohort offerings require a semester");
  }
  if (data.semesterId) {
    const semester = await db.semester.findUnique({ where: { id: data.semesterId } });
    if (!semester) throw AppError.notFound("Semester");
  }

  return withAudit(
    { actor, action: "offering.manage", entityType: "CourseOffering", ...ctx },
    async (tx) =>
      tx.courseOffering.create({
        data: {
          courseId: data.courseId,
          mode: data.mode,
          semesterId: data.semesterId ?? null,
          seatCapacity: data.seatCapacity ?? null,
          attendanceThresholdPercent: data.attendanceThresholdPercent ?? 60,
          status: data.status,
          startDate: data.startDate ?? null,
          endDate: data.endDate ?? null,
        },
        include: offeringInclude,
      }),
  );
}

export async function updateOffering(
  actor: SessionUser,
  id: string,
  data: UpdateOfferingInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const before = await db.courseOffering.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw AppError.notFound("Offering");

  if (data.semesterId) {
    const semester = await db.semester.findUnique({ where: { id: data.semesterId } });
    if (!semester) throw AppError.notFound("Semester");
  }

  return withAudit(
    {
      actor,
      action: "offering.manage",
      entityType: "CourseOffering",
      entityId: id,
      before,
      ...ctx,
    },
    async (tx) =>
      tx.courseOffering.update({
        where: { id },
        data: {
          ...data,
          semesterId: data.semesterId === undefined ? undefined : data.semesterId ?? null,
        },
        include: offeringInclude,
      }),
  );
}

export async function cloneOfferingContent(
  actor: SessionUser,
  targetOfferingId: string,
  input: CloneOfferingInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const [target, source] = await Promise.all([
    db.courseOffering.findUnique({
      where: { id: targetOfferingId },
      include: { weeks: true },
    }),
    db.courseOffering.findUnique({
      where: { id: input.sourceOfferingId },
      include: { weeks: { include: { items: true }, orderBy: { order: "asc" } } },
    }),
  ]);

  if (!target || target.deletedAt) throw AppError.notFound("Offering");
  if (!source || source.deletedAt) throw AppError.notFound("Source offering");
  if (target.courseId !== source.courseId) {
    throw AppError.validation("Source offering must be for the same course");
  }
  if (target.weeks.length > 0) {
    throw AppError.conflict("Target offering already has content");
  }

  return withAudit(
    {
      actor,
      action: "offering.manage",
      entityType: "CourseOffering",
      entityId: targetOfferingId,
      ...ctx,
    },
    async (tx) => {
      for (const week of source.weeks) {
        const newWeek = await tx.week.create({
          data: {
            offeringId: targetOfferingId,
            number: week.number,
            title: week.title,
            unlockDate: week.unlockDate,
            order: week.order,
          },
        });
        if (week.items.length > 0) {
          await tx.contentItem.createMany({
            data: week.items.map((item) => ({
              weekId: newWeek.id,
              type: item.type,
              title: item.title,
              order: item.order,
              vimeoId: item.vimeoId,
              fileUrl: item.fileUrl,
              body: item.body,
            })),
          });
        }
      }
      return tx.courseOffering.findUnique({
        where: { id: targetOfferingId },
        include: offeringInclude,
      });
    },
  );
}

export async function setOfferingStaff(
  actor: SessionUser,
  offeringId: string,
  input: SetOfferingStaffInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const offering = await db.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");

  for (const member of input.staff) {
    const user = await db.user.findUnique({ where: { id: member.userId } });
    if (!user) throw AppError.notFound("User");
  }

  return withAudit(
    {
      actor,
      action: "offering.staff",
      entityType: "CourseOffering",
      entityId: offeringId,
      ...ctx,
    },
    async (tx) => {
      await tx.offeringStaff.deleteMany({ where: { offeringId } });
      if (input.staff.length > 0) {
        await tx.offeringStaff.createMany({
          data: input.staff.map((s) => ({
            offeringId,
            userId: s.userId,
            role: s.role,
          })),
        });
      }
      return tx.courseOffering.findUnique({
        where: { id: offeringId },
        include: offeringInclude,
      });
    },
  );
}

export async function setOfferingPricing(
  actor: SessionUser,
  offeringId: string,
  data: SetOfferingPricingInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  if (data.priceUsdOverride !== null) assertMinorUnits(data.priceUsdOverride);
  if (data.priceEgpOverride !== null) assertMinorUnits(data.priceEgpOverride);

  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { course: true },
  });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");

  return withAudit(
    {
      actor,
      action: "offering.setPricing",
      entityType: "CourseOffering",
      entityId: offeringId,
      before: {
        priceUsdOverride: offering.priceUsdOverride,
        priceEgpOverride: offering.priceEgpOverride,
      },
      ...ctx,
    },
    async (tx) =>
      tx.courseOffering.update({
        where: { id: offeringId },
        data: {
          priceUsdOverride: data.priceUsdOverride,
          priceEgpOverride: data.priceEgpOverride,
        },
        include: offeringInclude,
      }),
  );
}

export async function getOfferingPreview(offeringId: string) {
  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: {
      course: true,
      weeks: {
        orderBy: { order: "asc" },
        include: { items: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");

  const week1 = offering.weeks.find((w) => w.number === 1);
  const pricing = resolveOfferingPricing(offering, offering.course);

  return {
    offering: {
      id: offering.id,
      mode: offering.mode,
      status: offering.status,
      course: {
        id: offering.course.id,
        code: offering.course.code,
        title: offering.course.title,
      },
      pricing,
    },
    weeks: offering.weeks.map((w) => ({ number: w.number, title: w.title })),
    week1Items: week1?.items ?? [],
  };
}

export async function studentHasPassedCourse(studentId: string, courseId: string): Promise<boolean> {
  const record = await db.academicRecord.findFirst({
    where: { studentId, courseId, isPassing: true },
  });
  return Boolean(record);
}
