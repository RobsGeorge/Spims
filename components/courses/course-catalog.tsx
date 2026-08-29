"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { InterestButton } from "./interest-button";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  code: string;
  title: string;
  creditHours: number;
  isFree: boolean;
  defaultPriceUsd: number;
  flagged: boolean;
}

type Filter = "all" | "free" | "paid";

export function CourseCatalog({ courses }: { courses: Course[] }) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (filter === "free" && !c.isFree) return false;
      if (filter === "paid" && c.isFree) return false;
      if (!q) return true;
      return c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    });
  }, [courses, query, filter]);

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: t("courses.filterAll") },
    { value: "free", label: t("courses.filterFree") },
    { value: "paid", label: t("courses.filterPaid") },
  ];

  function resetFilters() {
    setQuery("");
    setFilter("all");
  }

  if (courses.length === 0) {
    return (
      <EmptyState
        title={t("courses.empty")}
        description={t("courses.emptyHint")}
        className="min-h-[280px] rounded-xl border-border/60 bg-card shadow-soft"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-sm items-center gap-2 rounded-full border border-border/60 bg-surface-low ps-4 pe-3 py-2 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("courses.search")}
            aria-label={t("courses.search")}
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
        {t("courses.resultCount", { count: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title={t("courses.noMatch")}
          description={t("courses.noMatchHint")}
          className="min-h-[240px] rounded-xl border-border/60 bg-card shadow-soft"
          action={
            <Button type="button" variant="outline" onClick={resetFilters}>
              {t("courses.resetFilters")}
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <li
              key={course.id}
              className="group flex flex-col rounded-xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-float"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-primary">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                {course.isFree ? (
                  <Badge variant="accent">{t("courses.free")}</Badge>
                ) : (
                  <Badge variant="outline" className="tabular-nums">
                    ${(course.defaultPriceUsd / 100).toFixed(2)}
                  </Badge>
                )}
              </div>

              <h3 className="mt-4 font-semibold leading-snug text-foreground line-clamp-2">
                {course.title}
              </h3>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {course.code} · {t("courses.credits", { count: course.creditHours })}
              </p>

              <div className="mt-4 flex items-center justify-end border-t border-border/50 pt-3">
                <InterestButton courseId={course.id} initialFlagged={course.flagged} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Skeleton grid for courses/catalog loading states. */
export function CatalogSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="h-11 w-full max-w-sm animate-pulse rounded-full bg-surface-mid" />
        <div className="h-11 w-48 animate-pulse rounded-full bg-surface-mid" />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <li
            key={i}
            className="rounded-xl border border-border/60 bg-card p-5 shadow-soft"
          >
            <div className="flex justify-between">
              <div className="h-11 w-11 animate-pulse rounded-lg bg-surface-mid" />
              <div className="h-6 w-14 animate-pulse rounded-full bg-surface-mid" />
            </div>
            <div className="mt-4 h-5 w-[75%] animate-pulse rounded bg-surface-mid" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-surface-mid" />
            <div className="mt-4 border-t border-border/50 pt-3">
              <div className="ms-auto h-8 w-28 animate-pulse rounded-full bg-surface-mid" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
