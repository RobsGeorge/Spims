import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>{t("auth.loginTitle")}</CardTitle>
        <CardDescription>
          {t("auth.loginSubtitle")}{" "}
          <Link href="/register" className="text-primary hover:underline">
            {t("auth.register")}
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginFormWrapper params={params} />
      </CardContent>
    </Card>
  );
}

async function LoginFormWrapper({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <LoginForm locale={locale} />;
}
