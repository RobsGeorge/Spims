import { randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { buildWeekUnlockMap } from "@/lib/services/offeringAccess";
import { studentHasPassedCourse } from "@/lib/services/offering";

type WeekProgressRow = { id: string; studentId: string; weekId: string; completedAt: Date };
type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

function weekProgressClient(tx: TxClient | typeof db = db) {
  const delegate = (tx as typeof db & { weekProgress?: { findMany?: (...args: unknown[]) => unknown } })
    .weekProgress;
  if (delegate && typeof delegate.findMany === "function") {
    return delegate as typeof db.weekProgress;
  }
  return null;
}

export async function getCompletedWeekNumbers(
  studentId: string,
  offeringId: string,
): Promise<number[]> {
  const delegate = weekProgressClient();
  if (delegate) {
    const rows = await delegate.findMany({
      where: { studentId, week: { offeringId } },
      include: { week: { select: { number: true } } },
    });
    return rows.map((r) => (r as { week: { number: number } }).week.number).sort((a, b) => a - b);
  }

  const rows = await db.$queryRaw<{ number: number }[]>`
    SELECT w.number
    FROM "WeekProgress" wp
    INNER JOIN "Week" w ON w.id = wp."weekId"
    WHERE wp."studentId" = ${studentId} AND w."offeringId" = ${offeringId}
    ORDER BY w.number ASC
  `;
  return rows.map((r) => r.number);
}

export async function markWeekComplete(
  actor: SessionUser,
  weekId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const week = await db.week.findUnique({
    where: { id: weekId },
    include: { offering: { include: { weeks: { orderBy: { order: "asc" } } } } },
  });
  if (!week) throw AppError.notFound("Week");

  const enrollment = await db.enrollment.findFirst({
    where: {
      studentId: actor.id,
      offeringId: week.offeringId,
      status: { in: ["ENROLLED", "COMPLETED"] },
    },
  });
  if (!enrollment) throw AppError.forbidden("Not enrolled in this offering");

  const completedWeekNumbers = await getCompletedWeekNumbers(actor.id, week.offeringId);
  const hasPassed = await studentHasPassedCourse(actor.id, week.offering.courseId);
  const unlockMap = buildWeekUnlockMap(week.offering.weeks, {
    offeringMode: week.offering.mode,
    now: new Date(),
    completedWeekNumbers,
    hasPassed,
  });
  if (!unlockMap[week.number]) {
    throw AppError.forbidden("Week is not unlocked");
  }

  return withAudit(
    {
      actor,
      action: "enrollment.self",
      entityType: "WeekProgress",
      entityId: weekId,
      ...ctx,
    },
    async (tx) => {
      const delegate = weekProgressClient(tx);
      if (delegate) {
        const existingProgress = await delegate.findFirst({
          where: { studentId: actor.id, weekId },
        });
        if (existingProgress) {
          return delegate.update({
            where: { id: existingProgress.id },
            data: { completedAt: new Date() },
          });
        }
        return delegate.create({
          data: { studentId: actor.id, weekId },
        });
      }

      const existing = await tx.$queryRaw<WeekProgressRow[]>`
        SELECT id, "studentId", "weekId", "completedAt"
        FROM "WeekProgress"
        WHERE "studentId" = ${actor.id} AND "weekId" = ${weekId}
        LIMIT 1
      `;
      if (existing[0]) {
        await tx.$executeRaw`
          UPDATE "WeekProgress"
          SET "completedAt" = ${new Date()}
          WHERE id = ${existing[0].id}
        `;
        return { ...existing[0], completedAt: new Date() };
      }
      const id = randomUUID();
      const completedAt = new Date();
      await tx.$executeRaw`
        INSERT INTO "WeekProgress" (id, "studentId", "weekId", "completedAt")
        VALUES (${id}, ${actor.id}, ${weekId}, ${completedAt})
      `;
      return { id, studentId: actor.id, weekId, completedAt };
    },
  );
}
