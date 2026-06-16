import { PrismaClient } from "@prisma/client";
import { seedBootstrap } from "@/lib/seed/bootstrap";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env["SEED_ADMIN_EMAIL"] ?? "admin@spims.local";
  const adminPassword = process.env["SEED_ADMIN_PASSWORD"] ?? "ChangeMe!123";

  const result = await seedBootstrap(prisma, {
    adminEmail,
    adminPassword,
  });

  console.log("✓ Languages seeded");
  console.log(`✓ Default grading scheme: ${result.gradingSchemeId}`);
  console.log(`✓ Active theme: ${result.themeId}`);
  console.log(`✓ Super Admin: ${adminEmail} (${result.adminUserId})`);
  console.log(`✓ Sample program: ${result.programId}`);
  console.log(`✓ Sample course: ${result.courseId}`);
  console.log(`✓ Sample offering: ${result.offeringId}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
