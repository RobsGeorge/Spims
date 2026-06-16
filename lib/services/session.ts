import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { createZoomMeeting } from "@/lib/zoom/client";
import { getSettingValue } from "@/lib/services/settings";
import type { CreateRecurrenceInput, CreateSessionInput } from "@/lib/validation/session";

export const JOIN_WINDOW_MINUTES = 15;

export function sessionEnd(session: { scheduledStart: Date; durationMinutes: number }): Date {
  return new Date(session.scheduledStart.getTime() + session.durationMinutes * 60_000);
}

export function sessionsOverlap(
  a: { scheduledStart: Date; durationMinutes: number },
  b: { scheduledStart: Date; durationMinutes: number },
): boolean {
  return a.scheduledStart < sessionEnd(b) && sessionEnd(a) > b.scheduledStart;
}

export function isJoinWindowOpen(session: { scheduledStart: Date; durationMinutes: number }, now = new Date()): boolean {
  const windowStart = new Date(session.scheduledStart.getTime() - JOIN_WINDOW_MINUTES * 60_000);
  return now >= windowStart && now <= sessionEnd(session);
}

async function getConcurrentHostLimit(): Promise<number> {
  const value = await getSettingValue<number>("zoom.concurrent_hosts");
  return value ?? 1;
}

async function assertHostCapacity(
  scheduledStart: Date,
  durationMinutes: number,
  excludeSessionId?: string,
): Promise<void> {
  const limit = await getConcurrentHostLimit();
  const candidate = { scheduledStart, durationMinutes };
  const sessions = await db.liveSession.findMany({
    where: excludeSessionId ? { id: { not: excludeSessionId } } : undefined,
    select: { id: true, scheduledStart: true, durationMinutes: true },
  });

  const overlapping = sessions.filter((s) => sessionsOverlap(candidate, s));
  if (overlapping.length >= limit) {
    throw AppError.conflict(
      `Host capacity reached (${limit} concurrent host${limit === 1 ? "" : "s"}) — session overlaps an existing live session`,
    );
  }
}

export async function listOfferingSessions(offeringId: string) {
  return db.liveSession.findMany({
    where: { offeringId },
    orderBy: { scheduledStart: "asc" },
    include: { _count: { select: { attendance: true } } },
  });
}

export async function listAllSessions() {
  return db.liveSession.findMany({
    orderBy: { scheduledStart: "asc" },
    include: {
      offering: { include: { course: { select: { code: true, title: true } } } },
    },
  });
}

export async function createLiveSession(
  actor: SessionUser,
  offeringId: string,
  data: CreateSessionInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const offering = await db.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");

  const scheduledStart = new Date(data.scheduledStart);
  await assertHostCapacity(scheduledStart, data.durationMinutes);

  const meeting = await createZoomMeeting({
    topic: data.title,
    startTime: scheduledStart,
    durationMinutes: data.durationMinutes,
  });

  return withAudit(
    {
      actor,
      action: "session.create",
      entityType: "LiveSession",
      entityId: offeringId,
      after: data,
      ...ctx,
    },
    async (tx) =>
      tx.liveSession.create({
        data: {
          offeringId,
          title: data.title,
          scheduledStart,
          durationMinutes: data.durationMinutes,
          zoomMeetingId: meeting.id,
          zoomJoinUrl: meeting.join_url,
          zoomStartUrl: meeting.start_url,
        },
      }),
  );
}

function parseTimeOnDate(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setUTCHours(h!, m!, 0, 0);
  return d;
}

export async function createRecurrenceAndSessions(
  actor: SessionUser,
  offeringId: string,
  data: CreateRecurrenceInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const offering = await db.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const daySet = new Set(data.daysOfWeek);
  const created: Awaited<ReturnType<typeof db.liveSession.create>>[] = [];

  await withAudit(
    {
      actor,
      action: "session.recurrence",
      entityType: "SessionRecurrence",
      entityId: offeringId,
      after: data,
      ...ctx,
    },
    async (tx) => {
      await tx.sessionRecurrence.create({
        data: {
          offeringId,
          daysOfWeek: data.daysOfWeek,
          startTime: data.startTime,
          durationMinutes: data.durationMinutes,
          startDate,
          endDate,
        },
      });

      for (let d = new Date(startDate); d <= endDate; ) {
        if (!daySet.has(d.getUTCDay())) {
          d.setUTCDate(d.getUTCDate() + 1);
          continue;
        }
        const scheduledStart = parseTimeOnDate(d, data.startTime);
        await assertHostCapacity(scheduledStart, data.durationMinutes);
        const meeting = await createZoomMeeting({
          topic: data.title,
          startTime: scheduledStart,
          durationMinutes: data.durationMinutes,
        });
        created.push(
          await tx.liveSession.create({
            data: {
              offeringId,
              title: data.title,
              scheduledStart,
              durationMinutes: data.durationMinutes,
              zoomMeetingId: meeting.id,
              zoomJoinUrl: meeting.join_url,
              zoomStartUrl: meeting.start_url,
            },
          }),
        );
        d.setUTCDate(d.getUTCDate() + 1);
      }
    },
  );

  return created;
}

export async function getSessionJoinUrl(sessionId: string, userId: string, roles: string[]) {
  const session = await db.liveSession.findUnique({
    where: { id: sessionId },
    include: { offering: true },
  });
  if (!session) throw AppError.notFound("Session");

  const isStaff = await db.offeringStaff.findFirst({
    where: { offeringId: session.offeringId, userId },
  });
  const enrollment = await db.enrollment.findUnique({
    where: { studentId_offeringId: { studentId: userId, offeringId: session.offeringId } },
  });

  const isAdmin =
    roles.includes("SUPER_ADMIN") ||
    roles.includes("ACADEMIC_ADMIN") ||
    roles.includes("ADMINISTRATIVE_ADMIN");
  if (!isStaff && !enrollment && !isAdmin) {
    throw AppError.forbidden("Not enrolled in this offering");
  }
  if (enrollment && enrollment.status !== "ENROLLED" && !isStaff && !isAdmin) {
    throw AppError.forbidden("Enrollment not active");
  }

  if (!isJoinWindowOpen(session)) {
    throw AppError.forbidden("Join is available 15 minutes before the session until it ends");
  }
  if (!session.zoomJoinUrl) throw AppError.notFound("Join URL not available");

  return { joinUrl: session.zoomJoinUrl, session };
}

export async function linkSessionRecording(meetingId: string, recordingUrl: string) {
  const session = await db.liveSession.findFirst({ where: { zoomMeetingId: meetingId } });
  if (!session) return null;
  return db.liveSession.update({
    where: { id: session.id },
    data: { recordingUrl },
  });
}
