"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMinorUnits } from "@/lib/money";
import type { Currency } from "@/lib/money";

interface InvoiceLine {
  description: string;
  amountMinor: number;
}

interface Invoice {
  id: string;
  status: string;
  currency: Currency;
  totalMinor: number;
  amountDue: number;
  lines: InvoiceLine[];
}

const PAYMENT_METHODS = [
  "WALLET_MONEY",
  "WALLET_POINTS",
  "PAYPAL",
  "PAYMOB",
  "CASHIER",
] as const;

export function InvoiceCheckout({ invoices }: { invoices: Invoice[] }) {
  const t = useTranslations("finance");
  const router = useRouter();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("WALLET_MONEY");
  const [message, setMessage] = useState<string | null>(null);

  async function pay(invoice: Invoice) {
    if (invoice.amountDue <= 0) return;
    setPayingId(invoice.id);
    setMessage(null);
    const res = await fetch(`/api/invoices/${invoice.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: `pay-${invoice.id}-${crypto.randomUUID()}`,
        allocations: [{ method, amountMinor: invoice.amountDue }],
      }),
    });
    const data = await res.json();
    setPayingId(null);
    if (!res.ok) {
      setMessage(data.message ?? t("payFailed"));
      return;
    }
    setMessage(t("paySuccess"));
    router.refresh();
  }

  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noInvoices")}</p>;
  }

  return (
    <div className="space-y-4">
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="pay-method">{t("paymentMethod")}</label>
        <select
          id="pay-method"
          className="rounded-md border px-2 py-1"
          value={method}
          onChange={(e) => setMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {t(`methods.${m}`)}
            </option>
          ))}
        </select>
      </div>
      {invoices.map((inv) => (
        <Card key={inv.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {inv.lines[0]?.description ?? t("invoice")}
              <Badge variant="outline">{inv.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <p>{t("total")}: {formatMinorUnits(inv.totalMinor, inv.currency)}</p>
              <p>{t("due")}: {formatMinorUnits(inv.amountDue, inv.currency)}</p>
            </div>
            {inv.amountDue > 0 && inv.status !== "VOID" && (
              <Button
                size="sm"
                disabled={payingId === inv.id}
                onClick={() => pay(inv)}
              >
                {payingId === inv.id ? t("paying") : t("payNow")}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
