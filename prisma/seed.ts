import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed supported languages
  await prisma.language.upsert({
    where: { code: "en" },
    update: {},
    create: { code: "en", name: "English", isRtl: false, enabled: true },
  });
  await prisma.language.upsert({
    where: { code: "ar" },
    update: {},
    create: { code: "ar", name: "العربية", isRtl: true, enabled: true },
  });
  await prisma.language.upsert({
    where: { code: "fr" },
    update: {},
    create: { code: "fr", name: "Français", isRtl: false, enabled: true },
  });

  console.log("✓ Languages seeded");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
