import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { PointGrantForm } from "@/components/finance/point-grant-form";

export default async function AdminWalletPage() {
  const t = await getTranslations("finance");
  const session = await requireSession();
  await authorize(session, "wallet.manage");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("adminWalletTitle")}</h1>
      <PointGrantForm />
    </div>
  );
}
