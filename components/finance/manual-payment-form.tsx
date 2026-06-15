"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMinorUnits } from "@/lib/money";
import type { Currency } from "@/lib/money";

interface PendingPayment {
  id: string;
  amountMinor: number;
  currency: Currency;
  method: string;
  gatewayRef: string | null;
  student: { firstName: string; lastName: string; email: string };
}

export function PendingPayments({ payments }: { payments: PendingPayment[] }) {
  const t = useTranslations("finance");
  const router = useRouter();
  const [verifying, setVerifying] = useState<string | null>(null);

  async function verify(id: string) {
    setVerifying(id);
    const res = await fetch(`/api/payments/${id}/verify`, { method: "POST" });
    setVerifying(null);
    if (res.ok) router.refresh();
  }

  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noPendingPayments")}</p>;
  }

  return (
    <ul className="divide-y rounded-md border">
      {payments.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="text-sm">
            <p className="font-medium">
              {p.student.firstName} {p.student.lastName} — {formatMinorUnits(p.amountMinor, p.currency)}
            </p>
            <p className="text-muted-foreground">{p.method}{p.gatewayRef ? ` · ${p.gatewayRef}` : ""}</p>
          </div>
          <Button size="sm" disabled={verifying === p.id} onClick={() => verify(p.id)}>
            {verifying === p.id ? t("verifying") : t("verify")}
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function ManualPaymentForm() {
  const t = useTranslations("finance");
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const major = parseFloat(amount);
    if (!studentId || !reference || !isFinite(major) || major <= 0) {
      setMessage(t("invalidForm"));
      return;
    }
    const amountMinor = Math.round(major * 100);
    const res = await fetch("/api/payments/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        invoiceId: invoiceId || undefined,
        currency,
        amountMinor,
        method: "MANUAL_TRANSFER",
        reference,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.message ?? t("recordFailed"));
      return;
    }
    setMessage(t("recordSuccess"));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div>
        <Label htmlFor="studentId">{t("studentId")}</Label>
        <Input id="studentId" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="invoiceId">{t("invoiceIdOptional")}</Label>
        <Input id="invoiceId" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="amount">{t("amount")}</Label>
          <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="currency">{t("currency")}</Label>
          <select
            id="currency"
            className="flex h-10 w-full rounded-md border px-2"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            <option value="USD">USD</option>
            <option value="EGP">EGP</option>
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="reference">{t("reference")}</Label>
        <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button type="submit">{t("recordPayment")}</Button>
    </form>
  );
}
