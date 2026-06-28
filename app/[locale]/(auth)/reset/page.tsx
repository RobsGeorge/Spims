import { getTranslations } from "next-intl/server";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { ResetRequestForm } from "@/components/auth/reset-form";

export default async function ResetPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations();
  const { locale } = await params;

  return (
    <AuthPageShell brandVariant="reset" mobileTagline={t("auth.brandSubtitleReset")}>
      <AuthPanel title={t("auth.resetTitle")} description={t("auth.resetDescription")}>
        <ResetRequestForm locale={locale} />
      </AuthPanel>
    </AuthPageShell>
  );
}
