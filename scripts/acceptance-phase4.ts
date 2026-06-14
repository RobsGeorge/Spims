/**
 * Phase-4 acceptance smoke script.
 * Admissions → enrollment rules → waitlist → drop refund → degree audit → WeekProgress
 */
import {
  PrismaClient,
  ApplicationStatus,
  OfferingMode,
  OfferingStatus,
  RoleType,
} from "@prisma/client";
import { randomBytes } from "crypto";

const db = new PrismaClient();
const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

async function check(label: string, condition: boolean, detail = "") {
  console.log(`${condition ? "✓" : "✗"} ${label}${detail ? " — " + detail : ""}`);
  if (!condition) process.exitCode = 1;
}

async function createSessionUser(roles: RoleType[], extra: { isReviewer?: boolean } = {}) {
  const token = randomBytes(32).toString("hex");
  const user = await db.user.create({
    data: {
      email: `smoke-p4-${roles.join("-")}-${Date.now()}@test.local`,
      firstName: "Smoke",
      lastName: roles[0] ?? "User",
      emailVerified: true,
      status: "ACTIVE",
      isReviewer: extra.isReviewer ?? false,
      roles: { create: roles.map((role) => ({ role })) },
      sessions: { create: { token, expiresAt: new Date(Date.now() + 600_000) } },
    },
  });
  return { user, cookie: `spims_session=${token}` };
}

