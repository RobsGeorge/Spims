"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Application {
  id: string;
  status: string;
  program: { name: string };
  applicant?: { firstName: string; lastName: string; email: string };
}

export function ApplicationsQueue({ applications }: { applications: Application[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, decision: string) {
    setError(null);
    const res = await fetch(`/api/applications/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, decisionNote: note || undefined }),
    });
    if (!res.ok) {
      setError(t("admissions.decideFailed"));
      return;
    }
    setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {applications.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("admissions.noApplications")}</p>
      ) : (
        applications.map((app) => (
          <Card key={app.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {app.program.name}
                <Badge variant="outline">{app.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {app.applicant && (
                <p className="text-sm text-muted-foreground">
                  {app.applicant.firstName} {app.applicant.lastName} — {app.applicant.email}
                </p>
              )}
              {["SUBMITTED", "UNDER_REVIEW"].includes(app.status) && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => decide(app.id, "ACCEPTED")}>{t("admissions.accept")}</Button>
                  <Button size="sm" variant="outline" onClick={() => decide(app.id, "REJECTED")}>{t("admissions.reject")}</Button>
                  <Button size="sm" variant="secondary" onClick={() => decide(app.id, "WAITLISTED")}>{t("admissions.waitlist")}</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
