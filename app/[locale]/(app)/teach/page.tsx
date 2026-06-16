import { useTranslations } from "next-intl";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listOfferings } from "@/lib/services/offering";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function TeachPage() {
  const t = useTranslations("gradebook");
  const session = await requireSession();
  await authorize(session, "gradebook.enterGrades");

  const { items } = await listOfferings(session, { limit: 50 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("teachTitle")}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((o) => (
          <Card key={o.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {o.course.code} — {o.course.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/teach/${o.id}/gradebook`}>{t("openGradebook")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/teach/${o.id}/attendance`}>{t("openAttendance")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/teach/${o.id}/discussions`}>{t("openDiscussions")}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
