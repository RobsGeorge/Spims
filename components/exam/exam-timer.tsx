"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function ExamTimer({ dueAt }: { dueAt: string }) {
  const t = useTranslations("exam");
  const [remainingMs, setRemainingMs] = useState(() => new Date(dueAt).getTime() - Date.now());

  useEffect(() => {
    const tick = () => setRemainingMs(new Date(dueAt).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dueAt]);

  const expired = remainingMs <= 0;
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;

  return (
    <div
      className={`rounded-md px-4 py-2 text-sm font-mono tabular-nums ${
        expired ? "bg-destructive text-destructive-foreground" : "bg-muted"
      }`}
      aria-live="polite"
    >
      {expired ? t("timeExpired") : t("timeRemaining", { min, sec: sec.toString().padStart(2, "0") })}
    </div>
  );
}
