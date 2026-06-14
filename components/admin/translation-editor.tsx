"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Translation {
  id: string;
  entityType: string;
  entityId: string;
  field: string;
  locale: string;
  value: string;
  source: "AI" | "HUMAN";
  verified: boolean;
}

const LOCALES = ["en", "ar", "fr"] as const;

export function TranslationEditor({
  translations,
  entityType,
  entityId,
}: {
  translations: Translation[];
  entityType: string;
  entityId: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTranslation, setNewTranslation] = useState({
    field: "title",
    locale: "ar" as (typeof LOCALES)[number],
    value: "",
  });

  async function handleSave(trans: Translation) {
    const value = editing[trans.id];
    if (value === undefined) return;
    const res = await fetch("/api/translations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: trans.entityType,
        entityId: trans.entityId,
        field: trans.field,
        locale: trans.locale,
        value,
      }),
    });
    if (res.ok) {
      setEditing((prev) => { const n = { ...prev }; delete n[trans.id]; return n; });
      router.refresh();
    } else {
      const err = await res.json() as { message?: string };
      setError(err.message ?? t("common.error"));
    }
  }

  async function handleCreate() {
    setError(null);
    const res = await fetch("/api/translations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        entityId,
        field: newTranslation.field,
        locale: newTranslation.locale,
        value: newTranslation.value,
      }),
    });
    if (res.ok) {
      setNewTranslation({ field: "title", locale: "ar", value: "" });
      router.refresh();
    } else {
      const err = await res.json() as { message?: string };
      setError(err.message ?? t("common.error"));
    }
  }

  async function handleVerify(id: string) {
    const res = await fetch("/api/translations/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ translationId: id }),
    });
    if (res.ok) router.refresh();
  }

  async function handleAiTrigger(field: string, locale: string) {
    const key = `${field}:${locale}`;
    setAiLoading(key);
    setError(null);
    const res = await fetch("/api/translations/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType, entityId, field, locale }),
    });
    setAiLoading(null);
    if (res.ok) {
      const data = await res.json() as { skipped?: boolean };
      if (data.skipped) setError(t("translations.aiSkipped"));
      else router.refresh();
    }
  }

  if (!entityType || !entityId) {
    return <p className="text-sm text-muted-foreground">{t("translations.paramsRequired")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4 space-y-3">
        <p className="font-medium">{t("translations.addTranslation")}</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label>{t("translations.field")}</Label>
            <Input
              value={newTranslation.field}
              onChange={(e) => setNewTranslation((prev) => ({ ...prev, field: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("translations.locale")}</Label>
            <select
              value={newTranslation.locale}
              onChange={(e) => setNewTranslation((prev) => ({ ...prev, locale: e.target.value as (typeof LOCALES)[number] }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {LOCALES.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("translations.value")}</Label>
            <Input
              value={newTranslation.value}
              onChange={(e) => setNewTranslation((prev) => ({ ...prev, value: e.target.value }))}
            />
          </div>
        </div>
        <Button size="sm" onClick={handleCreate}>{t("common.save")}</Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-start font-medium">{t("translations.field")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("translations.locale")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("translations.value")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("translations.source")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {translations.map((trans) => {
              const key = `${trans.field}:${trans.locale}`;
              const isEditing = trans.id in editing;
              return (
                <tr key={trans.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{trans.field}</td>
                  <td className="px-4 py-3 font-mono text-xs">{trans.locale}</td>
                  <td className="px-4 py-3 max-w-xs">
                    {isEditing ? (
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm resize-none"
                        value={editing[trans.id]}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [trans.id]: e.target.value }))}
                        rows={2}
                      />
                    ) : (
                      <span className="text-muted-foreground">{trans.value}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={trans.source === "AI" ? "warning" : "outline"}>{trans.source}</Badge>
                    {trans.verified && <Badge variant="success" className="ms-1">{t("translations.verified")}</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={() => handleSave(trans)}>{t("common.save")}</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditing((prev) => { const n = { ...prev }; delete n[trans.id]; return n; })}>{t("common.cancel")}</Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setEditing((prev) => ({ ...prev, [trans.id]: trans.value }))}>{t("common.edit")}</Button>
                      )}
                      {!trans.verified && (
                        <Button size="sm" variant="outline" onClick={() => handleVerify(trans.id)}>{t("translations.verify")}</Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={aiLoading === key}
                        onClick={() => handleAiTrigger(trans.field, trans.locale)}
                      >
                        {aiLoading === key ? "…" : t("translations.aiTranslate")}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {translations.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">{t("translations.noneYet")}</p>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
