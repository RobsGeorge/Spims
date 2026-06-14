import { useTranslations } from "next-intl";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listTemplates } from "@/lib/services/assessmentTemplate";
import { AssessmentTemplateEditor } from "@/components/admin/assessment-template-editor";

export default async function AssessmentTemplatesPage() {
  const t = useTranslations();
  const session = await requireSession();
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
