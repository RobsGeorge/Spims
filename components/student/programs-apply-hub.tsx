"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface ProgramRow {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface ApplicationRow {
  id: string;
  status: string;
  program: { id: string; name: string; type: string };
  submittedAt: string | Date | null;
}

export function ProgramsApplyHub({
  programs,
  applications,
}: {
  programs: ProgramRow[];
  applications: ApplicationRow[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const appliedProgramIds = new Set(applications.map((a) => a.program.id));

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-xl text-foreground">{t("admissions.openPrograms")}</h2>
          <p className="text-sm text-muted-foreground">{t("admissions.openProgramsHint")}</p>
        </header>
        {programs.length === 0 ? (
          <EmptyState
            title={t("admissions.noOpenPrograms")}
            description={t("admissions.noOpenProgramsHint")}
            className="min-h-[200px] rounded-xl border-border/60 bg-card shadow-soft"
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {programs.map((program) => {
              const alreadyApplied = appliedProgramIds.has(program.id);
              return (
                <li
                  key={program.id}
                  className="flex flex-col rounded-xl border border-border/60 bg-card p-5 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-primary">
                      <GraduationCap className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <Badge variant="outline">
                      {program.type === "DIPLOMA"
                        ? t("programs.types.DIPLOMA")
                        : program.type === "CERTIFICATE"
                          ? t("programs.types.CERTIFICATE")
                          : t("programs.types.DEGREE")}
                    </Badge>
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">{program.name}</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {program.code}
                  </p>
                  <div className="mt-5 flex justify-end border-t border-border/50 pt-4">
                    {alreadyApplied ? (
                      <Badge variant="secondary">{t("admissions.alreadyApplied")}</Badge>
                    ) : (
                      <Button size="sm" asChild>
                        <Link href={`/${locale}/apply/${program.id}`}>{t("admissions.apply")}</Link>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-xl text-foreground">{t("admissions.myApplications")}</h2>
          <p className="text-sm text-muted-foreground">{t("admissions.myApplicationsHint")}</p>
        </header>
        {applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admissions.noMyApplications")}</p>
        ) : (
          <ul className="space-y-3">
            {applications.map((app) => (
              <li
                key={app.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-soft"
              >
                <div>
                  <p className="font-medium text-foreground">{app.program.name}</p>
                  <p className="text-xs text-muted-foreground">{app.program.type}</p>
                </div>
                <Badge variant="outline">
                  {app.status === "DRAFT"
                    ? t("admissions.status.DRAFT")
                    : app.status === "SUBMITTED"
                      ? t("admissions.status.SUBMITTED")
                      : app.status === "UNDER_REVIEW"
                        ? t("admissions.status.UNDER_REVIEW")
                        : app.status === "ACCEPTED"
                          ? t("admissions.status.ACCEPTED")
                          : app.status === "REJECTED"
                            ? t("admissions.status.REJECTED")
                            : t("admissions.status.WAITLISTED")}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
