/**
 * Phase-6 acceptance smoke script.
 */
import {
  PrismaClient,
  ComponentKind,
  OfferingMode,
  OfferingStatus,
  QuestionType,
  RoleType,
} from "@prisma/client";
import { randomBytes } from "crypto";

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
      email: `smoke-p6-${roles.join("-")}-${Date.now()}@test.local`,
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
  console.log("=== Phase-6 Acceptance Smoke ===\n");

  const { user: aca, cookie: acaCookie } = await createSessionUser([RoleType.ACADEMIC_ADMIN]);
  const { user: ins, cookie: insCookie } = await createSessionUser([RoleType.INSTRUCTOR]);
  const { user: student, cookie: studentCookie } = await createSessionUser([RoleType.STUDENT]);

  const schemeRes = await fetch(`${BASE}/api/grading-schemes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      name: `P6 Scheme ${Date.now()}`,
      isDefault: true,
      bands: [
        { letter: "A", minPercent: 90, maxPercent: 100, gpaPoints: 4, isPassing: true },
        { letter: "B", minPercent: 80, maxPercent: 89.99, gpaPoints: 3, isPassing: true },
        { letter: "F", minPercent: 0, maxPercent: 79.99, gpaPoints: 0, isPassing: false },
      ],
    }),
  });
  await check("Create grading scheme → 201", schemeRes.status === 201);

  const tplRes = await fetch(`${BASE}/api/assessment-templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      name: `P6 Template ${Date.now()}`,
      components: [
        { name: "Exams", weightPercent: 100, kind: ComponentKind.EXAM },
      ],
    }),
  });
  const { template } = (await tplRes.json()) as { template: { id: string } };

  const courseRes = await fetch(`${BASE}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      code: `P6${Date.now().toString().slice(-5)}`,
      title: "Assessment Smoke Course",
      creditHours: 3,
      isFree: true,
      isStandalone: true,
      assessmentTemplateId: template.id,
    }),
  });
  const { course } = (await courseRes.json()) as { course: { id: string } };
  await check("Create course → 201", courseRes.status === 201);

  const offeringRes = await fetch(`${BASE}/api/offerings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      courseId: course.id,
      mode: OfferingMode.SELF_PACED,
      status: OfferingStatus.OPEN,
    }),
  });
  const { offering } = (await offeringRes.json()) as { offering: { id: string } };
  await check("Create offering → 201", offeringRes.status === 201);

  await db.offeringStaff.create({
    data: { offeringId: offering.id, userId: ins.id, role: "INSTRUCTOR" },
  });

  const enrollRes = await fetch(`${BASE}/api/offerings/${offering.id}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ acknowledgeScheduleConflict: true }),
  });
  await check("Student enroll → 201", enrollRes.status === 201);

  const bankRes = await fetch(`${BASE}/api/offerings/${offering.id}/question-banks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: insCookie },
    body: JSON.stringify({ name: "Smoke Bank" }),
  });
  const { bank } = (await bankRes.json()) as { bank: { id: string } };
  await check("Create question bank → 201", bankRes.status === 201);

  const qRes = await fetch(`${BASE}/api/question-banks/${bank.id}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: insCookie },
    body: JSON.stringify({
      type: QuestionType.MCQ_SINGLE,
      prompt: "2+2=?",
      points: 100,
      options: [
        { text: "3", isCorrect: false },
        { text: "4", isCorrect: true },
      ],
    }),
  });
  await check("Create question → 201", qRes.status === 201);

  await fetch(`${BASE}/api/offerings/${offering.id}/gradebook/components`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: insCookie },
    body: JSON.stringify({
      components: [{ name: "Exams", weightPercent: 100, kind: ComponentKind.EXAM }],
    }),
  });
  const compRes = await fetch(`${BASE}/api/offerings/${offering.id}/gradebook/components`, {
    headers: { Cookie: insCookie },
  });
  const { components } = (await compRes.json()) as { components: { id: string }[] };
  const examComponentId = components[0]!.id;

  const assessRes = await fetch(`${BASE}/api/offerings/${offering.id}/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: insCookie },
    body: JSON.stringify({
      mode: "EXAM",
      title: "Smoke Exam",
      componentId: examComponentId,
      timeLimitMinutes: 5,
      attemptsAllowed: 1,
      drawFromBankId: bank.id,
      questionsToDraw: 1,
      shuffleQuestions: true,
      released: true,
      maxPoints: 100,
    }),
  });
  const { assessment } = (await assessRes.json()) as { assessment: { id: string } };
  await check("Create assessment → 201", assessRes.status === 201);

  const startRes = await fetch(`${BASE}/api/assessments/${assessment.id}/attempts`, {
    method: "POST",
    headers: { Cookie: studentCookie },
  });
  const startBody = (await startRes.json()) as { attempt: { id: string; dueAt: string } };
  await check("Start attempt → 201", startRes.status === 201);
  await check("Server dueAt set", Boolean(startBody.attempt?.dueAt));

  const attemptRes = await fetch(`${BASE}/api/attempts/${startBody.attempt.id}`, {
    headers: { Cookie: studentCookie },
  });
  const attemptData = (await attemptRes.json()) as {
    attempt: { examSnapshot: { questions: unknown[] } | null; questionIds: string[] };
  };
  await check("Resume attempt → 200", attemptRes.status === 200);
  await check("Exam snapshot present", (attemptData.attempt.examSnapshot?.questions.length ?? 0) > 0);

  const qId = attemptData.attempt.questionIds[0]!;
  const correctOpt = await db.questionOption.findFirst({ where: { questionId: qId, isCorrect: true } });
  const saveRes = await fetch(`${BASE}/api/attempts/${startBody.attempt.id}/answers`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({
      questionId: qId,
      response: correctOpt!.id,
    }),
  });
  await check("Autosave answer → 200", saveRes.status === 200);

  const submitRes = await fetch(`${BASE}/api/attempts/${startBody.attempt.id}/submit`, {
    method: "POST",
    headers: { Cookie: studentCookie },
  });
  await check("Submit attempt → 200", submitRes.status === 200);

  const submitted = await db.assessmentAttempt.findUnique({ where: { id: startBody.attempt.id } });
  await check("Attempt graded with score", submitted?.totalScore === 100);

  const gbRes = await fetch(`${BASE}/api/offerings/${offering.id}/gradebook`, {
    headers: { Cookie: insCookie },
  });
  await check("Instructor gradebook → 200", gbRes.status === 200);

  const lockRes = await fetch(`${BASE}/api/offerings/${offering.id}/grades/submit`, {
    method: "POST",
    headers: { Cookie: insCookie },
  });
  const lockBody = (await lockRes.json()) as { result: { locked: number } };
  await check("Lock grades → 200", lockRes.status === 200);
  await check("At least one locked", lockBody.result.locked >= 1);

  const record = await db.academicRecord.findFirst({
    where: { studentId: student.id, courseId: course.id },
  });
  await check("AcademicRecord created", Boolean(record));
  await check("Passing grade posted", record?.isPassing === true);

  const reopenRes = await fetch(`${BASE}/api/offerings/${offering.id}/grades/reopen`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({ reason: "Smoke test reopen" }),
  });
  await check("ACA reopen → 200", reopenRes.status === 200);

  const audit = await db.auditLog.findFirst({
    where: { action: "grade.reopen", entityId: offering.id },
    orderBy: { createdAt: "desc" },
  });
  await check("Reopen audited", Boolean(audit));

  console.log("\n=== Done ===");
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
  await db.$disconnect();
});
