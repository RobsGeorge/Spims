import { OfferingMode, OfferingStatus, ProgramType, RequirementType, RoleType } from "@prisma/client";

export const SEED_GRADING_SCHEME_NAME = "Standard Letter Grades";

export const DEFAULT_GRADE_BANDS = [
  { letter: "A", minPercent: 90, maxPercent: 100, gpaPoints: 4, isPassing: true },
  { letter: "B", minPercent: 80, maxPercent: 89.99, gpaPoints: 3, isPassing: true },
  { letter: "C", minPercent: 70, maxPercent: 79.99, gpaPoints: 2, isPassing: true },
  { letter: "D", minPercent: 60, maxPercent: 69.99, gpaPoints: 1, isPassing: true },
  { letter: "F", minPercent: 0, maxPercent: 59.99, gpaPoints: 0, isPassing: false },
] as const;

export const SEED_THEME_NAME = "Spims Default";

export const DEFAULT_THEME_TOKENS = {
  light: {
    "--background": "0 0% 100%",
    "--foreground": "222.2 84% 4.9%",
    "--primary": "222.2 47.4% 11.2%",
    "--primary-foreground": "210 40% 98%",
    "--muted": "210 40% 96.1%",
    "--muted-foreground": "215.4 16.3% 40%",
    "--accent": "43 60% 50%",
    "--accent-foreground": "222.2 47.4% 11.2%",
  },
  dark: {
    "--background": "222.2 84% 4.9%",
    "--foreground": "210 40% 98%",
    "--primary": "210 40% 98%",
    "--primary-foreground": "222.2 47.4% 11.2%",
    "--muted": "217.2 32.6% 17.5%",
    "--muted-foreground": "215 20.2% 65.1%",
    "--accent": "43 60% 50%",
    "--accent-foreground": "222.2 47.4% 11.2%",
  },
} as const;

export const SEED_PROGRAM = {
  code: "DEMO-BS",
  name: "Demo Bachelor of Science",
  type: ProgramType.DEGREE,
  maxCreditsPerSemester: 18,
  maxCoursesPerSemester: 6,
  maxSemestersToGraduate: 8,
  electiveCreditsRequired: 6,
} as const;

export const SEED_COURSE = {
  code: "INTRO101",
  title: "Introduction to Learning",
  creditHours: 3,
  isFree: true,
  isStandalone: true,
} as const;

export const SEED_OFFERING = {
  mode: OfferingMode.SELF_PACED,
  status: OfferingStatus.OPEN,
  seatCapacity: 100,
} as const;

export const SEED_ADMIN_ROLE = RoleType.SUPER_ADMIN;

export const SEED_REQUIREMENT = RequirementType.REQUIRED;
