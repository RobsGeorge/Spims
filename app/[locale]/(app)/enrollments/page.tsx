import { getTranslations } from "next-intl/server";
import { requireAppSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import {
  getStudentEnrollments,
  resolveEnrollmentAction,
} from "@/lib/services/enrollment";
import { MyEnrollments } from "@/components/student/my-enrollments";

export default async function EnrollmentsPage() {
  const t = await getTranslations();
  const session = await requireAppSession();
  await authorize(session, "enrollment.self");

  const enrollments = await getStudentEnrollments(session.id);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl text-primary">{t("enrollment.myEnrollments")}</h1>
        <p className="text-muted-foreground">{t("enrollment.myEnrollmentsSubtitle")}</p>
      </header>
      <MyEnrollments
        enrollments={enrollments.map((e) => ({
          id: e.id,
          status: e.status,
          action: resolveEnrollmentAction(e),
          courseCode: e.offering.course.code,
          courseTitle: e.offering.course.title,
          semesterName: e.offering.semester?.name ?? null,
          mode: e.offering.mode,
        }))}
      />
    </div>
  );
}
