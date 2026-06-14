import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetRequestForm } from "@/components/auth/reset-form";

export default function ResetPage() {
  const t = useTranslations();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>{t("auth.resetTitle")}</CardTitle>
        <CardDescription>{t("auth.resetSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetRequestForm />
      </CardContent>
    </Card>
  );
}
