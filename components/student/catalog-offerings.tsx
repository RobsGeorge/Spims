"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Offering {
  id: string;
  mode: string;
  course: { code: string; title: string; isFree: boolean; isStandalone: boolean };
  semester: { name: string } | null;
}

export function CatalogOfferings({
  offerings,
  studentProgramId,
}: {
  offerings: Offering[];
  studentProgramId?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function enroll(offeringId: string) {
    setMessage(null);
    const res = await fetch(`/api/offerings/${offeringId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentProgramId,
        acknowledgeScheduleConflict: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.message ?? t("enrollment.failed"));
      return;
    }
    setMessage(
      data.enrollment?.status === "WAITLISTED"
        ? t("enrollment.waitlisted")
        : t("enrollment.success"),
    );
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {offerings.map((o) => (
        <Card key={o.id}>
          <CardContent className="pt-6 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{o.course.code} — {o.course.title}</p>
              <p className="text-sm text-muted-foreground">
                {o.mode}{o.semester ? ` · ${o.semester.name}` : ""}
              </p>
              <Badge variant="outline" className="mt-1">{o.course.isFree ? t("courses.free") : t("enrollment.paid")}</Badge>
            </div>
            <Button size="sm" onClick={() => enroll(o.id)}>{t("enrollment.enroll")}</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
