import { test, expect } from "@playwright/test";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

test.describe("Phase 2 — Academics API guardrails", () => {
  test("GET /api/programs → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/programs`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/courses → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/courses`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/grading-schemes → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/grading-schemes`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/assessment-templates → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/assessment-templates`);
    expect(res.status()).toBe(401);
  });

  test("PUT /api/translations → 401 without session", async ({ request }) => {
    const res = await request.put(`${BASE}/api/translations`, {
      data: {
        entityType: "Course",
        entityId: "x",
        field: "title",
        locale: "ar",
        value: "test",
      },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Phase 2 — Full academic flow", () => {
  test("ACA builds curriculum; student flags interest; translation verify", async ({ request }) => {
    const { PrismaClient, RoleType } = await import("@prisma/client");
    const { randomBytes } = await import("crypto");

    const db = new PrismaClient();
    const acaToken = randomBytes(32).toString("hex");
    const stuToken = randomBytes(32).toString("hex");

    const aca = await db.user.create({
      data: {
        email: `e2e-aca-${Date.now()}@test.local`,
        firstName: "ACA",
        lastName: "Admin",
        emailVerified: true,
        status: "ACTIVE",
        roles: { create: { role: RoleType.ACADEMIC_ADMIN } },
        sessions: { create: { token: acaToken, expiresAt: new Date(Date.now() + 600_000) } },
      },
    });
    const student = await db.user.create({
      data: {
        email: `e2e-stu-${Date.now()}@test.local`,
        firstName: "Student",
        lastName: "User",
        emailVerified: true,
        status: "ACTIVE",
        roles: { create: { role: RoleType.STUDENT } },
        sessions: { create: { token: stuToken, expiresAt: new Date(Date.now() + 600_000) } },
      },
    });

    const acaCookie = `spims_session=${acaToken}`;
    const stuCookie = `spims_session=${stuToken}`;

    let scheme: { id: string } | undefined;
    let course: { id: string } | undefined;
    let program: { id: string } | undefined;

    try {
      const schemeRes = await request.post(`${BASE}/api/grading-schemes`, {
        headers: { Cookie: acaCookie },
        data: {
          name: `E2E Scheme ${Date.now()}`,
          bands: [{ letter: "A", minPercent: 90, maxPercent: 100, gpaPoints: 4, isPassing: true }],
        },
      });
      expect(schemeRes.status()).toBe(201);
      ({ scheme } = await schemeRes.json() as { scheme: { id: string } });

      const courseRes = await request.post(`${BASE}/api/courses`, {
        headers: { Cookie: acaCookie },
        data: {
          code: `E2E${Date.now().toString().slice(-5)}`,
          title: "E2E Course",
          creditHours: 3,
        },
      });
      expect(courseRes.status()).toBe(201);
      ({ course } = await courseRes.json() as { course: { id: string } });

      const programRes = await request.post(`${BASE}/api/programs`, {
        headers: { Cookie: acaCookie },
        data: {
          code: `EP${Date.now().toString().slice(-5)}`,
          name: "E2E Program",
          type: "DIPLOMA",
          maxCreditsPerSemester: 18,
          maxCoursesPerSemester: 6,
          maxSemestersToGraduate: 8,
          gradingSchemeId: scheme.id,
        },
      });
      expect(programRes.status()).toBe(201);
      ({ program } = await programRes.json() as { program: { id: string } });

      const reqRes = await request.put(`${BASE}/api/programs/${program.id}/requirements`, {
        headers: { Cookie: acaCookie },
        data: { requirements: [{ courseId: course.id, requirement: "REQUIRED" }] },
      });
      expect(reqRes.status()).toBe(200);

      const flagRes = await request.post(`${BASE}/api/courses/${course.id}/interest`, {
        headers: { Cookie: stuCookie },
      });
      expect(flagRes.status()).toBe(201);

      const countRes = await request.get(`${BASE}/api/courses/${course.id}/interest/count`, {
        headers: { Cookie: acaCookie },
      });
      expect(countRes.status()).toBe(200);
      const count = await countRes.json() as { count: number };
      expect(count.count).toBeGreaterThanOrEqual(1);

      const transRes = await request.put(`${BASE}/api/translations`, {
        headers: { Cookie: acaCookie },
        data: {
          entityType: "Course",
          entityId: course.id,
          field: "title",
          locale: "ar",
          value: "دورة اختبار",
        },
      });
      expect(transRes.status()).toBe(200);
      const { translation } = await transRes.json() as { translation: { id: string } };

      const verifyRes = await request.post(`${BASE}/api/translations/verify`, {
        headers: { Cookie: acaCookie },
        data: { translationId: translation.id },
      });
      expect(verifyRes.status()).toBe(200);
    } finally {
      await db.translation.deleteMany({ where: { entityId: course?.id } }).catch(() => {});
      await db.courseInterestFlag.deleteMany({ where: { courseId: course?.id } }).catch(() => {});
      await db.programCourse.deleteMany({ where: { programId: program?.id } }).catch(() => {});
      if (program?.id) await db.program.delete({ where: { id: program.id } }).catch(() => {});
      if (course?.id) await db.course.delete({ where: { id: course.id } }).catch(() => {});
      if (scheme?.id) await db.gradingScheme.delete({ where: { id: scheme.id } }).catch(() => {});
      await db.user.delete({ where: { id: aca.id } });
      await db.user.delete({ where: { id: student.id } });
      await db.$disconnect();
    }
  });
});
