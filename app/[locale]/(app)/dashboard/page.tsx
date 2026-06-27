import { getTranslations } from "next-intl/server";
import { RoleType } from "@prisma/client";
import { requireAppSession } from "@/lib/auth/session";
import { getStudentDashboard } from "@/lib/services/studentDashboard";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAppSession();

  if (user.roles.includes(RoleType.STUDENT)) {
    const data = await getStudentDashboard(user);
    return <StudentDashboard data={data} locale={locale} />;
  }

  const t = await getTranslations("dashboard");
  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="space-y-1.5">
        <h1 className="text-3xl md:text-4xl text-primary">
          {t("welcomeBack", { name: user.firstName })}
        </h1>
        <p className="text-muted-foreground">{t("overview")}</p>
      </header>
    </div>
  );
}
