"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const COMPONENT_KINDS = ["ASSIGNMENT", "QUIZ", "EXAM", "ATTENDANCE", "DISCUSSION", "OTHER"] as const;

interface Component {
  name: string;
  weightPercent: number;
  kind: typeof COMPONENT_KINDS[number];
}

interface Template {
  id: string;
  name: string;
  isDefault: boolean;
  components: Component[];
}

export function AssessmentTemplateEditor({ templates }: { templates: Template[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [components, setComponents] = useState<Component[]>([
    { name: "Assignments", weightPercent: 40, kind: "ASSIGNMENT" },
    { name: "Midterm Exam", weightPercent: 30, kind: "EXAM" },
    { name: "Final Exam", weightPercent: 30, kind: "EXAM" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const totalWeight = components.reduce((acc, c) => acc + c.weightPercent, 0);
  const weightError = Math.abs(totalWeight - 100) > 0.001;

  function updateComponent(index: number, field: keyof Component, value: string | number) {
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  function addComponent() {
    setComponents((prev) => [...prev, { name: "", weightPercent: 0, kind: "ASSIGNMENT" }]);
  }

  function removeComponent(index: number) {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    setError(null);
    const res = await fetch("/api/assessment-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, components }),
    });
    if (res.ok) {
      setCreating(false);
      setNewName("");
      router.refresh();
    } else {
      const err = await res.json() as { message?: string };
      setError(err.message ?? t("common.error"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(!creating)} variant={creating ? "outline" : "default"}>
          {creating ? t("common.cancel") : t("assessmentTemplate.addTemplate")}
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("assessmentTemplate.addTemplate")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("common.appName")}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("assessmentTemplate.components")}</Label>
                <span className={`text-sm font-medium ${weightError ? "text-destructive" : "text-green-600"}`}>
                  {t("assessmentTemplate.weightTotal")}: {totalWeight.toFixed(1)}%
                </span>
              </div>
              {weightError && (
                <p className="text-sm text-destructive">{t("assessmentTemplate.weightError")}</p>
              )}
              {components.map((comp, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-center">
                  <Input
                    placeholder={t("assessmentTemplate.components")}
                    value={comp.name}
                    onChange={(e) => updateComponent(i, "name", e.target.value)}
                    className="col-span-1"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="%"
                    value={comp.weightPercent}
                    onChange={(e) => updateComponent(i, "weightPercent", Number(e.target.value))}
                    className="col-span-1"
                  />
                  <select
                    value={comp.kind}
                    onChange={(e) => updateComponent(i, "kind", e.target.value)}
                    className="col-span-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {COMPONENT_KINDS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => removeComponent(i)} className="col-span-1">
                    {t("common.delete")}
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addComponent}>+ Component</Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={weightError}>{t("common.save")}</Button>
              <Button variant="outline" onClick={() => setCreating(false)}>{t("common.cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
              {template.isDefault && <Badge variant="default">Default</Badge>}
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {template.components.map((c, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{c.name}</span>
                    <span className="text-muted-foreground">{c.weightPercent}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
