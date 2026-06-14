import { useTranslations } from "next-intl";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getTranslations } from "@/lib/services/translation";
import { TranslationEditor } from "@/components/admin/translation-editor";

interface SearchParams {
  entityType?: string;
  entityId?: string;
}

export default async function TranslationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const t = useTranslations();
  const session = await requireSession();
  await authorize(session, "translation.edit");

  const { entityType, entityId } = await searchParams;
  const translations =
    entityType && entityId ? await getTranslations(entityType, entityId) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("translations.title")}</h1>
        {entityType && entityId && (
          <p className="text-sm text-muted-foreground">
            {entityType}: {entityId}
          </p>
        )}
      </div>
      <TranslationEditor
        translations={translations}
        entityType={entityType ?? ""}
        entityId={entityId ?? ""}
      />
    </div>
  );
}
