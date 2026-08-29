import { getTranslations } from "next-intl/server";
import { requireAppSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listEnrollmentConsole } from "@/lib/services/enrollment";
import { EnrollmentConsole } from "@/components/admin/enrollment-console";

export default async function AdminEnrollmentPage() {
  const t = await getTranslations();
  const session = await requireAppSession();
  await authorize(session, "enrollment.override");

  const offerings = await listEnrollmentConsole({ limit: 100 });

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl text-primary">{t("enrollment.adminTitle")}</h1>
        <p className="text-muted-foreground">{t("enrollment.adminSubtitle")}</p>
      </header>
      <EnrollmentConsole offerings={offerings} />
    </div>
  );
}
