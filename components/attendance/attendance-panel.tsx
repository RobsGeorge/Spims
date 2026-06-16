"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SessionRow = {
  id: string;
  title: string;
  scheduledStart: string;
  durationMinutes: number;
};

type AttendanceRow = {
  id: string;
  status: string;
  minutesAttended: number;
  student: { id: string; firstName: string; lastName: string; email: string };
};

export function AttendancePanel({
  offeringId,
  sessions: initialSessions,
}: {
  offeringId: string;
  sessions: SessionRow[];
}) {
  const t = useTranslations("attendance");
  const [sessions] = useState(initialSessions);
  const [selectedId, setSelectedId] = useState(initialSessions[0]?.id ?? "");
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadAttendance(sessionId: string) {
    setSelectedId(sessionId);
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance`);
      const data = await res.json();
      if (res.ok) setRecords(data.records ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function importZoom() {
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${selectedId}/attendance/import`, { method: "POST", body: "{}" });
      const data = await res.json();
      if (res.ok) setRecords(data.records ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function overrideStatus(studentId: string, status: "PRESENT" | "ABSENT") {
    if (!selectedId) return;
    const res = await fetch(`/api/sessions/${selectedId}/attendance`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, status }),
    });
    const data = await res.json();
    if (res.ok) await loadAttendance(selectedId);
    else console.error(data);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {sessions.map((s) => (
          <Button
            key={s.id}
            variant={selectedId === s.id ? "default" : "outline"}
            size="sm"
            onClick={() => loadAttendance(s.id)}
          >
            {s.title}
          </Button>
        ))}
      </div>
      {selectedId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t("title")}</CardTitle>
            <Button size="sm" variant="outline" onClick={importZoom} disabled={loading}>
              {t("importZoom")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 text-sm border-b py-2">
                <span>{r.student.firstName} {r.student.lastName}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "PRESENT" ? "default" : "secondary"}>{r.status}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => overrideStatus(r.student.id, "PRESENT")}>P</Button>
                  <Button size="sm" variant="ghost" onClick={() => overrideStatus(r.student.id, "ABSENT")}>A</Button>
                </div>
              </div>
            ))}
            {records.length === 0 && !loading && <p className="text-sm text-muted-foreground">{t("noRecords")}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
