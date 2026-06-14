"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Field {
  label: string;
  type: string;
  required: boolean;
  order: number;
  options: string[];
  allowedFileTypes: string[];
  adminNote: string | null;
}

export function ApplicationFormEditor({
  programId,
  initialForm,
}: {
  programId: string;
  initialForm: { name: string; fields: Field[] } | null;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [name, setName] = useState(initialForm?.name ?? "Application");
  const [fields, setFields] = useState<Field[]>(initialForm?.fields ?? []);
  const [error, setError] = useState<string | null>(null);

  function addField() {
    setFields((f) => [
      ...f,
      {
        label: "",
        type: "TEXT",
        required: false,
        order: f.length,
        options: [],
        allowedFileTypes: [],
        adminNote: "",
      },
    ]);
  }

  async function save() {
    setError(null);
    const res = await fetch(`/api/programs/${programId}/application-form`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, fields }),
    });
    if (!res.ok) {
      setError(t("admissions.saveFailed"));
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t("admissions.formBuilder")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div>
          <Label>{t("admissions.formName")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {fields.map((field, i) => (
          <div key={i} className="grid gap-2 border rounded-md p-3 md:grid-cols-2">
            <Input
              placeholder={t("admissions.fieldLabel")}
              value={field.label}
              onChange={(e) => {
                const next = [...fields];
                next[i] = { ...field, label: e.target.value };
                setFields(next);
              }}
            />
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={field.type}
              onChange={(e) => {
                const next = [...fields];
                next[i] = { ...field, type: e.target.value };
                setFields(next);
              }}
            >
              <option value="TEXT">TEXT</option>
              <option value="TEXTAREA">TEXTAREA</option>
              <option value="FILE">FILE</option>
              <option value="DATE">DATE</option>
            </select>
            <Input
              placeholder={t("admissions.adminNote")}
              value={field.adminNote ?? ""}
              onChange={(e) => {
                const next = [...fields];
                next[i] = { ...field, adminNote: e.target.value };
                setFields(next);
              }}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => {
                  const next = [...fields];
                  next[i] = { ...field, required: e.target.checked };
                  setFields(next);
                }}
              />
              {t("admissions.required")}
            </label>
          </div>
        ))}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={addField}>{t("admissions.addField")}</Button>
          <Button type="button" onClick={save}>{t("common.save")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
