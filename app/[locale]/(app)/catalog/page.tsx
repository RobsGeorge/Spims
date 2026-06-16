import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listCatalogOfferings } from "@/lib/services/offering";
import { CatalogOfferings } from "@/components/student/catalog-offerings";

export default async function CatalogPage() {
  const t = await getTranslations();
  const session = await requireSession();

  const [{ items: offerings }, studentProgram] = await Promise.all([
    listCatalogOfferings({ limit: 100 }),
    db.studentProgram.findFirst({
      where: { studentId: session.id, status: "ACTIVE" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("enrollment.catalog")}</h1>
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
