import { db } from "@/lib/db";
import { EnrollmentStatus, type OfferingMode } from "@prisma/client";
import { resolveRegionalCurrency, type Currency } from "@/lib/money";
import { getStudentEnrollments } from "./enrollment";
import { getWalletSummary } from "./wallet";
import { getStudentTranscript } from "./grading";
import { sessionEnd, isJoinWindowOpen } from "./session";

export interface DashboardCourse {
  offeringId: string;
  code: string;
  title: string;
  progressPercent: number;
  semesterName: string | null;
  mode: OfferingMode;
}

export interface DashboardSession {
  id: string;
  offeringId: string;
  title: string;
  courseCode: string;
  scheduledStart: string;
  durationMinutes: number;
  joinOpen: boolean;
}

export interface DashboardGrade {
  id: string;
  code: string;
  title: string;
  letterGrade: string;
  gpaPoints: number;
  completedAt: string;
}

export interface StudentDashboardData {
  firstName: string;
  semester: { name: string; week: number | null } | null;
  gpa: number | null;
  courses: DashboardCourse[];
  nextSession: DashboardSession | null;
  wallet: {
    currency: Currency;
    moneyMinor: number;
    pointsMinor: number;
  };
  recentGrades: DashboardGrade[];
}

const HOURS_4_MS = 1000 * 60 * 60 * 4;
const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

export async function getStudentDashboard(
  user: { id: string; firstName: string; countryCode: string | null },
): Promise<StudentDashboardData> {
  const [enrollments, walletSummary, transcript] = await Promise.all([
    getStudentEnrollments(user.id),
    getWalletSummary(user.id),
    getStudentTranscript(user.id),
  ]);

  const active = enrollments.filter((e) => e.status === EnrollmentStatus.ENROLLED);
  const offeringIds = active.map((e) => e.offeringId);
  const now = new Date();

  // Next live session across enrolled offerings (ongoing or upcoming).
  let nextSession: DashboardSession | null = null;
  if (offeringIds.length > 0) {
    const candidates = await db.liveSession.findMany({
      where: {
        offeringId: { in: offeringIds },
        scheduledStart: { gte: new Date(now.getTime() - HOURS_4_MS) },
      },
      orderBy: { scheduledStart: "asc" },
      take: 8,
      include: { offering: { include: { course: { select: { code: true } } } } },
    });
    const upcoming = candidates.find((s) => sessionEnd(s) > now);
    if (upcoming) {
      nextSession = {
        id: upcoming.id,
        offeringId: upcoming.offeringId,
        title: upcoming.title,
        courseCode: upcoming.offering.course.code,
        scheduledStart: upcoming.scheduledStart.toISOString(),
        durationMinutes: upcoming.durationMinutes,
        joinOpen: isJoinWindowOpen(upcoming, now),
      };
    }
  }

  const courses: DashboardCourse[] = active.map((e) => ({
    offeringId: e.offeringId,
    code: e.offering.course.code,
    title: e.offering.course.title,
    progressPercent: Math.round(e.progressPercent),
    semesterName: e.offering.semester?.name ?? null,
    mode: e.offering.mode,
  }));

  // Cumulative GPA weighted by credit hours.
  let gpa: number | null = null;
  const totalCredits = transcript.reduce((sum, r) => sum + r.creditHours, 0);
  if (totalCredits > 0) {
    const weighted = transcript.reduce((sum, r) => sum + r.gpaPoints * r.creditHours, 0);
    gpa = Math.round((weighted / totalCredits) * 100) / 100;
  }

  const recentGrades: DashboardGrade[] = transcript.slice(0, 4).map((r) => ({
    id: r.id,
    code: r.course.code,
    title: r.course.title,
    letterGrade: r.letterGrade,
    gpaPoints: r.gpaPoints,
    completedAt: r.completedAt.toISOString(),
  }));

  // Region decides which wallet currency leads (no conversion).
  const currency = resolveRegionalCurrency(user.countryCode);
  const b = walletSummary.balances;
  const wallet = {
    currency,
    moneyMinor: currency === "EGP" ? b.egpMoneyMinor : b.usdMoneyMinor,
    pointsMinor: currency === "EGP" ? b.egpPointsMinor : b.usdPointsMinor,
  };

  // Semester + week from the first active enrollment that carries a semester.
  let semester: StudentDashboardData["semester"] = null;
  const sem = active.map((e) => e.offering.semester).find((s): s is NonNullable<typeof s> => Boolean(s));
  if (sem) {
    const start = new Date(sem.startDate);
    const week =
      start <= now ? Math.floor((now.getTime() - start.getTime()) / WEEK_MS) + 1 : null;
    semester = { name: sem.name, week: week && week > 0 ? week : null };
  }

  return { firstName: user.firstName, semester, gpa, courses, nextSession, wallet, recentGrades };
}
