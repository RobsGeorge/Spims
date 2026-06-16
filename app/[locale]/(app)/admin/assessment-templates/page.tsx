import { getTranslations } from "next-intl/server";
import { requireAppSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listTemplates } from "@/lib/services/assessmentTemplate";
import { AssessmentTemplateEditor } from "@/components/admin/assessment-template-editor";

export default async function AssessmentTemplatesPage() {
  const t = await getTranslations();
  const session = await requireAppSession();
  await authorize(session, "assessmentTemplate.manage");

  const templates = await listTemplates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("assessmentTemplate.title")}</h1>
      </div>
      <AssessmentTemplateEditor templates={templates} />
    </div>
  );
}
