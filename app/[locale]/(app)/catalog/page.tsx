import { getTranslations } from "next-intl/server";
import { requireAppSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listCatalogOfferings } from "@/lib/services/offering";
import { annotateCatalogEligibility } from "@/lib/services/catalogEligibility";
import { CatalogOfferings } from "@/components/student/catalog-offerings";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ studentProgramId?: string }>;
}) {
  const t = await getTranslations();
  const session = await requireAppSession();
  const { studentProgramId: requestedProgramId } = await searchParams;

  const [{ items: rawOfferings }, studentPrograms] = await Promise.all([
    listCatalogOfferings({ limit: 100 }),
    db.studentProgram.findMany({
      where: { studentId: session.id, status: "ACTIVE" },
      include: { program: { select: { name: true } } },
      orderBy: { enrolledAt: "asc" },
    }),
  ]);

  const selectedProgramId =
    studentPrograms.find((sp) => sp.id === requestedProgramId)?.id ?? studentPrograms[0]?.id;

  const offerings = await annotateCatalogEligibility({
    studentId: session.id,
    studentProgramId: selectedProgramId,
    offerings: rawOfferings.map((o) => ({
      id: o.id,
      mode: o.mode,
      course: o.course,
      semester: o.semester,
    })),
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl text-primary">{t("enrollment.catalog")}</h1>
        <p className="text-muted-foreground">{t("enrollment.catalogSubtitle")}</p>
      </header>
      <CatalogOfferings
        offerings={offerings}
        studentPrograms={studentPrograms.map((sp) => ({
          id: sp.id,
          programName: sp.program.name,
        }))}
        initialStudentProgramId={selectedProgramId}
      />
    </div>
  );
}
