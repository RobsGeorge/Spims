import { AttendanceSource, AttendanceStatus, EnrollmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { getParticipantReport } from "@/lib/zoom/client";
import type { OverrideAttendanceInput } from "@/lib/validation/session";

export type ParticipantInput = { email: string; durationMinutes: number };

export function attendanceStatusForMinutes(
  minutesAttended: number,
  sessionDurationMinutes: number,
  thresholdPercent: number,
): AttendanceStatus {
  const required = sessionDurationMinutes * (thresholdPercent / 100);
  return minutesAttended >= required ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;
}

export async function importSessionAttendance(
  sessionId: string,
  participants: ParticipantInput[],
  actor?: SessionUser,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const session = await db.liveSession.findUnique({
    where: { id: sessionId },
    include: { offering: true },
  });
  if (!session) throw AppError.notFound("Session");

  const enrollments = await db.enrollment.findMany({
    where: { offeringId: session.offeringId, status: EnrollmentStatus.ENROLLED },
    include: { student: { select: { id: true, email: true } } },
  });

  const participantMap = new Map(participants.map((p) => [p.email.toLowerCase(), p.durationMinutes]));

  const upsertOne = async (studentId: string, minutesAttended: number) => {
    const status = attendanceStatusForMinutes(
      minutesAttended,
      session.durationMinutes,
      session.offering.attendanceThresholdPercent,
    );
    return db.attendanceRecord.upsert({
      where: { liveSessionId_studentId: { liveSessionId: sessionId, studentId } },
      create: {
        liveSessionId: sessionId,
        studentId,
        status,
        minutesAttended,
        source: AttendanceSource.ZOOM_IMPORT,
      },
      update: { status, minutesAttended, source: AttendanceSource.ZOOM_IMPORT },
    });
  };

  if (actor) {
    return withAudit(
      {
        actor,
        action: "attendance.import",
        entityType: "LiveSession",
        entityId: sessionId,
        ...ctx,
      },
      async () => {
        const records = [];
        for (const e of enrollments) {
          const minutes = participantMap.get(e.student.email.toLowerCase()) ?? 0;
          records.push(await upsertOne(e.student.id, minutes));
        }
        return records;
      },
    );
  }

  const records = [];
  for (const e of enrollments) {
    const minutes = participantMap.get(e.student.email.toLowerCase()) ?? 0;
    records.push(await upsertOne(e.student.id, minutes));
  }
  return records;
}

export async function importAttendanceFromZoom(
  actor: SessionUser,
  sessionId: string,
  participantsOverride?: ParticipantInput[],
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const session = await db.liveSession.findUnique({ where: { id: sessionId } });
  if (!session) throw AppError.notFound("Session");

  let participants = participantsOverride ?? [];
  if (participants.length === 0 && session.zoomMeetingId) {
    participants = await getParticipantReport(session.zoomMeetingId);
  }

  return importSessionAttendance(sessionId, participants, actor, ctx);
}

export async function overrideAttendance(
  actor: SessionUser,
  sessionId: string,
  data: OverrideAttendanceInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const session = await db.liveSession.findUnique({ where: { id: sessionId } });
  if (!session) throw AppError.notFound("Session");

  return withAudit(
    {
      actor,
      action: "attendance.override",
      entityType: "AttendanceRecord",
      entityId: sessionId,
      after: data,
      ...ctx,
    },
    async (tx) =>
      tx.attendanceRecord.upsert({
        where: {
          liveSessionId_studentId: { liveSessionId: sessionId, studentId: data.studentId },
        },
        create: {
          liveSessionId: sessionId,
          studentId: data.studentId,
          status: data.status,
          minutesAttended: 0,
          source: AttendanceSource.MANUAL,
          overriddenById: actor.id,
        },
        update: {
          status: data.status,
          source: AttendanceSource.MANUAL,
          overriddenById: actor.id,
        },
      }),
  );
}

export async function getSessionAttendance(sessionId: string) {
  return db.attendanceRecord.findMany({
    where: { liveSessionId: sessionId },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { student: { lastName: "asc" } },
  });
}

export async function computeAttendancePercent(offeringId: string, studentId: string): Promise<number | null> {
  const sessions = await db.liveSession.findMany({
    where: { offeringId },
    select: { id: true },
  });
  if (sessions.length === 0) return null;

  const records = await db.attendanceRecord.findMany({
    where: {
      liveSessionId: { in: sessions.map((s) => s.id) },
      studentId,
    },
  });

  const presentCount = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
  return (presentCount / sessions.length) * 100;
}
