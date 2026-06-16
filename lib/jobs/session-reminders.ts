import { EnrollmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  notifySessionReminder,
} from "@/lib/services/notification";

const WINDOW_MS = 15 * 60 * 1000;

function inWindow(target: Date, center: Date, windowMs = WINDOW_MS): boolean {
  return target.getTime() >= center.getTime() - windowMs && target.getTime() <= center.getTime() + windowMs;
}

export async function processSessionReminders(now = new Date()) {
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in15m = new Date(now.getTime() + 15 * 60 * 1000);

  const sessions = await db.liveSession.findMany({
    where: {
      OR: [{ reminder24hSentAt: null }, { reminder15mSentAt: null }],
      scheduledStart: { gte: now },
    },
    include: {
      offering: {
        include: {
          course: { select: { title: true } },
          enrollments: {
            where: { status: EnrollmentStatus.ENROLLED },
            select: { studentId: true },
          },
          staff: { select: { userId: true } },
        },
      },
    },
  });

  let sent24 = 0;
  let sent15 = 0;

  for (const session of sessions) {
    const recipientIds = new Set<string>();
    for (const e of session.offering.enrollments) recipientIds.add(e.studentId);
    for (const s of session.offering.staff) recipientIds.add(s.userId);

    if (!session.reminder24hSentAt && inWindow(session.scheduledStart, in24h)) {
      for (const userId of recipientIds) {
        await notifySessionReminder(userId, session.title, "24h");
      }
      await db.liveSession.update({
        where: { id: session.id },
        data: { reminder24hSentAt: now },
      });
      sent24++;
    }

    if (!session.reminder15mSentAt && inWindow(session.scheduledStart, in15m)) {
      for (const userId of recipientIds) {
        await notifySessionReminder(userId, session.title, "15m");
      }
      await db.liveSession.update({
        where: { id: session.id },
        data: { reminder15mSentAt: now },
      });
      sent15++;
    }
  }

  return { sent24, sent15 };
}
