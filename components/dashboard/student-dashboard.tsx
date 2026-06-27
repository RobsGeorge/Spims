import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BookOpen,
  Radio,
  Video,
  Wallet,
  CalendarClock,
  GraduationCap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMinorUnits } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { StudentDashboardData } from "@/lib/services/studentDashboard";

export async function StudentDashboard({
  data,
  locale,
}: {
  data: StudentDashboardData;
  locale: string;
}) {
  const t = await getTranslations("dashboard");
  const href = (p: string) => `/${locale}${p}`;
  const courses = data.courses.slice(0, 5);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 md:space-y-8">
      {/* Hero greeting */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl md:text-4xl text-primary">
            {t("welcomeBack", { name: data.firstName })}
          </h1>
          <p className="text-muted-foreground">
            {data.semester
              ? t("semesterWeek", {
                  semester: data.semester.name,
                  week: data.semester.week ?? 1,
                })
              : t("overview")}
          </p>
        </div>
        {data.gpa !== null && (
          <Badge className="self-start bg-accent text-accent-foreground hover:bg-accent text-sm px-3 py-1">
            {t("gpa", { gpa: data.gpa.toFixed(2) })}
          </Badge>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* My courses */}
        <Card className="lg:col-span-2 rounded-xl border-border/60 shadow-soft p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-foreground">{t("myCourses")}</h2>
            {courses.length > 0 && (
              <Link
                href={href("/courses")}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary rounded-md outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("viewAll")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            )}
          </div>

          {courses.length === 0 ? (
            <EmptyState
              className="flex-1"
              title={t("noCourses")}
              description={t("noCoursesHint")}
              action={
                <Link
                  href={href("/catalog")}
                  className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  {t("browseCatalog")}
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3">
              {courses.map((c) => (
                <li key={c.offeringId}>
                  <Link
                    href={href(`/courses/${c.offeringId}`)}
                    className="group flex items-center gap-4 rounded-lg bg-surface-low p-4 transition-colors hover:bg-surface-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                      <BookOpen className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-medium text-foreground">{c.title}</span>
                        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                          {t("progress", { percent: c.progressPercent })}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {c.code}
                        {c.semesterName ? ` · ${c.semesterName}` : ""}
                      </span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-high">
                        <span
                          className="block h-full rounded-full bg-gold"
                          style={{ width: `${Math.min(100, Math.max(0, c.progressPercent))}%` }}
                        />
                      </span>
                    </span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Right rail: live session + wallet */}
        <div className="flex flex-col gap-6">
          {data.nextSession ? (
            <LiveSessionTile session={data.nextSession} locale={locale} hrefFn={href} />
          ) : (
            <Card className="rounded-xl border-border/60 shadow-soft p-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
                <h2 className="text-xl text-foreground">{t("liveSession")}</h2>
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">{t("noLiveTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("noLiveHint")}</p>
            </Card>
          )}

          {/* Wallet */}
          <Card className="rounded-xl border-border/60 shadow-soft p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl text-foreground">{t("walletBalance")}</h2>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/20 text-gold-foreground">
                <Wallet className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-foreground">
              {formatMinorUnits(data.wallet.moneyMinor, data.wallet.currency)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("points", {
                amount: new Intl.NumberFormat(locale).format(data.wallet.pointsMinor / 100),
              })}
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href={href("/billing")}
                className="flex-1 rounded-lg bg-surface-high px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                {t("topUp")}
              </Link>
              <Link
                href={href("/wallet")}
                className="flex-1 rounded-lg bg-surface-high px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                {t("history")}
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent grades */}
      <Card className="rounded-xl border-border/60 shadow-soft p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl text-foreground">{t("recentGrades")}</h2>
          {data.recentGrades.length > 0 && (
            <Link
              href={href("/grades")}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary rounded-md outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("transcript")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          )}
        </div>
        {data.recentGrades.length === 0 ? (
          <EmptyState title={t("noGrades")} description={t("noGradesHint")} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.recentGrades.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface-low p-4"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <GraduationCap className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{g.title}</span>
                    <span className="block text-xs text-muted-foreground">{g.code}</span>
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="font-display text-lg leading-none text-primary">
                    {g.letterGrade}
                  </span>
                  <span className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {g.gpaPoints.toFixed(1)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

async function LiveSessionTile({
  session,
  locale,
  hrefFn,
}: {
  session: NonNullable<StudentDashboardData["nextSession"]>;
  locale: string;
  hrefFn: (p: string) => string;
}) {
  const t = await getTranslations("dashboard");
  const start = new Date(session.scheduledStart);
  const timeLabel = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(start);

  return (
    <Card className="relative overflow-hidden rounded-xl border-0 bg-primary p-6 text-primary-foreground shadow-soft">
      {/* Single soft gold accent (DESIGN.md feature-panel variant) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full bg-gold/20 blur-2xl"
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-gold" aria-hidden="true" />
          <span className="text-sm font-semibold uppercase tracking-wide text-primary-foreground/80">
            {session.joinOpen ? t("liveNow") : t("liveSession")}
          </span>
        </div>
        <p className="mt-3 text-lg font-semibold leading-tight">{session.title}</p>
        <p className="mt-1 text-sm text-primary-foreground/70">{session.courseCode}</p>
        <p className="mt-4 text-sm text-primary-foreground/85">{t("startsAt", { time: timeLabel })}</p>
        <Link
          href={hrefFn(`/courses/${session.offeringId}`)}
          className={cn(
            "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-transform motion-safe:active:scale-[0.98]",
            "bg-gold text-gold-foreground hover:bg-gold/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
          )}
        >
          <Video className="h-4 w-4" aria-hidden="true" />
          {t("joinSession")}
        </Link>
      </div>
    </Card>
  );
}
