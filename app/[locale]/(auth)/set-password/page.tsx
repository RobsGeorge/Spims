import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SetPasswordForm } from "@/components/auth/set-password-form";

export default async function SetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ userId?: string }>;
}) {
  const t = await getTranslations();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>{t("auth.setPasswordTitle")}</CardTitle>
        <CardDescription>{t("auth.setPasswordSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SetPasswordFormWrapper params={params} searchParams={searchParams} />
      </CardContent>
    </Card>
  );
}

async function SetPasswordFormWrapper({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ userId?: string }>;
}) {
  const { locale } = await params;
  const { userId = "" } = await searchParams;
  return <SetPasswordForm locale={locale} userId={userId} />;
}
