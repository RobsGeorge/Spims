import { useTranslations } from "next-intl";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listAcademicYears } from "@/lib/services/academicYear";
import { SemestersPanel } from "@/components/admin/semesters-panel";

export default async function AdminSemestersPage() {
  const t = useTranslations();
  const session = await requireSession();
  await authorize(session, "semester.manage");

  const years = await listAcademicYears();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("semesters.title")}</h1>
      </div>
      <SemestersPanel
        years={years.map((y) => ({
          ...y,
          startDate: y.startDate.toISOString(),
          endDate: y.endDate.toISOString(),
          semesters: y.semesters.map((s) => ({
            ...s,
            startDate: s.startDate.toISOString(),
            endDate: s.endDate.toISOString(),
            registrationStart: s.registrationStart.toISOString(),
            registrationEnd: s.registrationEnd.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
