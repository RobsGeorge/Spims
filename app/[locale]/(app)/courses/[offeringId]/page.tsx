import { useTranslations } from "next-intl";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { assertStudentEnrolled } from "@/lib/services/assessment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OfferingCoursePage({
  params,
}: {
  params: Promise<{ offeringId: string }>;
}) {
  const t = useTranslations("exam");
  const session = await requireSession();
  await authorize(session, "offering.viewContent");
  const { offeringId } = await params;

  await assertStudentEnrolled(session.id, offeringId);

  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: {
      course: true,
      assessments: { where: { released: true }, orderBy: { title: "asc" } },
    },
  });
  if (!offering) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {offering.course.code} — {offering.course.title}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("availableAssessments")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {offering.assessments.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noAssessments")}</p>
          )}
          {offering.assessments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-4">
              <span className="text-sm">
                {a.title} ({a.mode})
              </span>
              <Button asChild size="sm">
                <Link href={`/courses/${offeringId}/exam/${a.id}`}>{t("start")}</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
