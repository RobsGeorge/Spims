"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { GraduationCap, Search } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface StudentProgramOption {
  id: string;
  programName: string;
}

interface Offering {
  id: string;
  mode: string;
  course: { code: string; title: string; isFree: boolean; isStandalone: boolean };
  semester: { name: string } | null;
  waitlist: boolean;
  warnings: string[];
}

type Filter = "all" | "free" | "paid";

export function CatalogOfferings({
  offerings,
  studentPrograms,
  initialStudentProgramId,
}: {
  offerings: Offering[];
  studentPrograms: StudentProgramOption[];
  initialStudentProgramId?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [studentProgramId, setStudentProgramId] = useState(
    initialStudentProgramId ?? studentPrograms[0]?.id ?? "",
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offerings.filter((o) => {
      if (filter === "free" && !o.course.isFree) return false;
      if (filter === "paid" && o.course.isFree) return false;
      if (!q) return true;
      return (
        o.course.title.toLowerCase().includes(q) ||
        o.course.code.toLowerCase().includes(q) ||
        (o.semester?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [offerings, query, filter]);

  const confirmOffering = offerings.find((o) => o.id === confirmId);
  const hasScheduleConflict = (confirmOffering?.warnings.length ?? 0) > 0;

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: t("courses.filterAll") },
    { value: "free", label: t("courses.filterFree") },
    { value: "paid", label: t("courses.filterPaid") },
  ];

  async function enroll(offeringId: string, acknowledgeScheduleConflict: boolean) {
    setPending(offeringId);
    setConfirmId(null);
    try {
      const res = await fetch(`/api/offerings/${offeringId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentProgramId: studentProgramId || undefined,
          acknowledgeScheduleConflict,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const details =
          data.details && typeof data.details === "object"
            ? (data.details as { code?: string })
            : undefined;
        if (details?.code === "SCHEDULE_CONFLICT") {
          toast({
            variant: "destructive",
            title: t("enrollment.scheduleConflict"),
            description: t("enrollment.scheduleConflictHint"),
          });
          setConfirmId(offeringId);
          return;
        }
        toast({ variant: "destructive", title: t("enrollment.failed"), description: data.message });
        return;
      }
      const waitlisted = data.enrollment?.status === "WAITLISTED";
      toast({
        variant: waitlisted ? "default" : "success",
        title: waitlisted ? t("enrollment.waitlisted") : t("enrollment.success"),
      });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: t("enrollment.failed") });
    } finally {
      setPending(null);
    }
  }

  function resetFilters() {
    setQuery("");
    setFilter("all");
  }

  if (offerings.length === 0) {
    return (
      <EmptyState
        title={t("enrollment.empty")}
        description={t("enrollment.emptyHint")}
        className="min-h-[280px] rounded-xl border-border/60 bg-card shadow-soft"
      />
    );
  }

  return (
    <div className="space-y-5">
      {studentPrograms.length > 1 && (
        <div className="flex flex-col gap-2 sm:max-w-sm">
          <label htmlFor="student-program" className="text-sm font-medium text-foreground">
            {t("enrollment.selectProgram")}
          </label>
          <select
            id="student-program"
            value={studentProgramId}
            onChange={(e) => {
              setStudentProgramId(e.target.value);
              router.replace(`?studentProgramId=${e.target.value}`);
              router.refresh();
            }}
            className="rounded-lg border border-border/60 bg-surface-low px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {studentPrograms.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.programName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-sm items-center gap-2 rounded-full border border-border/60 bg-surface-low ps-4 pe-3 py-2 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("enrollment.search")}
            aria-label={t("enrollment.search")}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
        <div
          className="inline-flex shrink-0 rounded-full border border-border/60 bg-surface-low p-1"
          role="tablist"
          aria-label={t("courses.filterAll")}
        >
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === f.value
                  ? "bg-card text-primary shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("enrollment.resultCount", { count: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title={t("enrollment.noMatch")}
          description={t("enrollment.noMatchHint")}
          className="min-h-[240px] rounded-xl border-border/60 bg-card shadow-soft"
          action={
            <Button type="button" variant="outline" onClick={resetFilters}>
              {t("courses.resetFilters")}
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => (
            <li
              key={o.id}
              className="flex flex-col rounded-xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-float"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-primary">
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="flex flex-wrap justify-end gap-1">
                  <Badge variant={o.course.isFree ? "accent" : "outline"}>
                    {o.course.isFree ? t("courses.free") : t("enrollment.paid")}
                  </Badge>
                  {o.waitlist && <Badge variant="warning">{t("enrollment.waitlistBadge")}</Badge>}
                </div>
              </div>

              <h3 className="mt-4 font-semibold leading-snug text-foreground line-clamp-2">
                {o.course.title}
              </h3>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {o.course.code} · {o.mode}
                {o.semester ? ` · ${o.semester.name}` : ""}
              </p>

              <div className="mt-5 flex items-center justify-end border-t border-border/50 pt-4">
                <Button size="sm" onClick={() => setConfirmId(o.id)} disabled={pending === o.id}>
                  {pending === o.id
                    ? t("common.loading")
                    : o.waitlist
                      ? t("enrollment.joinWaitlist")
                      : t("enrollment.enroll")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!confirmId} onOpenChange={(open) => !open && setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasScheduleConflict
                ? t("enrollment.confirmConflictTitle")
                : t("enrollment.confirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {confirmOffering
                ? hasScheduleConflict
                  ? t("enrollment.confirmConflictDescription", {
                      title: confirmOffering.course.title,
                    })
                  : t("enrollment.confirmDescription", { title: confirmOffering.course.title })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmId(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!confirmId || pending === confirmId}
              onClick={() => confirmId && enroll(confirmId, hasScheduleConflict)}
            >
              {pending === confirmId
                ? t("common.loading")
                : hasScheduleConflict
                  ? t("enrollment.enrollAnyway")
                  : t("enrollment.enroll")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
