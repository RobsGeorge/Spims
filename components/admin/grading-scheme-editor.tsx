"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GradeBand {
  id?: string;
  letter: string;
  minPercent: number;
  maxPercent: number;
  gpaPoints: number;
  isPassing: boolean;
}

interface GradingScheme {
  id: string;
  name: string;
  isDefault: boolean;
  bands: GradeBand[];
}

export function GradingSchemeEditor({ schemes }: { schemes: GradingScheme[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [bands, setBands] = useState<GradeBand[]>([
    { letter: "A", minPercent: 90, maxPercent: 100, gpaPoints: 4.0, isPassing: true },
    { letter: "B", minPercent: 80, maxPercent: 89, gpaPoints: 3.0, isPassing: true },
    { letter: "F", minPercent: 0, maxPercent: 59, gpaPoints: 0.0, isPassing: false },
  ]);
  const [error, setError] = useState<string | null>(null);

  function updateBand(index: number, field: keyof GradeBand, value: string | number | boolean) {
    setBands((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  }

  function addBand() {
    setBands((prev) => [...prev, { letter: "", minPercent: 0, maxPercent: 0, gpaPoints: 0, isPassing: true }]);
  }

  function removeBand(index: number) {
    setBands((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    setError(null);
    const res = await fetch("/api/grading-schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, bands }),
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
          {creating ? t("common.cancel") : t("gradingScheme.addScheme")}
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("gradingScheme.addScheme")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("common.appName")}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("gradingScheme.addScheme")} />
            </div>
            <div className="space-y-2">
              <Label>{t("gradingScheme.bands")}</Label>
              {bands.map((band, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 items-center">
                  <Input
                    placeholder={t("gradingScheme.letter")}
                    value={band.letter}
                    onChange={(e) => updateBand(i, "letter", e.target.value)}
                    className="col-span-1"
                  />
                  <Input
                    type="number"
                    placeholder="Min %"
                    value={band.minPercent}
                    onChange={(e) => updateBand(i, "minPercent", Number(e.target.value))}
                    className="col-span-1"
                  />
                  <Input
                    type="number"
                    placeholder="Max %"
                    value={band.maxPercent}
                    onChange={(e) => updateBand(i, "maxPercent", Number(e.target.value))}
                    className="col-span-1"
                  />
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="GPA"
                    value={band.gpaPoints}
                    onChange={(e) => updateBand(i, "gpaPoints", Number(e.target.value))}
                    className="col-span-1"
                  />
                  <label className="flex items-center gap-1 text-sm col-span-1">
                    <input
                      type="checkbox"
                      checked={band.isPassing}
                      onChange={(e) => updateBand(i, "isPassing", e.target.checked)}
                    />
                    {t("gradingScheme.isPassing")}
                  </label>
                  <Button size="sm" variant="outline" onClick={() => removeBand(i)} className="col-span-1">
                    {t("common.delete")}
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addBand}>+ Band</Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate}>{t("common.save")}</Button>
              <Button variant="outline" onClick={() => setCreating(false)}>{t("common.cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {schemes.map((scheme) => (
          <Card key={scheme.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{scheme.name}</CardTitle>
              {scheme.isDefault && <Badge variant="default">{t("gradingScheme.setDefault")}</Badge>}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{scheme.bands.length} {t("gradingScheme.bands")}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
