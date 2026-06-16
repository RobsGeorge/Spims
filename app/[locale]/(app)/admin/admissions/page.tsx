import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listPrograms } from "@/lib/services/program";
import { getApplicationForm } from "@/lib/services/applicationForm";
import { listApplications } from "@/lib/services/application";
import { ApplicationFormEditor } from "@/components/admin/application-form-editor";
import { ApplicationsQueue } from "@/components/admin/applications-queue";

export default async function AdminAdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ programId?: string }>;
}) {
  const t = await getTranslations();
  const session = await requireSession();
  await authorize(session, "applicationForm.manage");

  const { programId } = await searchParams;
  const [{ items: programs }, applications] = await Promise.all([
    listPrograms({ limit: 100 }),
    listApplications(session, { all: true }),
  ]);

  const selectedId = programId ?? programs[0]?.id;
  const form = selectedId ? await getApplicationForm(selectedId) : null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{t("admissions.title")}</h1>
      {programs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {programs.map((p) => (
            <Link
              key={p.id}
              href={`?programId=${p.id}`}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                p.id === selectedId ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}
      {selectedId && (
        <ApplicationFormEditor
          programId={selectedId}
          initialForm={form ? { name: form.name, fields: form.fields } : null}
        />
      )}
      <div>
        <h2 className="text-lg font-medium mb-4">{t("admissions.queue")}</h2>
        <ApplicationsQueue applications={applications} />
      </div>
    </div>
  );
}
