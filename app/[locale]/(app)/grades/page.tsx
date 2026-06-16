import { getTranslations } from "next-intl/server";
import { requireAppSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { computeEnrollmentPercent } from "@/lib/services/gradebook";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function GradesPage() {
  const t = await getTranslations("gradebook");
  const session = await requireAppSession();
  await authorize(session, "transcript.viewOwn");

  const enrollments = await db.enrollment.findMany({
    where: { studentId: session.id, status: "ENROLLED" },
    include: { offering: { include: { course: true } } },
  });

  const rows = await Promise.all(
    enrollments.map(async (e) => {
      const rollup = await computeEnrollmentPercent(e.offeringId, session.id, true);
      return {
        offeringId: e.offeringId,
        courseCode: e.offering.course.code,
        courseTitle: e.offering.course.title,
        gradeStatus: e.gradeStatus,
        finalLetter: e.finalLetter,
        percent: e.finalPercent ?? rollup.percent,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("studentTitle")}</h1>
      {rows.length === 0 && <p className="text-muted-foreground">{t("noEnrollments")}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row) => (
          <Card key={row.offeringId}>
            <CardHeader>
              <CardTitle className="text-base">
                {row.courseCode} — {row.courseTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                {t("overall")}:{" "}
                {row.percent != null ? `${row.percent.toFixed(1)}%` : t("noGrade")}
                {row.finalLetter ? ` (${row.finalLetter})` : ""}
              </p>
              <p>
                {t("status")}: {row.gradeStatus}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/courses/${row.offeringId}`}>{t("viewCourse")}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
