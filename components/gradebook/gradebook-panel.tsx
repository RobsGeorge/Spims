"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GradeRow = {
  student: { id: string; firstName: string; lastName: string; email: string };
  enrollmentId: string;
  gradeStatus: string;
  percent: number | null;
  components: Array<{ id: string; name: string; percent: number | null; weightPercent: number }>;
};

export function GradebookPanel({
  offeringId,
  initialRows,
  canLock,
  canReopen,
}: {
  offeringId: string;
  initialRows: GradeRow[];
  canLock: boolean;
  canReopen: boolean;
}) {
  const t = useTranslations("gradebook");
  const [rows, setRows] = useState(initialRows);
  const [message, setMessage] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState("");

  async function lockGrades() {
    setMessage(null);
    const res = await fetch(`/api/offerings/${offeringId}/grades/submit`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.message ?? t("lockFailed"));
      return;
    }
    setMessage(t("lockSuccess", { count: data.result.locked }));
    const gb = await fetch(`/api/offerings/${offeringId}/gradebook`);
    const gbData = await gb.json();
    setRows(gbData.rows ?? rows);
  }

  async function reopenGrades() {
    setMessage(null);
    const res = await fetch(`/api/offerings/${offeringId}/grades/reopen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reopenReason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.message ?? t("reopenFailed"));
      return;
    }
    setMessage(t("reopenSuccess", { count: data.result.reopened }));
  }

  return (
    <div className="space-y-4">
      {canLock && (
        <Button onClick={() => void lockGrades()}>{t("submitLock")}</Button>
      )}
      {canReopen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("reopenTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={t("reopenReason")}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
            />
            <Button variant="outline" onClick={() => void reopenGrades()}>
              {t("reopen")}
            </Button>
          </CardContent>
        </Card>
      )}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-start">{t("student")}</th>
              <th className="px-3 py-2 text-start">{t("overall")}</th>
              <th className="px-3 py-2 text-start">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.enrollmentId} className="border-b">
                <td className="px-3 py-2">
                  {row.student.firstName} {row.student.lastName}
                </td>
                <td className="px-3 py-2">
                  {row.percent != null ? `${row.percent.toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-2">{row.gradeStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
