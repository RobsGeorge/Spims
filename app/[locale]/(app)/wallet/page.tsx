import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getWalletSummary } from "@/lib/services/wallet";
import { WalletPanel } from "@/components/finance/wallet-panel";
import { DonateForm } from "@/components/finance/point-grant-form";

export default async function WalletPage() {
  const t = await getTranslations("finance");
  const session = await requireSession();
  await authorize(session, "wallet.viewOwn");

  const wallet = await getWalletSummary(session.id);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{t("walletTitle")}</h1>
      <WalletPanel
        balances={wallet.balances}
        transactions={wallet.transactions.map((tx) => ({
          ...tx,
          createdAt: tx.createdAt.toISOString(),
        }))}
      />
      <div>
        <h2 className="text-lg font-medium mb-4">{t("donate")}</h2>
        <DonateForm />
      </div>
    </div>
  );
}
