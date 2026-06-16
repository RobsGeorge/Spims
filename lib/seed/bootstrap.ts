import { hash } from "argon2";
import type { PrismaClient } from "@prisma/client";
import {
  DEFAULT_GRADE_BANDS,
  DEFAULT_THEME_TOKENS,
  SEED_ADMIN_ROLE,
  SEED_COURSE,
  SEED_GRADING_SCHEME_NAME,
  SEED_OFFERING,
  SEED_PROGRAM,
  SEED_REQUIREMENT,
  SEED_THEME_NAME,
} from "@/lib/seed/default-data";

export type SeedConfig = {
  adminEmail: string;
  adminPassword: string;
  adminFirstName?: string;
  adminLastName?: string;
};

export type SeedResult = {
  adminUserId: string;
  gradingSchemeId: string;
  themeId: string;
  programId: string;
  courseId: string;
  offeringId: string;
};

export async function seedLanguages(prisma: PrismaClient) {
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
}

export async function seedBootstrap(prisma: PrismaClient, config: SeedConfig): Promise<SeedResult> {
  await seedLanguages(prisma);

  let gradingScheme = await prisma.gradingScheme.findFirst({
    where: { name: SEED_GRADING_SCHEME_NAME, isDefault: true },
  });
  if (!gradingScheme) {
    gradingScheme = await prisma.gradingScheme.create({
      data: {
        name: SEED_GRADING_SCHEME_NAME,
        isDefault: true,
        bands: { create: [...DEFAULT_GRADE_BANDS] },
      },
    });
  }

  let theme = await prisma.theme.findFirst({ where: { name: SEED_THEME_NAME } });
  if (!theme) {
    theme = await prisma.theme.create({
      data: {
        name: SEED_THEME_NAME,
        siteName: "Spims",
        isActive: true,
        tokens: DEFAULT_THEME_TOKENS,
      },
    });
  } else if (!theme.isActive) {
    await prisma.theme.updateMany({ where: { isActive: true }, data: { isActive: false } });
    theme = await prisma.theme.update({
      where: { id: theme.id },
      data: { isActive: true, tokens: DEFAULT_THEME_TOKENS },
    });
  }

  const passwordHash = await hash(config.adminPassword);
  const admin = await prisma.user.upsert({
    where: { email: config.adminEmail },
    update: {
      passwordHash,
      emailVerified: true,
      status: "ACTIVE",
      firstName: config.adminFirstName ?? "Super",
      lastName: config.adminLastName ?? "Admin",
    },
    create: {
      email: config.adminEmail,
      firstName: config.adminFirstName ?? "Super",
      lastName: config.adminLastName ?? "Admin",
      passwordHash,
      emailVerified: true,
      status: "ACTIVE",
      roles: { create: { role: SEED_ADMIN_ROLE } },
    },
    include: { roles: true },
  });

  const hasSuperAdmin = admin.roles.some((r) => r.role === SEED_ADMIN_ROLE);
  if (!hasSuperAdmin) {
    await prisma.userRole.create({
      data: { userId: admin.id, role: SEED_ADMIN_ROLE },
    });
  }

  const program = await prisma.program.upsert({
    where: { code: SEED_PROGRAM.code },
    update: {
      name: SEED_PROGRAM.name,
      gradingSchemeId: gradingScheme.id,
      active: true,
      deletedAt: null,
    },
    create: {
      ...SEED_PROGRAM,
      gradingSchemeId: gradingScheme.id,
      active: true,
    },
  });

  const course = await prisma.course.upsert({
    where: { code: SEED_COURSE.code },
    update: {
      title: SEED_COURSE.title,
      creditHours: SEED_COURSE.creditHours,
      isFree: SEED_COURSE.isFree,
      isStandalone: SEED_COURSE.isStandalone,
      active: true,
      deletedAt: null,
    },
    create: {
      ...SEED_COURSE,
      active: true,
    },
  });

  await prisma.programCourse.upsert({
    where: { programId_courseId: { programId: program.id, courseId: course.id } },
    update: { requirement: SEED_REQUIREMENT },
    create: {
      programId: program.id,
      courseId: course.id,
      requirement: SEED_REQUIREMENT,
      yearLevel: 1,
    },
  });

  let offering = await prisma.courseOffering.findFirst({
    where: { courseId: course.id, mode: SEED_OFFERING.mode, deletedAt: null },
  });
  if (!offering) {
    offering = await prisma.courseOffering.create({
      data: {
        courseId: course.id,
        mode: SEED_OFFERING.mode,
        status: SEED_OFFERING.status,
        seatCapacity: SEED_OFFERING.seatCapacity,
      },
    });
  } else {
    offering = await prisma.courseOffering.update({
      where: { id: offering.id },
      data: {
        status: SEED_OFFERING.status,
        seatCapacity: SEED_OFFERING.seatCapacity,
      },
    });
  }

  return {
    adminUserId: admin.id,
    gradingSchemeId: gradingScheme.id,
    themeId: theme.id,
    programId: program.id,
    courseId: course.id,
    offeringId: offering.id,
  };
}
