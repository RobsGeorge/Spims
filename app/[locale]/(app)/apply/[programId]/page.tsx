import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAppSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { getApplicationForm } from "@/lib/services/applicationForm";
import { ApplicationRenderer } from "@/components/apply/application-renderer";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const t = await getTranslations();
  const session = await requireAppSession();
  await authorize(session, "application.submit");
  const { programId } = await params;

  const program = await db.program.findUnique({ where: { id: programId } });
  if (!program || program.deletedAt) notFound();

  const form = await getApplicationForm(programId);
  if (!form) {
    return <p className="text-muted-foreground">{t("admissions.noForm")}</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">{t("admissions.apply")}</h1>
      <ApplicationRenderer
        programId={programId}
        programName={program.name}
        fields={form.fields}
      />
    </div>
  );
}
