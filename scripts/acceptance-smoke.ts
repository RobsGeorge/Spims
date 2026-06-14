/**
 * Phase-0 acceptance smoke script.
 * Creates a temporary SA user + session, hits the smoke routes, verifies
 * AuditLog, then cleans up. Run with:  npx tsx scripts/acceptance-smoke.ts
 */
import { PrismaClient, RoleType } from "@prisma/client";
import { randomBytes } from "crypto";

const db = new PrismaClient();
const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

async function main() {
  console.log("=== Phase-0 Acceptance Smoke ===\n");

  // ── 1. Seed a temporary Super Admin + session ──────────────────────────
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60_000); // 1 min

  const user = await db.user.create({
    data: {
      email: `smoke-sa-${Date.now()}@test.local`,
      firstName: "Smoke",
      lastName: "Admin",
      emailVerified: true,
      status: "ACTIVE",
      roles: { create: { role: RoleType.SUPER_ADMIN } },
      sessions: { create: { token, expiresAt } },
    },
  });
  console.log(`✓ Created temp SA user: ${user.id}`);

  const cookie = `spims_session=${token}`;

  // ── 2. GET /api/smoke/protected  (no cookie → 401) ────────────────────
  const unauth = await fetch(`${BASE}/api/smoke/protected`);
  const unauthOk = unauth.status === 401;
  console.log(`${unauthOk ? "✓" : "✗"} GET /api/smoke/protected (no cookie) → ${unauth.status} ${unauthOk ? "(expected 401)" : "(EXPECTED 401, FAIL)"}`);

  // ── 3. GET /api/smoke/protected  (SA cookie → 200) ────────────────────
  const auth = await fetch(`${BASE}/api/smoke/protected`, {
    headers: { Cookie: cookie },
  });
  const authOk = auth.status === 200;
  const authBody = await auth.json() as { ok?: boolean };
  console.log(`${authOk ? "✓" : "✗"} GET /api/smoke/protected (SA cookie) → ${auth.status} ok=${authBody.ok}`);

  // ── 4. POST /api/smoke/mutation  (SA cookie → AuditLog written) ───────
  const before = await db.auditLog.count({ where: { action: "test.mutation" } });
  const mut = await fetch(`${BASE}/api/smoke/mutation`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: "{}",
  });
  const mutOk = mut.status === 200;
  const after = await db.auditLog.count({ where: { action: "test.mutation" } });
  const auditWritten = after > before;
  console.log(`${mutOk ? "✓" : "✗"} POST /api/smoke/mutation → ${mut.status}`);
  console.log(`${auditWritten ? "✓" : "✗"} AuditLog row written (before=${before} after=${after})`);

  // ── 5. Cleanup ─────────────────────────────────────────────────────────
  await db.auditLog.deleteMany({ where: { actorId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  console.log(`✓ Cleaned up temp user`);

  // ── Summary ────────────────────────────────────────────────────────────
  const allPass = unauthOk && authOk && mutOk && auditWritten;
  console.log(`\n${allPass ? "✅ ALL CHECKS PASS" : "❌ SOME CHECKS FAILED"}`);
  process.exit(allPass ? 0 : 1);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
