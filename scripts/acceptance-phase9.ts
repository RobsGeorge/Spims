/**
 * Phase-9 acceptance smoke script.
 */
import { PrismaClient } from "@prisma/client";
import { verify } from "argon2";
import {
  SEED_COURSE,
  SEED_GRADING_SCHEME_NAME,
  SEED_PROGRAM,
  SEED_THEME_NAME,
} from "../lib/seed/default-data";
import { enqueueJob } from "../lib/jobs/queue";
import { buildSecurityHeaders } from "../lib/security/headers";

const db = new PrismaClient();
const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

async function check(label: string, condition: boolean, detail = "") {
  console.log(`${condition ? "✓" : "✗"} ${label}${detail ? " — " + detail : ""}`);
  if (!condition) process.exitCode = 1;
}

async function main() {
  console.log("=== Phase-9 Acceptance Smoke ===\n");

  const adminEmail = process.env["SEED_ADMIN_EMAIL"] ?? "admin@spims.local";
  const adminPassword = process.env["SEED_ADMIN_PASSWORD"] ?? "ChangeMe!123";

  const admin = await db.user.findUnique({
    where: { email: adminEmail },
    include: { roles: true },
  });
  await check("Seed Super Admin exists", Boolean(admin));
  await check(
    "Seed Super Admin has SUPER_ADMIN role",
    Boolean(admin?.roles.some((r) => r.role === "SUPER_ADMIN")),
  );
  if (admin?.passwordHash) {
    const passwordOk = await verify(admin.passwordHash, adminPassword);
    await check("Seed Super Admin password verifies", passwordOk);
  }

  const scheme = await db.gradingScheme.findFirst({ where: { isDefault: true, name: SEED_GRADING_SCHEME_NAME } });
  await check("Default grading scheme seeded", Boolean(scheme));

  const theme = await db.theme.findFirst({ where: { isActive: true, name: SEED_THEME_NAME } });
  await check("Active default theme seeded", Boolean(theme));

  const program = await db.program.findUnique({ where: { code: SEED_PROGRAM.code } });
  await check("Sample program seeded", Boolean(program));

  const course = await db.course.findUnique({ where: { code: SEED_COURSE.code } });
  await check("Sample course seeded", Boolean(course));

  const offering = course
    ? await db.courseOffering.findFirst({ where: { courseId: course.id, deletedAt: null } })
    : null;
  await check("Sample offering seeded", Boolean(offering));

  const health = await fetch(`${BASE}/api/health`);
  const healthBody = (await health.json()) as { status?: string; checks?: { database?: boolean } };
  await check("GET /api/health → 200", health.status === 200);
  await check("Health reports database ok", healthBody.checks?.database === true);

  const loginRes = await fetch(`${BASE}/api/health`);
  const frameOpts = loginRes.headers.get("x-frame-options");
  await check("Security header X-Frame-Options present", frameOpts?.toUpperCase() === "DENY");

  const headerKeys = buildSecurityHeaders(false).map((h) => h.key.toLowerCase());
  await check("Security header config includes baseline keys", headerKeys.includes("x-content-type-options"));

  let jobOk = false;
  try {
    await enqueueJob("session-reminders", {});
    jobOk = true;
  } catch (err) {
    console.log(`  job enqueue error: ${err instanceof Error ? err.message : err}`);
  }
  await check("Job enqueue (session-reminders) succeeds", jobOk);

  const branding = await fetch(`${BASE}/api/branding`);
  await check("Branding API → 200", branding.status === 200);

  console.log("\nManual / VPS checks:");
  console.log("  • HTTPS via Nginx + Let's Encrypt (see docs/runbooks/hetzner-deploy.md)");
  console.log("  • Daily cron: scripts/backup-db.sh + off-site copy");
  console.log("  • Worker: npm run worker (or docker-compose.prod.yml service)");
  console.log("  • Concurrency: npx tsx scripts/load-test-exam.ts <attemptId> 150");

  console.log("\n=== Done ===");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
