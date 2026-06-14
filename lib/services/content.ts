import { ContentItemType } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { buildWeekUnlockMap } from "@/lib/services/offeringAccess";
import { studentHasPassedCourse } from "@/lib/services/offering";
import type {
  CreateContentItemInput,
  CreateWeekInput,
  UpdateContentItemInput,
} from "@/lib/validation/content";

async function getWeekOfferingId(weekId: string): Promise<string> {
  const week = await db.week.findUnique({ where: { id: weekId }, select: { offeringId: true } });
  if (!week) throw AppError.notFound("Week");
  return week.offeringId;
}

async function getItemOfferingId(itemId: string): Promise<string> {
  const item = await db.contentItem.findUnique({
    where: { id: itemId },
    include: { week: { select: { offeringId: true } } },
  });
  if (!item) throw AppError.notFound("Content item");
  return item.week.offeringId;
}

function validateContentItemPayload(type: ContentItemType, data: CreateContentItemInput | UpdateContentItemInput) {
  if (type === ContentItemType.VIDEO && !data.vimeoId) {
    throw AppError.validation("Vimeo ID is required for video items");
  }
  if (type === ContentItemType.READING && !data.fileUrl) {
    throw AppError.validation("File URL is required for reading items");
  }
  if (type === ContentItemType.TEXT && !data.body) {
    throw AppError.validation("Body is required for text items");
  }
}

export async function listWeeks(offeringId: string) {
  const offering = await db.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");

  return db.week.findMany({
    where: { offeringId },
    include: { items: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
}

export async function listWeeksWithAccess(
  offeringId: string,
  studentId: string,
  completedWeekNumbers: number[] = [],
) {
  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { weeks: { orderBy: { order: "asc" } } },
  });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");

  const hasPassed = await studentHasPassedCourse(studentId, offering.courseId);
  const unlockMap = buildWeekUnlockMap(offering.weeks, {
    offeringMode: offering.mode,
    now: new Date(),
    completedWeekNumbers,
    hasPassed,
  });

  const weeks = await listWeeks(offeringId);
  return weeks.map((week) => ({
    ...week,
    unlocked: unlockMap[week.number] ?? false,
    items: unlockMap[week.number] ? week.items : [],
  }));
}

export async function createWeek(
  actor: SessionUser,
  offeringId: string,
  data: CreateWeekInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const offering = await db.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");

  return withAudit(
    {
      actor,
      action: "offering.editContent",
      entityType: "Week",
      ...ctx,
    },
    async (tx) =>
      tx.week.create({
        data: {
          offeringId,
          number: data.number,
          title: data.title,
          unlockDate: data.unlockDate ?? null,
          order: data.order ?? data.number,
        },
        include: { items: true },
      }),
  );
}

export async function createContentItem(
  actor: SessionUser,
  weekId: string,
  data: CreateContentItemInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  validateContentItemPayload(data.type, data);

  const week = await db.week.findUnique({ where: { id: weekId } });
  if (!week) throw AppError.notFound("Week");

  return withAudit(
    {
      actor,
      action: "offering.editContent",
      entityType: "ContentItem",
      ...ctx,
    },
    async (tx) =>
      tx.contentItem.create({
        data: {
          weekId,
          type: data.type,
          title: data.title,
          order: data.order ?? 0,
          vimeoId: data.vimeoId ?? null,
          fileUrl: data.fileUrl ?? null,
          body: data.body ?? null,
        },
      }),
  );
}

export async function updateContentItem(
  actor: SessionUser,
  itemId: string,
  data: UpdateContentItemInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const existing = await db.contentItem.findUnique({ where: { id: itemId } });
  if (!existing) throw AppError.notFound("Content item");

  const type = data.type ?? existing.type;
  if (
    data.type !== undefined ||
    data.vimeoId !== undefined ||
    data.fileUrl !== undefined ||
    data.body !== undefined
  ) {
    const merged: CreateContentItemInput = {
      type,
      title: data.title ?? existing.title,
      order: data.order ?? existing.order,
      vimeoId: data.vimeoId !== undefined ? data.vimeoId : existing.vimeoId ?? undefined,
      fileUrl: data.fileUrl !== undefined ? data.fileUrl : existing.fileUrl ?? undefined,
      body: data.body !== undefined ? data.body : existing.body ?? undefined,
    };
    validateContentItemPayload(type, merged);
  }

  return withAudit(
    {
      actor,
      action: "offering.editContent",
      entityType: "ContentItem",
      entityId: itemId,
      before: existing,
      ...ctx,
    },
    async (tx) =>
      tx.contentItem.update({
        where: { id: itemId },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.order !== undefined && { order: data.order }),
          ...(data.vimeoId !== undefined && { vimeoId: data.vimeoId }),
          ...(data.fileUrl !== undefined && { fileUrl: data.fileUrl }),
          ...(data.body !== undefined && { body: data.body }),
        },
      }),
  );
}

export async function deleteContentItem(
  actor: SessionUser,
  itemId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const existing = await db.contentItem.findUnique({ where: { id: itemId } });
  if (!existing) throw AppError.notFound("Content item");

  return withAudit(
    {
      actor,
      action: "offering.editContent",
      entityType: "ContentItem",
      entityId: itemId,
      before: existing,
      ...ctx,
    },
    async (tx) => {
      await tx.contentItem.delete({ where: { id: itemId } });
      return { ok: true };
    },
  );
}

export { getWeekOfferingId, getItemOfferingId };
