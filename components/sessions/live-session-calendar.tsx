"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SessionRow = {
  id: string;
  title: string;
  scheduledStart: string;
  durationMinutes: number;
  offeringId: string;
  zoomMeetingId: string | null;
  offering?: { course: { code: string; title: string } };
};

type OfferingOption = { id: string; label: string };

export function LiveSessionCalendar({
  initialSessions,
  offerings,
}: {
  initialSessions: SessionRow[];
  offerings: OfferingOption[];
}) {
  const t = useTranslations("session");
  const [sessions, setSessions] = useState(initialSessions);
  const [offeringId, setOfferingId] = useState(offerings[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/offerings/${offeringId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          scheduledStart: new Date(scheduledStart).toISOString(),
          durationMinutes: parseInt(durationMinutes, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? data.error ?? "Failed");
      setSessions((prev) =>
        [...prev, { ...data.session, offering: offerings.find((o) => o.id === offeringId) ? { course: { code: "", title: offerings.find((o) => o.id === offeringId)!.label } } : undefined }].sort(
          (a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime(),
        ),
      );
      setTitle("");
      setScheduledStart("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("scheduleSession")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={offeringId}
              onChange={(e) => setOfferingId(e.target.value)}
              required
            >
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <Input placeholder={t("sessionTitle")} value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} required />
            <Input type="number" min={15} max={480} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} required />
            <Button type="submit" disabled={loading || !offeringId} className="md:col-span-2">
              {loading ? t("creating") : t("createSession")}
            </Button>
          </form>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {sessions.map((s) => (
          <Card key={s.id}>
            <CardContent className="py-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">
                  {s.offering?.course.code} {s.offering?.course.title} · {new Date(s.scheduledStart).toLocaleString()} · {s.durationMinutes}m
                </p>
              </div>
              {s.zoomMeetingId && <Badge variant="secondary">{t("zoomLinked")}</Badge>}
            </CardContent>
          </Card>
        ))}
        {sessions.length === 0 && <p className="text-sm text-muted-foreground">{t("noSessions")}</p>}
      </div>
    </div>
  );
}
