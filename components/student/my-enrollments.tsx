"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EnrollmentRow {
  id: string;
  status: string;
  action: "drop" | "withdraw" | null;
  courseCode: string;
  courseTitle: string;
  semesterName: string | null;
  mode: string;
}

export function MyEnrollments({ enrollments }: { enrollments: EnrollmentRow[] }) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: "drop" | "withdraw" } | null>(null);

  async function executeAction() {
    if (!confirm) return;
    setPendingId(confirm.id);
    try {
      const res = await fetch(`/api/enrollments/${confirm.id}/${confirm.action}`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: t(`enrollment.${confirm.action}Failed`),
          description: data.message,
        });
        return;
      }
      toast({
        variant: "success",
        title: t(`enrollment.${confirm.action}Success`),
        description:
          typeof data.refundedMinor === "number" && data.refundedMinor > 0
            ? t("enrollment.refundNote")
            : undefined,
      });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: t(`enrollment.${confirm.action}Failed`) });
    } finally {
      setPendingId(null);
      setConfirm(null);
    }
  }

  if (enrollments.length === 0) {
    return (
      <EmptyState
        title={t("enrollment.noEnrollments")}
        description={t("enrollment.noEnrollmentsHint")}
        className="min-h-[240px] rounded-xl border-border/60 bg-card shadow-soft"
      />
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {enrollments.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-soft"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">{row.courseTitle}</p>
              <p className="text-xs text-muted-foreground">
                {row.courseCode} · {row.mode}
                {row.semesterName ? ` · ${row.semesterName}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{row.status}</Badge>
              {row.action === "drop" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingId === row.id}
                  onClick={() => setConfirm({ id: row.id, action: "drop" })}
                >
                  {t("enrollment.drop")}
                </Button>
              )}
              {row.action === "withdraw" && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pendingId === row.id}
                  onClick={() => setConfirm({ id: row.id, action: "withdraw" })}
                >
                  {t("enrollment.withdraw")}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.action === "withdraw"
                ? t("enrollment.confirmWithdrawTitle")
                : t("enrollment.confirmDropTitle")}
            </DialogTitle>
            <DialogDescription>
              {confirm?.action === "withdraw"
                ? t("enrollment.confirmWithdrawDescription")
                : t("enrollment.confirmDropDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant={confirm?.action === "withdraw" ? "destructive" : "default"}
              disabled={!confirm || pendingId === confirm.id}
              onClick={executeAction}
            >
              {pendingId ? t("common.loading") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
