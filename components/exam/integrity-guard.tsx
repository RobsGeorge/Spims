"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export function IntegrityGuard({
  enabled,
  attemptId,
  onFocusLoss,
}: {
  enabled: boolean;
  attemptId: string;
  onFocusLoss?: () => void;
}) {
  const t = useTranslations("exam");

  useEffect(() => {
    if (!enabled) return;

    const report = () => {
      onFocusLoss?.();
      void fetch(`/api/attempts/${attemptId}/focus-loss`, { method: "POST" });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") report();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", report);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", report);
    };
  }, [enabled, attemptId, onFocusLoss]);

  useEffect(() => {
    if (!enabled || !document.documentElement.requestFullscreen) return;
    void document.documentElement.requestFullscreen().catch(() => undefined);
    return () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <p className="text-xs text-muted-foreground">{t("integrityNotice")}</p>
  );
}
