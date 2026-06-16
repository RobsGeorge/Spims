import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OtpForm } from "@/components/auth/otp-form";

export default async function VerifyOtpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ userId?: string; purpose?: string }>;
}) {
  const t = await getTranslations();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>{t("auth.otpTitle")}</CardTitle>
        <CardDescription>{t("auth.otpSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <OtpFormWrapper params={params} searchParams={searchParams} />
      </CardContent>
    </Card>
  );
}

async function OtpFormWrapper({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ userId?: string; purpose?: string }>;
}) {
  const { locale } = await params;
  const { userId = "", purpose = "EMAIL_VERIFICATION" } = await searchParams;
  const nextPath =
    purpose === "EMAIL_VERIFICATION"
      ? `/${locale}/set-password?userId=${userId}`
      : `/${locale}/reset`;

  return (
    <OtpForm
      locale={locale}
      userId={userId}
      purpose={purpose as "EMAIL_VERIFICATION" | "PASSWORD_RESET"}
      redirectTo={nextPath}
    />
  );
}
