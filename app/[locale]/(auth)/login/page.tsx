import { getTranslations } from "next-intl/server";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations();
  const { locale } = await params;

  return (
    <AuthPageShell brandVariant="signIn" mobileTagline={t("auth.brandHeadlineSignIn")}>
      <AuthPanel title={t("auth.loginTitle")} description={t("auth.loginDescription")}>
        <LoginForm locale={locale} />
      </AuthPanel>
    </AuthPageShell>
  );
}
