"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/ui/empty-state";

interface WaitlistEntry {
  enrollmentId: string;
  enrolledAt: string | Date;
  student: { id: string; email: string; firstName: string; lastName: string };
}

interface OfferingRow {
  id: string;
  mode: string;
  seatCapacity: number | null;
  course: { id: string; code: string; title: string };
  semester: { id: string; name: string } | null;
  enrolledCount: number;
  waitlistCount: number;
  waitlist: WaitlistEntry[];
}

interface UserHit {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function EnrollmentConsole({ offerings }: { offerings: OfferingRow[] }) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [overrideOfferingId, setOverrideOfferingId] = useState<string | null>(null);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentHits, setStudentHits] = useState<UserHit[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserHit | null>(null);
  const [reason, setReason] = useState("");
  const [searching, setSearching] = useState(false);

  async function promote(offeringId: string) {
    setPending(`promote-${offeringId}`);
    try {
      const res = await fetch(`/api/offerings/${offeringId}/waitlist/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", title: t("enrollment.promoteFailed"), description: data.message });
        return;
      }
      toast({
        variant: "success",
        title: t("enrollment.promoteSuccess", { count: data.promoted ?? 1 }),
      });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: t("enrollment.promoteFailed") });
    } finally {
      setPending(null);
    }
  }

  async function searchStudents() {
    const q = studentQuery.trim();
    if (q.length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", title: t("enrollment.studentSearchFailed") });
        return;
      }
      setStudentHits(data.users ?? []);
    } catch {
      toast({ variant: "destructive", title: t("enrollment.studentSearchFailed") });
    } finally {
      setSearching(false);
    }
  }

  async function submitOverride() {
    if (!overrideOfferingId || !selectedStudent || reason.trim().length < 1) return;
    setPending(`override-${overrideOfferingId}`);
    try {
      const res = await fetch(`/api/offerings/${overrideOfferingId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          reason: reason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", title: t("enrollment.overrideFailed"), description: data.message });
        return;
      }
      toast({ variant: "success", title: t("enrollment.overrideSuccess") });
      setOverrideOfferingId(null);
      setSelectedStudent(null);
      setReason("");
      setStudentQuery("");
      setStudentHits([]);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: t("enrollment.overrideFailed") });
    } finally {
      setPending(null);
    }
  }

  if (offerings.length === 0) {
    return (
      <EmptyState
        title={t("enrollment.adminEmpty")}
        description={t("enrollment.adminEmptyHint")}
        className="min-h-[240px] rounded-xl border-border/60 bg-card shadow-soft"
      />
    );
  }

  return (
    <div className="space-y-4">
      {offerings.map((offering) => (
        <Card key={offering.id}>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span>
                {offering.course.code} — {offering.course.title}
              </span>
              <Badge variant="outline">{offering.mode}</Badge>
              {offering.semester && <Badge variant="secondary">{offering.semester.name}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("enrollment.seatSummary", {
                enrolled: offering.enrolledCount,
                capacity: offering.seatCapacity ?? t("enrollment.unlimited"),
                waitlist: offering.waitlistCount,
              })}
            </p>
            {offering.waitlist.length > 0 && (
              <ul className="space-y-1 text-sm">
                {offering.waitlist.map((entry, index) => (
                  <li key={entry.enrollmentId} className="text-muted-foreground">
                    #{index + 1} {entry.student.firstName} {entry.student.lastName} ({entry.student.email})
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={offering.waitlistCount === 0 || pending === `promote-${offering.id}`}
                onClick={() => promote(offering.id)}
              >
                {pending === `promote-${offering.id}`
                  ? t("common.loading")
                  : t("enrollment.promoteWaitlist")}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setOverrideOfferingId(offering.id);
                  setSelectedStudent(null);
                  setReason("");
                }}
              >
                {t("enrollment.overrideEnroll")}
              </Button>
            </div>

            {overrideOfferingId === offering.id && (
              <div className="mt-2 space-y-3 rounded-lg border border-border/60 bg-surface-low p-4">
                <div className="space-y-2">
                  <Label htmlFor={`student-search-${offering.id}`}>{t("enrollment.studentSearch")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`student-search-${offering.id}`}
                      value={studentQuery}
                      onChange={(e) => setStudentQuery(e.target.value)}
                      placeholder={t("enrollment.studentSearchPlaceholder")}
                    />
                    <Button type="button" variant="outline" disabled={searching} onClick={searchStudents}>
                      {searching ? t("common.loading") : t("common.search")}
                    </Button>
                  </div>
                  {studentHits.length > 0 && (
                    <ul className="max-h-40 overflow-y-auto rounded-md border border-border/60 bg-card">
                      {studentHits.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-start text-sm hover:bg-accent"
                            onClick={() => {
                              setSelectedStudent(u);
                              setStudentHits([]);
                              setStudentQuery(`${u.firstName} ${u.lastName} <${u.email}>`);
                            }}
                          >
                            {u.firstName} {u.lastName} — {u.email}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {selectedStudent && (
                    <p className="text-sm text-foreground">
                      {t("enrollment.selectedStudent", {
                        name: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
                      })}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`override-reason-${offering.id}`}>{t("enrollment.overrideReason")}</Label>
                  <Input
                    id={`override-reason-${offering.id}`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setOverrideOfferingId(null)}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      !selectedStudent ||
                      reason.trim().length < 1 ||
                      pending === `override-${offering.id}`
                    }
                    onClick={submitOverride}
                  >
                    {pending === `override-${offering.id}`
                      ? t("common.loading")
                      : t("enrollment.confirmOverride")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
