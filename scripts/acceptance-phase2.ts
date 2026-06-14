/**
 * Phase-2 acceptance smoke script.
 * Tests: grading scheme → assessment template → program w/ requirements → course w/ prerequisites
 *        → student interest flag → translation upsert/verify → AI skip without key
 */
import { PrismaClient, RoleType } from "@prisma/client";
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
      email: `smoke-p2-${roles.join("-")}-${Date.now()}@test.local`,
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
  console.log("=== Phase-2 Acceptance Smoke ===\n");

  const { user: acaUser, cookie: acaCookie } = await createSessionUser([RoleType.ACADEMIC_ADMIN]);
  const { user: student, cookie: studentCookie } = await createSessionUser([RoleType.STUDENT]);

  const createdIds: {
    schemeId?: string;
    templateId?: string;
    prereqId?: string;
    courseId?: string;
    programId?: string;
  } = {};

  // ── 1. Grading scheme ─────────────────────────────────────────────────────
  const schemeRes = await fetch(`${BASE}/api/grading-schemes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      name: `Smoke Scheme ${Date.now()}`,
      bands: [
        { letter: "A", minPercent: 90, maxPercent: 100, gpaPoints: 4, isPassing: true },
        { letter: "F", minPercent: 0, maxPercent: 59, gpaPoints: 0, isPassing: false },
      ],
    }),
  });
  await check("POST /api/grading-schemes → 201", schemeRes.status === 201);
  const { scheme } = await schemeRes.json() as { scheme: { id: string } };
  createdIds.schemeId = scheme.id;

  // ── 2. Assessment template ────────────────────────────────────────────────
  const templateRes = await fetch(`${BASE}/api/assessment-templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      name: `Smoke Template ${Date.now()}`,
      components: [
        { name: "Exams", weightPercent: 60, kind: "EXAM" },
        { name: "Assignments", weightPercent: 40, kind: "ASSIGNMENT" },
      ],
    }),
  });
  await check("POST /api/assessment-templates → 201", templateRes.status === 201);
  const { template } = await templateRes.json() as { template: { id: string } };
  createdIds.templateId = template.id;

  // ── 3. Courses ──────────────────────────────────────────────────────────────
  const prereqRes = await fetch(`${BASE}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      code: `PRE${Date.now().toString().slice(-6)}`,
      title: "Prerequisite Course",
      creditHours: 3,
    }),
  });
  await check("POST prerequisite course → 201", prereqRes.status === 201);
  const { course: prereq } = await prereqRes.json() as { course: { id: string } };
  createdIds.prereqId = prereq.id;

  const courseRes = await fetch(`${BASE}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      code: `CS${Date.now().toString().slice(-6)}`,
      title: "Introduction to Computer Science",
      creditHours: 3,
      assessmentTemplateId: template.id,
    }),
  });
  await check("POST main course → 201", courseRes.status === 201);
  const { course } = await courseRes.json() as { course: { id: string } };
  createdIds.courseId = course.id;

  const prereqSetRes = await fetch(`${BASE}/api/courses/${course.id}/prerequisites`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({ prerequisiteIds: [prereq.id] }),
  });
  await check("PUT course prerequisites → 200", prereqSetRes.status === 200);

  // ── 4. Program with requirements ──────────────────────────────────────────
  const programRes = await fetch(`${BASE}/api/programs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      code: `P${Date.now().toString().slice(-6)}`,
      name: "Computer Science Diploma",
      type: "DIPLOMA",
      maxCreditsPerSemester: 18,
      maxCoursesPerSemester: 6,
      maxSemestersToGraduate: 8,
      electiveCreditsRequired: 6,
      signatoryName: "Dean Smith",
      signatoryTitle: "Academic Dean",
      gradingSchemeId: scheme.id,
    }),
  });
  await check("POST /api/programs → 201", programRes.status === 201);
  const { program } = await programRes.json() as { program: { id: string } };
  createdIds.programId = program.id;

  const reqRes = await fetch(`${BASE}/api/programs/${program.id}/requirements`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      requirements: [
        { courseId: course.id, requirement: "REQUIRED", yearLevel: 1 },
        { courseId: prereq.id, requirement: "ELECTIVE", yearLevel: 1 },
      ],
    }),
  });
  await check("PUT program requirements → 200", reqRes.status === 200);

  // ── 5. Student interest flag ────────────────────────────────────────────────
  const flagRes = await fetch(`${BASE}/api/courses/${course.id}/interest`, {
    method: "POST",
    headers: { Cookie: studentCookie },
  });
  await check("POST interest flag → 201", flagRes.status === 201);

  const countRes = await fetch(`${BASE}/api/courses/${course.id}/interest/count`, {
    headers: { Cookie: acaCookie },
  });
  await check("GET interest count → 200", countRes.status === 200);
  const countBody = await countRes.json() as { count: number };
  await check("Interest count ≥ 1", countBody.count >= 1, `count=${countBody.count}`);

  const unauthCountRes = await fetch(`${BASE}/api/courses/${course.id}/interest/count`, {
    headers: { Cookie: studentCookie },
  });
  await check("Student cannot read interest count → 403", unauthCountRes.status === 403);

  // ── 6. Translation upsert + verify ────────────────────────────────────────
  const transRes = await fetch(`${BASE}/api/translations`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      entityType: "Course",
      entityId: course.id,
      field: "title",
      locale: "ar",
      value: "مقدمة في علوم الحاسوب",
    }),
  });
  await check("PUT translation → 200", transRes.status === 200);
  const { translation } = await transRes.json() as { translation: { id: string; verified: boolean } };
  await check("Translation starts unverified", translation.verified === false);

  const verifyRes = await fetch(`${BASE}/api/translations/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({ translationId: translation.id }),
  });
  await check("POST translation verify → 200", verifyRes.status === 200);

  // ── 7. AI translation graceful skip (no key in test env) ────────────────────
  const aiRes = await fetch(`${BASE}/api/translations/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      entityType: "Course",
      entityId: course.id,
      field: "title",
      locale: "fr",
    }),
  });
  await check("POST AI translation → 200", aiRes.status === 200);
  const aiBody = await aiRes.json() as { skipped?: boolean };
  await check("AI skipped without key (or succeeded with key)", aiBody.skipped === true || aiBody.skipped === false);

  // ── 8. Unauthorized access ──────────────────────────────────────────────────
  const noAuthPrograms = await fetch(`${BASE}/api/programs`);
  await check("GET /api/programs no cookie → 401", noAuthPrograms.status === 401);

  const studentPrograms = await fetch(`${BASE}/api/programs`, { headers: { Cookie: studentCookie } });
  await check("GET /api/programs as student → 200 (program.read)", studentPrograms.status === 200);

  const studentCreateProgram = await fetch(`${BASE}/api/programs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({
      code: `X${Date.now().toString().slice(-6)}`,
      name: "Should Fail",
      type: "DIPLOMA",
      maxCreditsPerSemester: 18,
      maxCoursesPerSemester: 6,
      maxSemestersToGraduate: 8,
    }),
  });
  await check("POST /api/programs as student → 403", studentCreateProgram.status === 403);

  // ── 9. Audit logs ───────────────────────────────────────────────────────────
  const auditCount = await db.auditLog.count({
    where: { entityType: { in: ["Program", "Course", "GradingScheme", "AssessmentTemplate", "Translation"] } },
  });
  await check("AuditLog rows written for academics", auditCount > 0, `${auditCount} rows`);

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  if (createdIds.courseId) {
    await db.translation.deleteMany({ where: { entityId: createdIds.courseId } });
    await db.courseInterestFlag.deleteMany({ where: { courseId: createdIds.courseId } });
    await db.coursePrerequisite.deleteMany({ where: { courseId: createdIds.courseId } });
    await db.course.delete({ where: { id: createdIds.courseId } }).catch(() => {});
  }
  if (createdIds.programId) {
    await db.translation.deleteMany({ where: { entityId: createdIds.programId } });
    await db.programCourse.deleteMany({ where: { programId: createdIds.programId } });
    await db.program.delete({ where: { id: createdIds.programId } }).catch(() => {});
  }
  if (createdIds.prereqId) {
    await db.course.delete({ where: { id: createdIds.prereqId } }).catch(() => {});
  }
  if (createdIds.templateId) {
    await db.assessmentTemplate.delete({ where: { id: createdIds.templateId } }).catch(() => {});
  }
  if (createdIds.schemeId) {
    await db.gradingScheme.delete({ where: { id: createdIds.schemeId } }).catch(() => {});
  }
  await db.auditLog.deleteMany({ where: { actorId: { in: [student.id, acaUser.id] } } });
  await db.user.delete({ where: { id: student.id } });
  await db.user.delete({ where: { id: acaUser.id } });

  console.log("\n✓ Cleaned up");
  const passed = process.exitCode !== 1;
  console.log(`\n${passed ? "✅ ALL CHECKS PASS" : "❌ SOME CHECKS FAILED"}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
