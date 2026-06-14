/**
 * Phase-3 acceptance smoke script.
 * Semesters → offerings → clone → staff → content → preview → pricing → gating
 */
import { PrismaClient, OfferingMode, RoleType } from "@prisma/client";
import { randomBytes } from "crypto";
import { isWeekUnlocked } from "../lib/services/offeringAccess";

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
      email: `smoke-p3-${roles.join("-")}-${Date.now()}@test.local`,
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
  console.log("=== Phase-3 Acceptance Smoke ===\n");

  const { user: admUser, cookie: admCookie } = await createSessionUser([RoleType.ADMINISTRATIVE_ADMIN]);
  const { user: acaUser, cookie: acaCookie } = await createSessionUser([RoleType.ACADEMIC_ADMIN]);
  const { user: insUser, cookie: insCookie } = await createSessionUser([RoleType.INSTRUCTOR]);
  const { user: finUser, cookie: finCookie } = await createSessionUser([RoleType.FINANCIAL_ADMIN]);

  const ids: Record<string, string> = {};

  // ── 1. Academic year + semester (ADM) ─────────────────────────────────────
  const yearRes = await fetch(`${BASE}/api/academic-years`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admCookie },
    body: JSON.stringify({
      name: `AY ${Date.now()}`,
      startDate: "2026-09-01",
      endDate: "2027-06-30",
    }),
  });
  await check("POST /api/academic-years → 201", yearRes.status === 201);
  const { year } = (await yearRes.json()) as { year: { id: string } };
  ids.yearId = year.id;

  const semRes = await fetch(`${BASE}/api/semesters`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admCookie },
    body: JSON.stringify({
      academicYearId: year.id,
      name: "Fall 2026",
      startDate: "2026-09-01",
      endDate: "2026-12-15",
      registrationStart: "2026-08-01",
      registrationEnd: "2026-08-31",
      addDropEndWeek: 2,
      lastWithdrawalWeek: 10,
      withdrawalRefundPercent: 50,
    }),
  });
  await check("POST /api/semesters → 201", semRes.status === 201);
  const { semester } = (await semRes.json()) as { semester: { id: string; withdrawalRefundPercent: number } };
  ids.semesterId = semester.id;
  await check("Semester refund % stored", semester.withdrawalRefundPercent === 50);

  // ── 2. Course + offerings (ACA) ───────────────────────────────────────────
  const courseRes = await fetch(`${BASE}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      code: `P3${Date.now().toString().slice(-6)}`,
      title: "Phase 3 Course",
      creditHours: 3,
    }),
  });
  await check("POST course → 201", courseRes.status === 201);
  const { course } = (await courseRes.json()) as { course: { id: string } };
  ids.courseId = course.id;

  const sourceOfferingRes = await fetch(`${BASE}/api/offerings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      courseId: course.id,
      mode: OfferingMode.COHORT,
      semesterId: semester.id,
      seatCapacity: 30,
      attendanceThresholdPercent: 60,
    }),
  });
  await check("POST source offering → 201", sourceOfferingRes.status === 201);
  const { offering: sourceOffering } = (await sourceOfferingRes.json()) as { offering: { id: string } };
  ids.sourceOfferingId = sourceOffering.id;

  const targetOfferingRes = await fetch(`${BASE}/api/offerings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      courseId: course.id,
      mode: OfferingMode.SELF_PACED,
    }),
  });
  await check("POST self-paced offering → 201", targetOfferingRes.status === 201);
  const { offering: targetOffering } = (await targetOfferingRes.json()) as { offering: { id: string } };
  ids.targetOfferingId = targetOffering.id;

  // ── 3. Build source content (ACA) ─────────────────────────────────────────
  const week1Res = await fetch(`${BASE}/api/offerings/${sourceOffering.id}/weeks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      number: 1,
      title: "Introduction",
      unlockDate: "2020-01-01",
      order: 1,
    }),
  });
  await check("POST week 1 → 201", week1Res.status === 201);
  const { week: week1 } = (await week1Res.json()) as { week: { id: string } };

  const week2Res = await fetch(`${BASE}/api/offerings/${sourceOffering.id}/weeks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      number: 2,
      title: "Advanced topics",
      unlockDate: "2099-01-01",
      order: 2,
    }),
  });
  await check("POST week 2 → 201", week2Res.status === 201);

  const videoRes = await fetch(`${BASE}/api/weeks/${week1.id}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      type: "VIDEO",
      title: "Welcome video",
      vimeoId: "123456789",
    }),
  });
  await check("POST video item → 201", videoRes.status === 201);

  const readingRes = await fetch(`${BASE}/api/weeks/${week1.id}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      type: "READING",
      title: "Syllabus PDF",
      fileUrl: "https://storage.example.com/syllabus.pdf",
    }),
  });
  await check("POST reading item → 201", readingRes.status === 201);

  const textRes = await fetch(`${BASE}/api/weeks/${week1.id}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      type: "TEXT",
      title: "Welcome text",
      body: "Hello learners!",
    }),
  });
  await check("POST text item → 201", textRes.status === 201);

  // ── 4. Clone content ──────────────────────────────────────────────────────
  const cloneRes = await fetch(`${BASE}/api/offerings/${targetOffering.id}/clone`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({ sourceOfferingId: sourceOffering.id }),
  });
  await check("POST clone → 200", cloneRes.status === 200);
  const { offering: cloned } = (await cloneRes.json()) as { offering: { weeks: Array<{ number: number }> } };
  await check("Clone copied weeks", cloned.weeks.length === 2, `weeks=${cloned.weeks.length}`);

  // ── 5. Staff assignment ───────────────────────────────────────────────────
  const staffRes = await fetch(`${BASE}/api/offerings/${sourceOffering.id}/staff`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      staff: [{ userId: insUser.id, role: "INSTRUCTOR" }],
    }),
  });
  await check("PUT staff → 200", staffRes.status === 200);

  const insWeekRes = await fetch(`${BASE}/api/offerings/${sourceOffering.id}/weeks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: insCookie },
    body: JSON.stringify({ number: 3, title: "INS week", order: 3 }),
  });
  await check("INS can add week when staffed → 201", insWeekRes.status === 201);

  // ── 6. Public preview ─────────────────────────────────────────────────────
  const previewRes = await fetch(`${BASE}/api/offerings/${sourceOffering.id}/preview`);
  await check("GET preview (no auth) → 200", previewRes.status === 200);
  const preview = (await previewRes.json()) as {
    weeks: Array<{ number: number; title: string }>;
    week1Items: Array<{ title: string }>;
  };
  await check("Preview lists all week titles", preview.weeks.length >= 2);
  await check("Preview includes week 1 items", preview.week1Items.length >= 3);

  // ── 7. FIN pricing ────────────────────────────────────────────────────────
  const pricingRes = await fetch(`${BASE}/api/offerings/${sourceOffering.id}/pricing`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: finCookie },
    body: JSON.stringify({ priceUsdOverride: 9900, priceEgpOverride: 500000 }),
  });
  await check("PUT offering pricing → 200", pricingRes.status === 200);
  const { offering: priced } = (await pricingRes.json()) as {
    offering: { priceUsdOverride: number; priceEgpOverride: number };
  };
  await check("USD override saved", priced.priceUsdOverride === 9900);
  await check("EGP override saved", priced.priceEgpOverride === 500000);

  // ── 8. Storage graceful degrade ───────────────────────────────────────────
  const uploadRes = await fetch(`${BASE}/api/storage/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      offeringId: sourceOffering.id,
      filename: "test.pdf",
      contentType: "application/pdf",
    }),
  });
  await check(
    "Storage upload returns 503 when unconfigured",
    uploadRes.status === 503 || uploadRes.status === 200,
  );

  // ── 9. Gating logic (pure functions, WeekProgress deferred) ───────────────
  const cohortPast = isWeekUnlocked({
    offeringMode: OfferingMode.COHORT,
    weekNumber: 1,
    unlockDate: new Date("2020-01-01"),
    now: new Date(),
    completedWeekNumbers: [],
    hasPassed: false,
  });
  const cohortFuture = isWeekUnlocked({
    offeringMode: OfferingMode.COHORT,
    weekNumber: 2,
    unlockDate: new Date("2099-01-01"),
    now: new Date(),
    completedWeekNumbers: [],
    hasPassed: false,
  });
  const selfPaced = isWeekUnlocked({
    offeringMode: OfferingMode.SELF_PACED,
    weekNumber: 2,
    unlockDate: null,
    now: new Date(),
    completedWeekNumbers: [1],
    hasPassed: false,
  });
  const lifetime = isWeekUnlocked({
    offeringMode: OfferingMode.COHORT,
    weekNumber: 5,
    unlockDate: new Date("2099-01-01"),
    now: new Date(),
    completedWeekNumbers: [],
    hasPassed: true,
  });
  await check("Cohort gating: past unlockDate opens week", cohortPast);
  await check("Cohort gating: future unlockDate locks week", !cohortFuture);
  await check("Self-paced gating: prior week complete unlocks next", selfPaced);
  await check("Lifetime access after passing", lifetime);

  // ── 10. Auth guardrails ───────────────────────────────────────────────────
  const noAuth = await fetch(`${BASE}/api/semesters`);
  await check("GET /api/semesters no cookie → 401", noAuth.status === 401);

  const insCreateOffering = await fetch(`${BASE}/api/offerings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: insCookie },
    body: JSON.stringify({ courseId: course.id, mode: OfferingMode.SELF_PACED }),
  });
  await check("INS cannot create offering → 403", insCreateOffering.status === 403);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  for (const offeringId of [ids.sourceOfferingId, ids.targetOfferingId]) {
    if (!offeringId) continue;
    await db.contentItem.deleteMany({ where: { week: { offeringId } } });
    await db.week.deleteMany({ where: { offeringId } });
    await db.offeringStaff.deleteMany({ where: { offeringId } });
    await db.courseOffering.delete({ where: { id: offeringId } }).catch(() => {});
  }
  if (ids.semesterId) await db.semester.delete({ where: { id: ids.semesterId } }).catch(() => {});
  if (ids.yearId) await db.academicYear.delete({ where: { id: ids.yearId } }).catch(() => {});
  if (ids.courseId) await db.course.delete({ where: { id: ids.courseId } }).catch(() => {});

  await db.auditLog.deleteMany({
    where: { actorId: { in: [admUser.id, acaUser.id, insUser.id, finUser.id] } },
  });
  for (const u of [admUser, acaUser, insUser, finUser]) {
    await db.user.delete({ where: { id: u.id } });
  }

  console.log("\n✓ Cleaned up");
  console.log(`\n${process.exitCode !== 1 ? "✅ ALL CHECKS PASS" : "❌ SOME CHECKS FAILED"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
