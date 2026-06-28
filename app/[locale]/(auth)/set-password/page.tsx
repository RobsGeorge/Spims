import { getTranslations } from "next-intl/server";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SetPasswordForm } from "@/components/auth/set-password-form";

export default async function SetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ userId?: string }>;
}) {
  const t = await getTranslations();
  const { locale } = await params;
  const { userId = "" } = await searchParams;

  return (
    <AuthPageShell brandVariant="setPassword" mobileTagline={t("auth.setPasswordMobileTagline")}>
      <AuthPanel title={t("auth.setPasswordTitle")} description={t("auth.setPasswordSubtitle")}>
        <SetPasswordForm locale={locale} userId={userId} />
      </AuthPanel>
    </AuthPageShell>
  );
}
