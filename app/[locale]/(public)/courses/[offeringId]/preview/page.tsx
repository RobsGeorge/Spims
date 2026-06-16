import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getOfferingPreview } from "@/lib/services/offering";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CoursePreviewPage({
  params,
}: {
  params: Promise<{ locale: string; offeringId: string }>;
}) {
  const t = await getTranslations();
  const { locale, offeringId } = await params;
  const preview = await getOfferingPreview(offeringId);

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:underline">
          {t("common.back")}
        </Link>
        <h1 className="text-3xl font-bold mt-2">
          {preview.offering.course.code} — {preview.offering.course.title}
        </h1>
        <p className="text-muted-foreground">{t("preview.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("preview.weekTitles")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {preview.weeks.map((week) => (
              <li key={week.number} className="flex items-center gap-2 text-sm">
                <Badge variant={week.number === 1 ? "default" : "outline"}>
                  {t("preview.week")} {week.number}
                </Badge>
                <span>{week.title}</span>
                {week.number > 1 && (
                  <span className="text-muted-foreground">({t("preview.locked")})</span>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("preview.week1Content")}</CardTitle>
        </CardHeader>
        <CardContent>
          {preview.week1Items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("preview.noContent")}</p>
          ) : (
            <ul className="space-y-3">
              {preview.week1Items.map((item) => (
                <li key={item.id} className="border rounded-md p-3 text-sm">
                  <Badge variant="secondary" className="mb-2">{item.type}</Badge>
                  <p className="font-medium">{item.title}</p>
                  {item.body && <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{item.body}</p>}
                  {item.vimeoId && (
                    <p className="mt-1 text-muted-foreground">Vimeo: {item.vimeoId}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
