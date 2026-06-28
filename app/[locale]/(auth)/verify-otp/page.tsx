import { getTranslations } from "next-intl/server";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { OtpForm } from "@/components/auth/otp-form";

export default async function VerifyOtpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ userId?: string; purpose?: string }>;
}) {
  const t = await getTranslations();
  const { locale } = await params;
  const { userId = "", purpose = "EMAIL_VERIFICATION" } = await searchParams;
  const nextPath =
    purpose === "EMAIL_VERIFICATION"
      ? `/${locale}/set-password?userId=${userId}`
      : `/${locale}/reset`;

  return (
    <AuthPageShell brandVariant="otp" mobileTagline={t("auth.brandSubtitleOtp")}>
      <AuthPanel title={t("auth.otpTitle")} description={t("auth.otpSubtitle")}>
        <OtpForm
          locale={locale}
          userId={userId}
          purpose={purpose as "EMAIL_VERIFICATION" | "PASSWORD_RESET"}
          redirectTo={nextPath}
        />
      </AuthPanel>
    </AuthPageShell>
  );
}
