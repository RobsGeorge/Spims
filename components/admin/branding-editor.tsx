"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Theme {
  id: string;
  name: string;
  siteName: string;
  isActive: boolean;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  tokens: unknown;
}

export function BrandingEditor({ themes }: { themes: Theme[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSiteName, setNewSiteName] = useState("Spims");
  const [newTokens, setNewTokens] = useState("{}");
  const [error, setError] = useState<string | null>(null);

  async function handleActivate(id: string) {
    await fetch(`/api/themes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    router.refresh();
  }

  async function handleCreate() {
    setError(null);
    let tokens: Record<string, string>;
    try {
      tokens = JSON.parse(newTokens) as Record<string, string>;
    } catch {
      setError("Invalid JSON for tokens");
      return;
    }
    const res = await fetch("/api/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, siteName: newSiteName, tokens }),
    });
    if (res.ok) {
      setCreating(false);
      setNewName("");
      setNewTokens("{}");
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
          {creating ? t("common.cancel") : t("branding.newTheme")}
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("branding.newTheme")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("common.appName")}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Theme name" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("branding.siteName")}</Label>
              <Input value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("branding.tokens")}</Label>
              <textarea
                className="w-full h-28 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={newTokens}
                onChange={(e) => setNewTokens(e.target.value)}
                placeholder={t("branding.tokenHint")}
              />
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
        {themes.map((theme) => (
          <Card key={theme.id} className={theme.isActive ? "border-primary" : undefined}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium">{theme.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{theme.siteName}</p>
              </div>
              {theme.isActive && <Badge variant="default">Active</Badge>}
            </CardHeader>
            <CardContent>
              {!theme.isActive && (
                <Button size="sm" variant="outline" onClick={() => handleActivate(theme.id)}>
                  {t("branding.activate")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {themes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">{t("branding.themes")}</p>
      )}
    </div>
  );
}
