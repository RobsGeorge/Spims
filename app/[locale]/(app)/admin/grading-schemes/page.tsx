import { getTranslations } from "next-intl/server";
import { requireAppSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listGradingSchemes } from "@/lib/services/gradingScheme";
import { GradingSchemeEditor } from "@/components/admin/grading-scheme-editor";

export default async function GradingSchemesPage() {
  const t = await getTranslations();
  const session = await requireAppSession();
  await authorize(session, "gradingScheme.manage");

  const schemes = await listGradingSchemes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("gradingScheme.title")}</h1>
      </div>
      <GradingSchemeEditor schemes={schemes} />
    </div>
  );
}
