"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ContentItem {
  id: string;
  type: string;
  title: string;
  vimeoId: string | null;
  fileUrl: string | null;
  body: string | null;
}

interface Week {
  id: string;
  number: number;
  title: string;
  unlockDate: string | null;
  items: ContentItem[];
}

export function ContentEditor({
  offeringId,
  courseTitle,
  initialWeeks,
}: {
  offeringId: string;
  courseTitle: string;
  initialWeeks: Week[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [weeks, setWeeks] = useState(initialWeeks);
  const [error, setError] = useState<string | null>(null);
  const [weekForm, setWeekForm] = useState({ number: 1, title: "", unlockDate: "" });
  const [itemForm, setItemForm] = useState({
    weekId: initialWeeks[0]?.id ?? "",
    type: "VIDEO",
    title: "",
    vimeoId: "",
    fileUrl: "",
    body: "",
  });

  const canAddItem = weeks.length > 0 && itemForm.weekId !== "";

  async function addWeek() {
    setError(null);
    const res = await fetch(`/api/offerings/${offeringId}/weeks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: weekForm.number,
        title: weekForm.title,
        unlockDate: weekForm.unlockDate || undefined,
        order: weekForm.number,
      }),
    });
    if (!res.ok) {
      setError(t("content.saveFailed"));
      return;
    }
    const { week } = (await res.json()) as { week: Week };
    setWeeks((prev) => [...prev, { ...week, items: [] }].sort((a, b) => a.number - b.number));
    setItemForm((f) => ({ ...f, weekId: week.id }));
    router.refresh();
  }

  async function addItem() {
    if (!canAddItem) {
      setError(t("content.addWeekFirst"));
      return;
    }
    setError(null);
    const payload: Record<string, string> = {
      type: itemForm.type,
      title: itemForm.title,
    };
    if (itemForm.type === "VIDEO") payload.vimeoId = itemForm.vimeoId;
    if (itemForm.type === "READING") payload.fileUrl = itemForm.fileUrl;
    if (itemForm.type === "TEXT") payload.body = itemForm.body;

    const res = await fetch(`/api/weeks/${itemForm.weekId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError(t("content.saveFailed"));
      return;
    }
    const { item } = (await res.json()) as { item: ContentItem };
    setWeeks((prev) =>
      prev.map((w) =>
        w.id === itemForm.weekId ? { ...w, items: [...w.items, item] } : w,
      ),
    );
    router.refresh();
  }

  async function requestUploadUrl(filename: string) {
    const res = await fetch("/api/storage/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offeringId,
        filename,
        contentType: "application/pdf",
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.configured) {
      setError(t("content.storageUnavailable"));
      return null;
    }
    return data as { uploadUrl: string; fileUrl: string };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("content.title")}</h1>
        <p className="text-muted-foreground">{courseTitle}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader><CardTitle>{t("content.addWeek")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>{t("content.weekNumber")}</Label>
            <Input type="number" value={weekForm.number} onChange={(e) => setWeekForm({ ...weekForm, number: Number(e.target.value) })} />
          </div>
          <div>
            <Label>{t("content.weekTitle")}</Label>
            <Input value={weekForm.title} onChange={(e) => setWeekForm({ ...weekForm, title: e.target.value })} />
          </div>
          <div>
            <Label>{t("content.unlockDate")}</Label>
            <Input type="date" value={weekForm.unlockDate} onChange={(e) => setWeekForm({ ...weekForm, unlockDate: e.target.value })} />
          </div>
          <Button onClick={addWeek}>{t("common.save")}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("content.addItem")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t("content.week")}</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              value={itemForm.weekId}
              disabled={weeks.length === 0}
              onChange={(e) => setItemForm({ ...itemForm, weekId: e.target.value })}
            >
              {weeks.length === 0 ? (
                <option value="">{t("content.addWeekFirst")}</option>
              ) : (
                weeks.map((w) => (
                  <option key={w.id} value={w.id}>Week {w.number}: {w.title}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <Label>{t("content.itemType")}</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={itemForm.type}
              onChange={(e) => setItemForm({ ...itemForm, type: e.target.value })}
            >
              <option value="VIDEO">{t("content.video")}</option>
              <option value="READING">{t("content.reading")}</option>
              <option value="TEXT">{t("content.text")}</option>
            </select>
          </div>
          <div>
            <Label>{t("content.itemTitle")}</Label>
            <Input value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} />
          </div>
          {itemForm.type === "VIDEO" && (
            <div>
              <Label>{t("content.vimeoId")}</Label>
              <Input value={itemForm.vimeoId} onChange={(e) => setItemForm({ ...itemForm, vimeoId: e.target.value })} />
            </div>
          )}
          {itemForm.type === "READING" && (
            <div className="space-y-2">
              <Label>{t("content.fileUrl")}</Label>
              <Input value={itemForm.fileUrl} onChange={(e) => setItemForm({ ...itemForm, fileUrl: e.target.value })} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const upload = await requestUploadUrl("reading.pdf");
                  if (upload) setItemForm((f) => ({ ...f, fileUrl: upload.fileUrl }));
                }}
              >
                {t("content.getUploadUrl")}
              </Button>
            </div>
          )}
          {itemForm.type === "TEXT" && (
            <div className="md:col-span-2">
              <Label>{t("content.body")}</Label>
              <textarea
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={itemForm.body}
                onChange={(e) => setItemForm({ ...itemForm, body: e.target.value })}
              />
            </div>
          )}
          <Button onClick={addItem} disabled={!canAddItem}>{t("common.save")}</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {weeks.map((week) => (
          <Card key={week.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Week {week.number}: {week.title}
                {week.unlockDate && (
                  <Badge variant="outline">{new Date(week.unlockDate).toLocaleDateString()}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {week.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("content.noItems")}</p>
              ) : (
                <ul className="space-y-2">
                  {week.items.map((item) => (
                    <li key={item.id} className="text-sm border rounded-md p-3">
                      <Badge variant="secondary" className="mr-2">{item.type}</Badge>
                      {item.title}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
