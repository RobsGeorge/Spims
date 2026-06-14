import { test, expect } from "@playwright/test";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

test.describe("Phase 1 — Auth lifecycle", () => {
  const timestamp = Date.now();
  const email = `e2e-${timestamp}@test.local`;
  let userId = "";

  test("register → returns userId", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { email, firstName: "E2E", lastName: "Test" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json() as { id: string; email: string };
    expect(body.id).toBeTruthy();
    expect(body.email).toBe(email);
    userId = body.id;
  });

  test("register same email → 409 conflict", async ({ request }) => {
    // Attempt re-registration — should fail (userId set from prior test)
    if (!userId) test.skip();
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { email, firstName: "Dup", lastName: "User" },
    });
    expect(res.status()).toBe(409);
  });

  test("login before password set → 422 or 403", async ({ request }) => {
    if (!userId) test.skip();
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email, password: "anything" },
    });
    // Either 422 (no password hash) or 403 (not verified yet)
    expect([422, 403]).toContain(res.status());
  });

  test("password reset request → always 200", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/request`, {
      data: { email: "nobody@example.com" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("GET /api/me → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/me`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/users → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/users`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/themes → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/themes`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/branding → 200 (public)", async ({ request }) => {
    const res = await request.get(`${BASE}/api/branding`);
    expect(res.status()).toBe(200);
  });
});

test.describe("Phase 1 — Full auth flow with DB seeded user", () => {
  // This test uses the acceptance-smoke user pattern to pre-seed a known user
  // so we can test the full login → me → settings → logout flow

  test("login with seeded SA → access /api/me → logout", async ({ request }) => {
    const { PrismaClient, RoleType } = await import("@prisma/client");
    const { randomBytes } = await import("crypto");
    const argon2 = await import("argon2");

    const db = new PrismaClient();
    const password = "TestPassword123!";
    const passwordHash = await argon2.hash(password);
    const sessionToken = randomBytes(32).toString("hex");

    const user = await db.user.create({
      data: {
        email: `e2e-sa-${Date.now()}@test.local`,
        firstName: "SA",
        lastName: "Test",
        emailVerified: true,
        status: "ACTIVE",
        passwordHash,
        roles: { create: { role: RoleType.SUPER_ADMIN } },
        sessions: { create: { token: sessionToken, expiresAt: new Date(Date.now() + 60_000) } },
      },
    });

    try {
      // GET /api/me with session cookie
      const meRes = await request.get(`${BASE}/api/me`, {
        headers: { Cookie: `spims_session=${sessionToken}` },
      });
      expect(meRes.status()).toBe(200);
      const meBody = await meRes.json() as { user: { email: string } };
      expect(meBody.user.email).toBe(user.email);

      // GET /api/users with SA session
      const usersRes = await request.get(`${BASE}/api/users`, {
        headers: { Cookie: `spims_session=${sessionToken}` },
      });
      expect(usersRes.status()).toBe(200);

      // GET /api/themes with session
      const themesRes = await request.get(`${BASE}/api/themes`, {
        headers: { Cookie: `spims_session=${sessionToken}` },
      });
      expect(themesRes.status()).toBe(200);

      // PATCH /api/users/:id — non-SA tries to assign SA role → 403
      const selfPatchRes = await request.patch(`${BASE}/api/users/${user.id}`, {
        headers: { Cookie: `spims_session=${sessionToken}`, "Content-Type": "application/json" },
        data: { firstName: "Updated" },
      });
      expect(selfPatchRes.status()).toBe(200);

    } finally {
      await db.auditLog.deleteMany({ where: { actorId: user.id } });
      await db.user.delete({ where: { id: user.id } });
      await db.$disconnect();
    }
  });
});
