/**
 * Phase-7 acceptance smoke script.
 */
import {
  PrismaClient,
  AttendanceStatus,
  ComponentKind,
  OfferingMode,
  OfferingStatus,
  RoleType,
} from "@prisma/client";
import { randomBytes } from "crypto";
import { processSessionReminders } from "../lib/jobs/session-reminders";
import { computeAttendancePercent } from "../lib/services/attendance";
import { computeDiscussionPercent } from "../lib/services/discussion";

const db = new PrismaClient();
const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

async function check(label: string, condition: boolean, detail = "") {
  console.log(`${condition ? "✓" : "✗"} ${label}${detail ? " — " + detail : ""}`);
  if (!condition) process.exitCode = 1;
}

async function createSessionUser(roles: RoleType[]) {
  const token = randomBytes(32).toString("hex");
  const user = await db.user.create({
    data: {
      email: `smoke-p7-${roles.join("-")}-${Date.now()}@test.local`,
      firstName: "Smoke",
      lastName: roles[0] ?? "User",
      emailVerified: true,
      status: "ACTIVE",
      roles: { create: roles.map((role) => ({ role })) },
      sessions: { create: { token, expiresAt: new Date(Date.now() + 600_000) } },
    },
  });
  return { user, cookie: `spims_session=${token}` };
}

async function main() {
  console.log("=== Phase-7 Acceptance Smoke ===\n");

  const { user: adm, cookie: admCookie } = await createSessionUser([RoleType.ADMINISTRATIVE_ADMIN]);
  const { user: ins, cookie: insCookie } = await createSessionUser([RoleType.INSTRUCTOR]);
  const { user: student, cookie: studentCookie } = await createSessionUser([RoleType.STUDENT]);

  const course = await db.course.create({
    data: {
      code: `P7${Date.now().toString().slice(-5)}`,
      title: "Phase 7 Smoke Course",
      creditHours: 3,
      isFree: true,
      isStandalone: true,
    },
  });

  const offering = await db.courseOffering.create({
    data: {
      courseId: course.id,
      mode: OfferingMode.COHORT,
      status: OfferingStatus.OPEN,
      attendanceThresholdPercent: 60,
    },
  });

  await db.offeringStaff.create({
    data: { offeringId: offering.id, userId: ins.id, role: "INSTRUCTOR" },
  });

  await db.enrollment.create({
    data: { offeringId: offering.id, studentId: student.id, status: "ENROLLED" },
  });

  await db.gradebookComponent.create({
    data: { offeringId: offering.id, name: "Attendance", weightPercent: 50, kind: ComponentKind.ATTENDANCE },
  });
  await db.gradebookComponent.create({
    data: { offeringId: offering.id, name: "Discussion", weightPercent: 50, kind: ComponentKind.DISCUSSION },
  });

  const start1 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const session1Res = await fetch(`${BASE}/api/offerings/${offering.id}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admCookie },
    body: JSON.stringify({ title: "Session A", scheduledStart: start1, durationMinutes: 60 }),
  });
  const session1Body = (await session1Res.json()) as { session: { id: string; zoomMeetingId: string } };
  await check("Create session with Zoom → 201", session1Res.status === 201);
  await check("Zoom meeting id set", Boolean(session1Body.session?.zoomMeetingId));

  const overlapStart = new Date(new Date(start1).getTime() + 30 * 60 * 1000).toISOString();
  const overlapRes = await fetch(`${BASE}/api/offerings/${offering.id}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admCookie },
    body: JSON.stringify({ title: "Session B overlap", scheduledStart: overlapStart, durationMinutes: 60 }),
  });
  await check("Overlapping session blocked → 409", overlapRes.status === 409);

  const importRes = await fetch(`${BASE}/api/sessions/${session1Body.session.id}/attendance/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: insCookie },
    body: JSON.stringify({
      participants: [{ email: student.email, durationMinutes: 40 }],
    }),
  });
  await check("Attendance import → 200", importRes.status === 200);

  const record = await db.attendanceRecord.findFirst({
    where: { liveSessionId: session1Body.session.id, studentId: student.id },
  });
  await check("Student marked present at threshold", record?.status === AttendanceStatus.PRESENT);

  const attPct = await computeAttendancePercent(offering.id, student.id);
  await check("Attendance feeds gradebook percent", attPct === 100);

  const reminderSession = await db.liveSession.create({
    data: {
      offeringId: offering.id,
      title: "Reminder Session",
      scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
      durationMinutes: 60,
      zoomMeetingId: "mock-reminder",
      zoomJoinUrl: "https://zoom.us/j/mock",
    },
  });
  const reminderResult = await processSessionReminders(new Date(Date.now() + 24 * 60 * 60 * 1000 - 60_000));
  await check("24h reminders sent", reminderResult.sent24 >= 1);

  const notifCount = await db.notification.count({
    where: { userId: student.id, type: "SESSION_REMINDER_24H" },
  });
  await check("In-app session reminder created", notifCount >= 1);

  const boardRes = await fetch(`${BASE}/api/offerings/${offering.id}/discussion`, {
    headers: { Cookie: studentCookie },
  });
  const boardBody = (await boardRes.json()) as { board: { id: string } };
  await check("Discussion board → 200", boardRes.status === 200);

  const threadRes = await fetch(`${BASE}/api/discussion/${boardBody.board.id}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: insCookie },
    body: JSON.stringify({
      title: "Graded participation",
      isGraded: true,
      participationMinWords: 5,
      participationMinPosts: 1,
    }),
  });
  const threadBody = (await threadRes.json()) as { thread: { id: string } };
  await check("Graded thread → 201", threadRes.status === 201);

  await fetch(`${BASE}/api/threads/${threadBody.thread.id}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ body: "one two three four five six" }),
  });

  const gradeRow = await db.discussionGrade.findUnique({
    where: { threadId_studentId: { threadId: threadBody.thread.id, studentId: student.id } },
  });
  await check("Discussion auto-score", gradeRow?.autoScore === 100);

  const overrideRes = await fetch(`${BASE}/api/threads/${threadBody.thread.id}/grades`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: insCookie },
    body: JSON.stringify({ grades: [{ studentId: student.id, finalScore: 85 }] }),
  });
  await check("Discussion grade override → 200", overrideRes.status === 200);

  const discPct = await computeDiscussionPercent(offering.id, student.id);
  await check("Discussion feeds gradebook", discPct === 85);

  const notifyRes = await fetch(`${BASE}/api/notifications`, { headers: { Cookie: studentCookie } });
  const notifyBody = (await notifyRes.json()) as { notifications: unknown[] };
  await check("Notifications list → 200", notifyRes.status === 200);
  await check("Notifications delivered", (notifyBody.notifications?.length ?? 0) > 0);

  const settingsRes = await fetch(`${BASE}/api/settings/zoom.concurrent_hosts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: admCookie },
    body: JSON.stringify({ value: 1 }),
  });
  await check("Settings PUT → 200", settingsRes.status === 200);

  const zoomWebhook = await fetch(`${BASE}/api/webhooks/zoom`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-zm-trackingid": `evt-${Date.now()}` },
    body: JSON.stringify({
      event: "recording.completed",
      payload: { object: { id: session1Body.session.zoomMeetingId, recording_files: [{ play_url: "https://rec.example/1" }] } },
    }),
  });
  await check("Zoom webhook → 200", zoomWebhook.status === 200);

  const updatedSession = await db.liveSession.findUnique({ where: { id: session1Body.session.id } });
  await check("Recording linked", Boolean(updatedSession?.recordingUrl));

  console.log("\n=== Done ===");
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
  await db.$disconnect();
});
