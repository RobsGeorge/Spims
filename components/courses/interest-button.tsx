"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

export function InterestButton({
  courseId,
  initialFlagged,
}: {
  courseId: string;
  initialFlagged: boolean;
}) {
  const t = useTranslations();
  const { toast } = useToast();
  const [flagged, setFlagged] = useState(initialFlagged);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = !flagged;
    const method = flagged ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/courses/${courseId}/interest`, { method });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: err.message,
        });
        return;
      }
      setFlagged(next);
    } catch {
      toast({ variant: "destructive", title: t("common.error") });
    } finally {
      setLoading(false);
    }
  }

  const label = flagged ? t("courses.unflagInterest") : t("courses.flagInterest");

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-pressed={flagged}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        flagged
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-surface-high hover:text-foreground",
      )}
    >
      <Star
        className={cn("h-4 w-4 transition-colors", flagged && "fill-gold text-gold")}
        aria-hidden="true"
      />
      {label}
    </button>
  );
}
