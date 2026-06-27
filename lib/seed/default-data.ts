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

// Sacred Academic — keep in sync with app/globals.css (the live source) and DESIGN.md.
export const DEFAULT_THEME_TOKENS = {
  light: {
    "--background": "231.4 100% 98.6%",
    "--foreground": "212.4 62.7% 11.6%",
    "--primary": "336.7 93.7% 18.8%",
    "--primary-foreground": "0 0% 100%",
    "--secondary": "221.2 100% 96.9%",
    "--secondary-foreground": "350.5 12.6% 29.6%",
    "--muted": "221.2 100% 96.9%",
    "--muted-foreground": "350.5 12.6% 29.6%",
    "--accent": "350.5 100% 92.5%",
    "--accent-foreground": "341.5 57.3% 32.2%",
    "--gold": "41.2 75.7% 66.1%",
    "--gold-foreground": "42.2 100% 7.3%",
    "--success": "160.1 84.1% 39.4%",
    "--warning": "37.7 92.1% 50.2%",
    "--destructive": "0 84.2% 60.2%",
    "--border": "351.1 27.3% 80.6%",
    "--ring": "336.7 93.7% 18.8%",
  },
  dark: {
    "--background": "222.9 44.7% 9.2%",
    "--foreground": "228.9 65.9% 92%",
    "--primary": "348.5 100% 84.7%",
    "--primary-foreground": "338.6 100% 11%",
    "--secondary": "223.6 34.4% 12.5%",
    "--secondary-foreground": "228.9 65.9% 92%",
    "--muted": "223.6 34.4% 12.5%",
    "--muted-foreground": "351.1 27.3% 80.6%",
    "--accent": "341.3 60.8% 30%",
    "--accent-foreground": "350.5 100% 92.5%",
    "--gold": "40.6 73.8% 67.1%",
    "--gold-foreground": "42.2 100% 7.3%",
    "--success": "160.1 84.1% 39.4%",
    "--warning": "37.7 92.1% 50.2%",
    "--destructive": "0 84.2% 60.2%",
    "--border": "350.5 12.6% 29.6%",
    "--ring": "348.5 100% 84.7%",
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
