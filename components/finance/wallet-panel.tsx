"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinorUnits } from "@/lib/money";
import type { Currency } from "@/lib/money";

interface WalletTransaction {
  id: string;
  currency: Currency;
  kind: string;
  direction: string;
  amountMinor: number;
  reason: string;
  note: string | null;
  createdAt: string;
}

interface WalletPanelProps {
  balances: {
    egpMoneyMinor: number;
    usdMoneyMinor: number;
    egpPointsMinor: number;
    usdPointsMinor: number;
  };
  transactions: WalletTransaction[];
}

export function WalletPanel({ balances, transactions }: WalletPanelProps) {
  const t = useTranslations("finance");

  const buckets = [
    { label: t("egpMoney"), amount: balances.egpMoneyMinor, currency: "EGP" as Currency },
    { label: t("usdMoney"), amount: balances.usdMoneyMinor, currency: "USD" as Currency },
    { label: t("egpPoints"), amount: balances.egpPointsMinor, currency: "EGP" as Currency },
    { label: t("usdPoints"), amount: balances.usdPointsMinor, currency: "USD" as Currency },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {buckets.map((b) => (
          <Card key={b.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{b.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{formatMinorUnits(b.amount, b.currency)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">{t("ledger")}</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noTransactions")}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {tx.direction === "CREDIT" ? "+" : "−"}
                    {formatMinorUnits(tx.amountMinor, tx.currency)} ({tx.kind})
                  </p>
                  <p className="text-muted-foreground">{tx.reason}{tx.note ? ` — ${tx.note}` : ""}</p>
                </div>
                <time className="text-muted-foreground text-xs">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
