import { test, expect } from "@playwright/test";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

test.describe("Phase 4 — API guardrails", () => {
  test("GET /api/applications → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/applications`);
    expect(res.status()).toBe(401);
  });

  test("POST /api/applications → 401 without session", async ({ request }) => {
    const res = await request.post(`${BASE}/api/applications`, { data: {} });
    expect(res.status()).toBe(401);
  });

  test("POST /api/weeks/x/complete → 401 without session", async ({ request }) => {
    const res = await request.post(`${BASE}/api/weeks/test-id/complete`);
    expect(res.status()).toBe(401);
  });
});

test.describe("Phase 4 — Admissions flow", () => {
  test("ADM form + student apply + accept matriculates", async ({ request }) => {
    const { PrismaClient, RoleType } = await import("@prisma/client");
    const { randomBytes } = await import("crypto");

    const db = new PrismaClient();
    const admToken = randomBytes(32).toString("hex");
    const acaToken = randomBytes(32).toString("hex");
    const stuToken = randomBytes(32).toString("hex");

    const adm = await db.user.create({
      data: {
        email: `e2e-adm-p4-${Date.now()}@test.local`,
        firstName: "ADM",
        lastName: "Admin",
        emailVerified: true,
        status: "ACTIVE",
        isReviewer: true,
        roles: { create: { role: RoleType.ADMINISTRATIVE_ADMIN } },
        sessions: { create: { token: admToken, expiresAt: new Date(Date.now() + 600_000) } },
      },
    });
    const aca = await db.user.create({
      data: {
        email: `e2e-aca-p4-${Date.now()}@test.local`,
        firstName: "ACA",
        lastName: "Admin",
        emailVerified: true,
        status: "ACTIVE",
        roles: { create: { role: RoleType.ACADEMIC_ADMIN } },
        sessions: { create: { token: acaToken, expiresAt: new Date(Date.now() + 600_000) } },
      },
    });
    const stu = await db.user.create({
      data: {
        email: `e2e-stu-p4-${Date.now()}@test.local`,
        firstName: "Stu",
        lastName: "Dent",
        emailVerified: true,
        status: "ACTIVE",
        roles: { create: { role: RoleType.STUDENT } },
        sessions: { create: { token: stuToken, expiresAt: new Date(Date.now() + 600_000) } },
      },
    });

    const admCookie = `spims_session=${admToken}`;
    const acaCookie = `spims_session=${acaToken}`;
    const stuCookie = `spims_session=${stuToken}`;

    const schemeRes = await request.post(`${BASE}/api/grading-schemes`, {
      headers: { Cookie: acaCookie },
      data: {
        name: "E2E P4 Scheme",
        bands: [{ letter: "A", minPercent: 90, maxPercent: 100, gpaPoints: 4, isPassing: true }],
      },
    });
    const { scheme } = await schemeRes.json();

    const progRes = await request.post(`${BASE}/api/programs`, {
      headers: { Cookie: acaCookie },
      data: {
        code: `E4${Date.now().toString().slice(-5)}`,
        name: "E2E P4 Program",
        type: "DEGREE",
        gradingSchemeId: scheme.id,
        maxCreditsPerSemester: 18,
        maxCoursesPerSemester: 6,
        maxSemestersToGraduate: 8,
        electiveCreditsRequired: 0,
      },
    });
    expect(progRes.status()).toBe(201);
    const { program } = await progRes.json();

    const formRes = await request.put(`${BASE}/api/programs/${program.id}/application-form`, {
      headers: { Cookie: admCookie },
      data: {
        name: "E2E Form",
        fields: [{ label: "Why", type: "TEXT", required: true, order: 0 }],
      },
    });
    expect(formRes.status()).toBe(200);
    const { form } = await formRes.json();

    const applyRes = await request.post(`${BASE}/api/applications`, {
      headers: { Cookie: stuCookie },
      data: {
        programId: program.id,
        values: [{ fieldId: form.fields[0].id, value: "Because" }],
      },
    });
    expect(applyRes.status()).toBe(201);

    const { application } = await applyRes.json();
    expect(application.reviewerId).toBeTruthy();

    const decideRes = await request.post(`${BASE}/api/applications/${application.id}/decision`, {
      headers: { Cookie: admCookie },
      data: { decision: "ACCEPTED" },
    });
    expect(decideRes.status()).toBe(200);

    const sp = await db.studentProgram.findUnique({
      where: { studentId_programId: { studentId: stu.id, programId: program.id } },
    });
    expect(sp?.status).toBe("ACTIVE");

    await db.$disconnect();
  });
});
