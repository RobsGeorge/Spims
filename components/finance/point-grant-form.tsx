"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Currency } from "@/lib/money";

export function PointGrantForm() {
  const t = useTranslations("finance");
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const major = parseFloat(amount);
    if (!userId || !isFinite(major) || major <= 0) {
      setMessage(t("invalidForm"));
      return;
    }
    const res = await fetch("/api/wallet/points/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        currency,
        amountMinor: Math.round(major * 100),
        note: note || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.message ?? t("grantFailed"));
      return;
    }
    setMessage(t("grantSuccess"));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div>
        <Label htmlFor="grant-userId">{t("userId")}</Label>
        <Input id="grant-userId" value={userId} onChange={(e) => setUserId(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="grant-amount">{t("pointsAmount")}</Label>
          <Input id="grant-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="grant-currency">{t("currency")}</Label>
          <select
            id="grant-currency"
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
        <Label htmlFor="grant-note">{t("note")}</Label>
        <Input id="grant-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button type="submit">{t("grantPoints")}</Button>
    </form>
  );
}

export function DonateForm() {
  const t = useTranslations("finance");
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [kind, setKind] = useState<"MONEY" | "POINTS">("MONEY");
  const [designation, setDesignation] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const major = parseFloat(amount);
    if (!isFinite(major) || major <= 0) {
      setMessage(t("invalidForm"));
      return;
    }
    const res = await fetch("/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountMinor: Math.round(major * 100),
        currency,
        kind,
        designation: designation || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.message ?? t("donateFailed"));
      return;
    }
    setMessage(t("donateSuccess"));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="donate-amount">{t("amount")}</Label>
          <Input id="donate-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="donate-currency">{t("currency")}</Label>
          <select
            id="donate-currency"
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
        <Label htmlFor="donate-kind">{t("donateKind")}</Label>
        <select
          id="donate-kind"
          className="flex h-10 w-full rounded-md border px-2"
          value={kind}
          onChange={(e) => setKind(e.target.value as "MONEY" | "POINTS")}
        >
          <option value="MONEY">{t("money")}</option>
          <option value="POINTS">{t("points")}</option>
        </select>
      </div>
      <div>
        <Label htmlFor="donate-designation">{t("designation")}</Label>
        <Input id="donate-designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button type="submit">{t("donate")}</Button>
    </form>
  );
}
