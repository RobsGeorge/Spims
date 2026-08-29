import { getTranslations } from "next-intl/server";
import { requireAppSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listCatalogOfferings } from "@/lib/services/offering";
import { CatalogOfferings } from "@/components/student/catalog-offerings";

export default async function CatalogPage() {
  const t = await getTranslations();
  const session = await requireAppSession();

  const [{ items: offerings }, studentProgram] = await Promise.all([
    listCatalogOfferings({ limit: 100 }),
    db.studentProgram.findFirst({
      where: { studentId: session.id, status: "ACTIVE" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl text-primary">{t("enrollment.catalog")}</h1>
        <p className="text-muted-foreground">{t("enrollment.catalogSubtitle")}</p>
      </header>
      <CatalogOfferings
        offerings={offerings.map((o) => ({
          id: o.id,
          mode: o.mode,
          course: o.course,
          semester: o.semester,
        }))}
        studentProgramId={studentProgram?.id}
      />
    </div>
  );
}
