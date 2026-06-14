import { useTranslations } from "next-intl";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listCourses, getInterestCountsByCourseIds } from "@/lib/services/course";
import { listTemplates } from "@/lib/services/assessmentTemplate";
import { CoursesTable } from "@/components/admin/courses-table";

export default async function AdminCoursesPage() {
  const t = useTranslations();
  const session = await requireSession();
  await authorize(session, "course.manage");

  const [{ items: courses }, templates] = await Promise.all([
    listCourses({ limit: 200 }),
    listTemplates(),
  ]);
  const interestCounts = await getInterestCountsByCourseIds(courses.map((c) => c.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("courses.title")}</h1>
      </div>
      <CoursesTable
        courses={courses}
        templates={templates}
        allCourses={courses}
        interestCounts={interestCounts}
      />
    </div>
  );
}
