import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listPrograms } from "@/lib/services/program";
import { listGradingSchemes } from "@/lib/services/gradingScheme";
import { listCourses } from "@/lib/services/course";
import { ProgramsTable } from "@/components/admin/programs-table";

export default async function ProgramsPage() {
  const t = await getTranslations();
  const session = await requireSession();
  await authorize(session, "program.manage");

  const [{ items: programs }, schemes, { items: courses }] = await Promise.all([
    listPrograms({ limit: 100 }),
    listGradingSchemes(),
    listCourses({ limit: 200 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("programs.title")}</h1>
      </div>
      <ProgramsTable programs={programs} gradingSchemes={schemes} courses={courses} />
    </div>
  );
}
