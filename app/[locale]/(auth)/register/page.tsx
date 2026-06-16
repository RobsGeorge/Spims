import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>{t("auth.registerTitle")}</CardTitle>
        <CardDescription>
          {t("auth.registerSubtitle")}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {t("auth.login")}
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterFormWrapper params={params} />
      </CardContent>
    </Card>
  );
}

async function RegisterFormWrapper({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RegisterForm locale={locale} />;
}
