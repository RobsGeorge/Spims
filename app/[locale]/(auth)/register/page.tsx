import { getTranslations } from "next-intl/server";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations();
  const { locale } = await params;

  return (
    <AuthPageShell brandVariant="signUp" mobileTagline={t("auth.brandHeadlineSignUp")}>
      <AuthPanel title={t("auth.registerTitle")} description={t("auth.registerDescription")}>
        <RegisterForm locale={locale} />
      </AuthPanel>
    </AuthPageShell>
  );
}
