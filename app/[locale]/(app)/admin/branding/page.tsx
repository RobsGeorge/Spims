import { useTranslations } from "next-intl";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listThemes } from "@/lib/services/theme";
import { BrandingEditor } from "@/components/admin/branding-editor";

export default async function AdminBrandingPage() {
  const t = useTranslations();
  const session = await requireSession();
  await authorize(session, "branding.manage");

  const themes = await listThemes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("branding.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("branding.activeTheme")}</p>
      </div>
      <BrandingEditor themes={themes} />
    </div>
  );
}
