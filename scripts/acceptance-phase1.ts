/**
 * Phase-1 acceptance smoke script.
 * Tests: register → verify OTP → set password → login → me → users (admin) → themes → logout
 */
import { PrismaClient, RoleType } from "@prisma/client";
import { randomBytes } from "crypto";
import * as argon2 from "argon2";

const db = new PrismaClient();
const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

async function check(label: string, condition: boolean, detail = "") {
  console.log(`${condition ? "✓" : "✗"} ${label}${detail ? " — " + detail : ""}`);
  if (!condition) process.exitCode = 1;
}

async function main() {
  console.log("=== Phase-1 Acceptance Smoke ===\n");

  const email = `smoke-p1-${Date.now()}@test.local`;

  // ── 1. Register ──────────────────────────────────────────────────────────
  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, firstName: "Smoke", lastName: "User" }),
  });
  await check("POST /api/auth/register → 201", regRes.status === 201);
  const { id: userId } = await regRes.json() as { id: string; email: string };
  await check("Register returns userId", !!userId);

  // ── 2. Duplicate register → 409 ──────────────────────────────────────────
  const dupRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, firstName: "Dup", lastName: "User" }),
  });
  await check("Duplicate register → 409", dupRes.status === 409);

  // ── 3. Verify OTP (read from DB to get real OTP code) ───────────────────
  const otpToken = await db.otpToken.findFirst({
    where: { userId, purpose: "EMAIL_VERIFICATION", consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  await check("OtpToken created in DB", !!otpToken);

  // Find the raw code via brute force (just look at console log in dev)
  // In testing, we get the actual code from issueOtp which was console.warned
  // Instead, create a fresh OTP with a known code for testing:
  const testCode = "999888";
  const codeHash = await argon2.hash(testCode);
  await db.otpToken.create({
    data: {
      userId,
      purpose: "EMAIL_VERIFICATION",
      codeHash,
      expiresAt: new Date(Date.now() + 600_000),
    },
  });

  const verifyRes = await fetch(`${BASE}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, code: testCode, purpose: "EMAIL_VERIFICATION" }),
  });
  await check("POST /api/auth/verify-otp → 200", verifyRes.status === 200);

  // Check user is now ACTIVE + emailVerified
  const dbUser = await db.user.findUnique({ where: { id: userId } });
  await check("User emailVerified=true after OTP", dbUser?.emailVerified === true);
  await check("User status=ACTIVE after OTP", dbUser?.status === "ACTIVE");

  // ── 4. Set password ───────────────────────────────────────────────────────
  const setPassRes = await fetch(`${BASE}/api/auth/set-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, password: "SmokePass123!", confirmPassword: "SmokePass123!" }),
  });
  await check("POST /api/auth/set-password → 200", setPassRes.status === 200);

  // Get the session cookie from response
  const setCookieHeader = setPassRes.headers.get("set-cookie") ?? "";
  const sessionCookieMatch = setCookieHeader.match(/spims_session=([^;]+)/);
  const sessionCookie = sessionCookieMatch ? `spims_session=${sessionCookieMatch[1]}` : "";
  await check("Session cookie set after set-password", !!sessionCookie);

  // ── 5. GET /api/me ────────────────────────────────────────────────────────
  const meRes = await fetch(`${BASE}/api/me`, {
    headers: { Cookie: sessionCookie },
  });
  await check("GET /api/me → 200", meRes.status === 200);

  // ── 6. Logout ─────────────────────────────────────────────────────────────
  const logoutRes = await fetch(`${BASE}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: sessionCookie },
  });
  await check("POST /api/auth/logout → 200", logoutRes.status === 200);

  // ── 7. Login with password ────────────────────────────────────────────────
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "SmokePass123!" }),
  });
  await check("POST /api/auth/login → 200", loginRes.status === 200);
  const loginCookieMatch = (loginRes.headers.get("set-cookie") ?? "").match(/spims_session=([^;]+)/);
  const loginCookie = loginCookieMatch ? `spims_session=${loginCookieMatch[1]}` : "";

  // ── 8. Wrong password → 422 ───────────────────────────────────────────────
  const badPassRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "WrongPassword!" }),
  });
  await check("Login with wrong password → 422", badPassRes.status === 422);

  // ── 9. /api/me with login cookie ─────────────────────────────────────────
  const meAfterLoginRes = await fetch(`${BASE}/api/me`, {
    headers: { Cookie: loginCookie },
  });
  await check("GET /api/me after login → 200", meAfterLoginRes.status === 200);

  // ── 10. /api/me without cookie → 401 ─────────────────────────────────────
  const meNoAuthRes = await fetch(`${BASE}/api/me`);
  await check("GET /api/me no cookie → 401", meNoAuthRes.status === 401);

  // ── 11. /api/users without cookie → 401 ──────────────────────────────────
  const usersNoAuthRes = await fetch(`${BASE}/api/users`);
  await check("GET /api/users no cookie → 401", usersNoAuthRes.status === 401);

  // ── 12. /api/users with student session → 403 ────────────────────────────
  const usersStudentRes = await fetch(`${BASE}/api/users`, {
    headers: { Cookie: loginCookie },
  });
  await check("GET /api/users as student → 403", usersStudentRes.status === 403);

  // ── 13. SA user can access /api/users ────────────────────────────────────
  const saToken = randomBytes(32).toString("hex");
  const saUser = await db.user.create({
    data: {
      email: `smoke-sa-p1-${Date.now()}@test.local`,
      firstName: "SA",
      lastName: "Admin",
      emailVerified: true,
      status: "ACTIVE",
      roles: { create: { role: RoleType.SUPER_ADMIN } },
      sessions: { create: { token: saToken, expiresAt: new Date(Date.now() + 60_000) } },
    },
  });
  const saCookie = `spims_session=${saToken}`;

  const usersAdminRes = await fetch(`${BASE}/api/users`, { headers: { Cookie: saCookie } });
  await check("GET /api/users as SA → 200", usersAdminRes.status === 200);

  // ── 14. Password reset request → always 200 ───────────────────────────────
  const resetRes = await fetch(`${BASE}/api/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nobody@nowhere.test" }),
  });
  await check("Password reset request (unknown email) → 200", resetRes.status === 200);

  // ── 15. Verify AuditLog rows were written ─────────────────────────────────
  const auditCount = await db.auditLog.count({ where: { entityType: "User", entityId: userId } });
  await check("AuditLog rows written for user lifecycle", auditCount > 0, `${auditCount} rows`);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  await db.auditLog.deleteMany({ where: { actorId: userId } });
  await db.auditLog.deleteMany({ where: { entityId: userId } });
  await db.auditLog.deleteMany({ where: { actorId: saUser.id } });
  await db.user.delete({ where: { id: userId } });
  await db.user.delete({ where: { id: saUser.id } });
  console.log("\n✓ Cleaned up");

  const passed = process.exitCode !== 1;
  console.log(`\n${passed ? "✅ ALL CHECKS PASS" : "❌ SOME CHECKS FAILED"}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
