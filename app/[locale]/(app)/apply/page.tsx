import { getTranslations } from "next-intl/server";
import { requireAppSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listApplications } from "@/lib/services/application";
import { listProgramsOpenForApplication } from "@/lib/services/program";
import { ProgramsApplyHub } from "@/components/student/programs-apply-hub";

export default async function ApplyHubPage() {
  const t = await getTranslations();
  const session = await requireAppSession();
  await authorize(session, "application.submit");

  const [programs, applications] = await Promise.all([
    listProgramsOpenForApplication(),
    listApplications(session),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl text-primary">{t("admissions.applyHub")}</h1>
        <p className="text-muted-foreground">{t("admissions.applyHubSubtitle")}</p>
      </header>
      <ProgramsApplyHub
        programs={programs}
        applications={applications.map((app) => ({
          id: app.id,
          status: app.status,
          program: { id: app.program.id, name: app.program.name, type: app.program.type },
          submittedAt: app.submittedAt,
        }))}
      />
    </div>
  );
}
