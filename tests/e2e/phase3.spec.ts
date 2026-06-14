import { test, expect } from "@playwright/test";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

test.describe("Phase 3 — API guardrails", () => {
  test("GET /api/semesters → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/semesters`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/offerings → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/offerings`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/academic-years → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/academic-years`);
    expect(res.status()).toBe(401);
  });
});

test.describe("Phase 3 — Offerings flow", () => {
  test("preview is public; ACA builds offering content", async ({ request }) => {
    const { PrismaClient, RoleType, OfferingMode } = await import("@prisma/client");
    const { randomBytes } = await import("crypto");

    const db = new PrismaClient();
    const admToken = randomBytes(32).toString("hex");
    const acaToken = randomBytes(32).toString("hex");

    const adm = await db.user.create({
      data: {
        email: `e2e-adm-p3-${Date.now()}@test.local`,
        firstName: "ADM",
        lastName: "Admin",
        emailVerified: true,
        status: "ACTIVE",
        roles: { create: { role: RoleType.ADMINISTRATIVE_ADMIN } },
        sessions: { create: { token: admToken, expiresAt: new Date(Date.now() + 600_000) } },
      },
    });
    const aca = await db.user.create({
      data: {
        email: `e2e-aca-p3-${Date.now()}@test.local`,
        firstName: "ACA",
        lastName: "Admin",
        emailVerified: true,
        status: "ACTIVE",
        roles: { create: { role: RoleType.ACADEMIC_ADMIN } },
        sessions: { create: { token: acaToken, expiresAt: new Date(Date.now() + 600_000) } },
      },
    });

    const admCookie = `spims_session=${admToken}`;
    const acaCookie = `spims_session=${acaToken}`;

    const yearRes = await request.post(`${BASE}/api/academic-years`, {
      headers: { Cookie: admCookie },
      data: { name: "E2E Year", startDate: "2026-09-01", endDate: "2027-06-30" },
    });
    expect(yearRes.status()).toBe(201);
    const { year } = await yearRes.json();

    const semRes = await request.post(`${BASE}/api/semesters`, {
      headers: { Cookie: admCookie },
      data: {
        academicYearId: year.id,
        name: "E2E Semester",
        startDate: "2026-09-01",
        endDate: "2026-12-15",
        registrationStart: "2026-08-01",
        registrationEnd: "2026-08-31",
        addDropEndWeek: 2,
        lastWithdrawalWeek: 10,
      },
    });
    expect(semRes.status()).toBe(201);
    const { semester } = await semRes.json();

    const courseRes = await request.post(`${BASE}/api/courses`, {
      headers: { Cookie: acaCookie },
      data: {
        code: `E2E${Date.now().toString().slice(-5)}`,
        title: "E2E Phase 3",
        creditHours: 3,
      },
    });
    expect(courseRes.status()).toBe(201);
    const { course } = await courseRes.json();

    const offeringRes = await request.post(`${BASE}/api/offerings`, {
      headers: { Cookie: acaCookie },
      data: {
        courseId: course.id,
        mode: OfferingMode.COHORT,
        semesterId: semester.id,
      },
    });
    expect(offeringRes.status()).toBe(201);
    const { offering } = await offeringRes.json();

    const weekRes = await request.post(`${BASE}/api/offerings/${offering.id}/weeks`, {
      headers: { Cookie: acaCookie },
      data: { number: 1, title: "Week One", order: 1 },
    });
    expect(weekRes.status()).toBe(201);
    const { week } = await weekRes.json();

    const itemRes = await request.post(`${BASE}/api/weeks/${week.id}/items`, {
      headers: { Cookie: acaCookie },
      data: { type: "TEXT", title: "Hello", body: "Preview content" },
    });
    expect(itemRes.status()).toBe(201);

    const previewRes = await request.get(`${BASE}/api/offerings/${offering.id}/preview`);
    expect(previewRes.status()).toBe(200);
    const preview = await previewRes.json();
    expect(preview.weeks.length).toBeGreaterThanOrEqual(1);
    expect(preview.week1Items.length).toBeGreaterThanOrEqual(1);

    await db.contentItem.deleteMany({ where: { week: { offeringId: offering.id } } });
    await db.week.deleteMany({ where: { offeringId: offering.id } });
    await db.courseOffering.delete({ where: { id: offering.id } });
    await db.semester.delete({ where: { id: semester.id } });
    await db.academicYear.delete({ where: { id: year.id } });
    await db.course.delete({ where: { id: course.id } });
    await db.auditLog.deleteMany({ where: { actorId: { in: [adm.id, aca.id] } } });
    await db.user.delete({ where: { id: adm.id } });
    await db.user.delete({ where: { id: aca.id } });
    await db.$disconnect();
  });
});