async function main() {
  console.log("=== Phase-4 Acceptance Smoke ===\n");

  const { user: adm, cookie: admCookie } = await createSessionUser(
    [RoleType.ADMINISTRATIVE_ADMIN],
    { isReviewer: true },
  );
  const { user: aca, cookie: acaCookie } = await createSessionUser([RoleType.ACADEMIC_ADMIN]);
  const { user: student, cookie: studentCookie } = await createSessionUser([RoleType.STUDENT]);
  const { user: student2, cookie: student2Cookie } = await createSessionUser([RoleType.STUDENT]);

  // ── 1. Program + course (ACA) ───────────────────────────────────────────
  const schemeRes = await fetch(`${BASE}/api/grading-schemes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      name: `P4 Scheme ${Date.now()}`,
      bands: [{ letter: "A", minPercent: 90, maxPercent: 100, gpaPoints: 4, isPassing: true }],
    }),
  });
  const { scheme } = (await schemeRes.json()) as { scheme: { id: string } };

  const courseRes = await fetch(`${BASE}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      code: `P4${Date.now().toString().slice(-6)}`,
      title: "Phase 4 Course",
      creditHours: 3,
      isStandalone: true,
      isFree: true,
    }),
  });
  await check("POST course → 201", courseRes.status === 201);
  const { course } = (await courseRes.json()) as { course: { id: string } };

  const programRes = await fetch(`${BASE}/api/programs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      code: `P4P${Date.now().toString().slice(-5)}`,
      name: "Phase 4 Program",
      type: "DEGREE",
      gradingSchemeId: scheme.id,
      maxCreditsPerSemester: 18,
      maxCoursesPerSemester: 6,
      maxSemestersToGraduate: 8,
      electiveCreditsRequired: 0,
    }),
  });
  await check("POST program → 201", programRes.status === 201);
  const { program } = (await programRes.json()) as { program: { id: string } };

  await fetch(`${BASE}/api/programs/${program.id}/requirements`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      requirements: [{ courseId: course.id, requirement: "REQUIRED", yearLevel: 1 }],
    }),
  });

  // ── 2. Application form (ADM) ───────────────────────────────────────────
  const formRes = await fetch(`${BASE}/api/programs/${program.id}/application-form`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: admCookie },
    body: JSON.stringify({
      name: "P4 Application",
      fields: [{ label: "Statement", type: "TEXTAREA", required: true, order: 0 }],
    }),
  });
  await check("PUT application form → 200", formRes.status === 200);
  const { form } = (await formRes.json()) as {
    form: { fields: { id: string }[] };
  };
  const fieldId = form.fields[0]?.id;
  await check("Form has field", Boolean(fieldId));

  // ── 3. Student applies → reviewer assigned ────────────────────────────────
  const applyRes = await fetch(`${BASE}/api/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({
      programId: program.id,
      values: [{ fieldId, value: "I want to study here." }],
    }),
  });
  await check("POST application → 201", applyRes.status === 201);
  const { application } = (await applyRes.json()) as {
    application: { id: string; reviewerId: string | null; status: string };
  };
  await check("Reviewer assigned (round-robin)", Boolean(application.reviewerId));
  await check("Status UNDER_REVIEW or SUBMITTED", ["UNDER_REVIEW", "SUBMITTED"].includes(application.status));

  // ── 4. Accept → matriculate ───────────────────────────────────────────────
  const decideRes = await fetch(`${BASE}/api/applications/${application.id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admCookie },
    body: JSON.stringify({ decision: ApplicationStatus.ACCEPTED, decisionNote: "Welcome" }),
  });
  await check("POST decision ACCEPTED → 200", decideRes.status === 200);

  const sp = await db.studentProgram.findUnique({
    where: { studentId_programId: { studentId: student.id, programId: program.id } },
  });
  await check("StudentProgram created on accept", sp?.status === "ACTIVE");

  // ── 5. Semester + offering + enroll ───────────────────────────────────────
  const yearRes = await fetch(`${BASE}/api/academic-years`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admCookie },
    body: JSON.stringify({
      name: `P4 AY ${Date.now()}`,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    }),
  });
  const { year } = (await yearRes.json()) as { year: { id: string } };

  const semRes = await fetch(`${BASE}/api/semesters`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admCookie },
    body: JSON.stringify({
      academicYearId: year.id,
      name: "P4 Fall",
      startDate: "2026-06-01",
      endDate: "2026-12-15",
      registrationStart: "2026-01-01",
      registrationEnd: "2026-12-31",
      addDropEndWeek: 4,
      lastWithdrawalWeek: 10,
      withdrawalRefundPercent: 50,
    }),
  });
  await check("POST semester → 201", semRes.status === 201);
  const { semester } = (await semRes.json()) as { semester: { id: string } };

  const offeringRes = await fetch(`${BASE}/api/offerings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      courseId: course.id,
      mode: OfferingMode.COHORT,
      semesterId: semester.id,
      seatCapacity: 1,
      status: OfferingStatus.OPEN,
    }),
  });
  await check("POST offering → 201", offeringRes.status === 201);
  const { offering } = (await offeringRes.json()) as { offering: { id: string } };

  const enrollRes = await fetch(`${BASE}/api/offerings/${offering.id}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({
      studentProgramId: sp!.id,
      acknowledgeScheduleConflict: true,
    }),
  });
  await check("Student enrolls → 201", enrollRes.status === 201);
  const { enrollment: enr1 } = (await enrollRes.json()) as {
    enrollment: { id: string; status: string };
  };
  await check("Enrollment status ENROLLED", enr1.status === "ENROLLED");

  const waitRes = await fetch(`${BASE}/api/offerings/${offering.id}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: student2Cookie },
    body: JSON.stringify({ acknowledgeScheduleConflict: true }),
  });
  await check("Second student waitlisted → 201", waitRes.status === 201);
  const { enrollment: enr2 } = (await waitRes.json()) as { enrollment: { status: string } };
  await check("Waitlist status", enr2.status === "WAITLISTED");

  const promoteRes = await fetch(`${BASE}/api/offerings/${offering.id}/waitlist/promote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admCookie },
    body: JSON.stringify({ count: 1 }),
  });
  await check("Waitlist promote (no slot) → 200", promoteRes.status === 200);
  const promoteBody = (await promoteRes.json()) as { promoted: number };
  await check("No promotion while full", promoteBody.promoted === 0);

  // Drop first student → opens seat → promote
  const dropRes = await fetch(`${BASE}/api/enrollments/${enr1.id}/drop`, {
    method: "POST",
    headers: { Cookie: studentCookie },
  });
  await check("Drop enrollment → 200", dropRes.status === 200);

  const promote2 = await fetch(`${BASE}/api/offerings/${offering.id}/waitlist/promote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admCookie },
    body: JSON.stringify({ count: 1 }),
  });
  const promote2Body = (await promote2.json()) as { promoted: number };
  await check("Waitlist promoted after drop", promote2Body.promoted === 1);

  // ── 6. ADM override (audited) ─────────────────────────────────────────────
  const overrideRes = await fetch(`${BASE}/api/offerings/${offering.id}/override`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admCookie },
    body: JSON.stringify({
      studentId: student.id,
      studentProgramId: sp!.id,
      reason: "Admin override for smoke test",
    }),
  });
  await check("Enrollment override → 200", overrideRes.status === 200);
  const audit = await db.auditLog.findFirst({
    where: { action: "enrollment.override", actorId: adm.id },
    orderBy: { createdAt: "desc" },
  });
  await check("Override audited", Boolean(audit));

  // ── 7. Degree audit ───────────────────────────────────────────────────────
  const auditRes = await fetch(`${BASE}/api/students/${student.id}/degree-audit?programId=${program.id}`, {
    headers: { Cookie: studentCookie },
  });
  await check("GET degree audit → 200", auditRes.status === 200);
  const auditBody = (await auditRes.json()) as { audit: { remaining: unknown[] } };
  await check("Degree audit has remaining reqs", auditBody.audit.remaining.length >= 1);

  // ── 8. WeekProgress unlocks self-paced weeks ──────────────────────────────
  const spOfferingRes = await fetch(`${BASE}/api/offerings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      courseId: course.id,
      mode: OfferingMode.SELF_PACED,
      status: OfferingStatus.OPEN,
    }),
  });
  const { offering: spOffering } = (await spOfferingRes.json()) as { offering: { id: string } };

  const w1Res = await fetch(`${BASE}/api/offerings/${spOffering.id}/weeks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({ number: 1, title: "Week 1" }),
  });
  const { week: week1 } = (await w1Res.json()) as { week: { id: string } };

  const w2Res = await fetch(`${BASE}/api/offerings/${spOffering.id}/weeks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({ number: 2, title: "Week 2" }),
  });
  const { week: week2 } = (await w2Res.json()) as { week: { id: string } };

  await fetch(`${BASE}/api/offerings/${spOffering.id}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ acknowledgeScheduleConflict: true }),
  });

  const contentBefore = await fetch(`${BASE}/api/offerings/${spOffering.id}/content`, {
    headers: { Cookie: studentCookie },
  });
  const before = (await contentBefore.json()) as { weeks: { number: number; unlocked: boolean }[] };
  await check("Week 1 unlocked initially", before.weeks.find((w) => w.number === 1)?.unlocked === true);
  await check("Week 2 locked initially", before.weeks.find((w) => w.number === 2)?.unlocked === false);

  const completeRes = await fetch(`${BASE}/api/weeks/${week1.id}/complete`, {
    method: "POST",
    headers: { Cookie: studentCookie },
  });
  await check("POST week complete → 201", completeRes.status === 201);

  const progress = await db.weekProgress.findFirst({
    where: { studentId: student.id, weekId: week1.id },
  });
  await check("WeekProgress row created", Boolean(progress));

  const contentAfter = await fetch(`${BASE}/api/offerings/${spOffering.id}/content`, {
    headers: { Cookie: studentCookie },
  });
  const after = (await contentAfter.json()) as { weeks: { number: number; unlocked: boolean }[] };
  await check("Week 2 unlocked after week 1 complete", after.weeks.find((w) => w.number === 2)?.unlocked === true);

  void week2;
  void student2;

  console.log("\n=== Phase-4 acceptance complete ===");
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
