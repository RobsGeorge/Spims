import { getTranslations } from "next-intl/server";
import { requireAppSession } from "@/lib/auth/session";
import { listCourses, getStudentInterestCourseIds } from "@/lib/services/course";
import { CourseCatalog } from "@/components/courses/course-catalog";

export default async function CoursesPage() {
  const t = await getTranslations();
  const session = await requireAppSession();

  const [{ items: courses }, flaggedCourseIds] = await Promise.all([
    listCourses({ limit: 100 }),
    getStudentInterestCourseIds(session.id),
  ]);
  const flaggedSet = new Set(flaggedCourseIds);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl text-primary">{t("courses.catalog")}</h1>
        <p className="text-muted-foreground">{t("courses.catalogSubtitle")}</p>
      </header>
      <CourseCatalog
        courses={courses.map((c) => ({
          id: c.id,
          code: c.code,
          title: c.title,
          creditHours: c.creditHours,
          isFree: c.isFree,
          defaultPriceUsd: c.defaultPriceUsd,
          flagged: flaggedSet.has(c.id),
        }))}
      />
    </div>
  );
}
