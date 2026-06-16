"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export function IntegrityGuard({
  logFocusLoss,
  enforceFullScreen,
  attemptId,
  onFocusLoss,
}: {
  logFocusLoss: boolean;
  enforceFullScreen: boolean;
  attemptId: string;
  onFocusLoss?: () => void;
}) {
  const t = useTranslations("exam");

  useEffect(() => {
    if (!logFocusLoss) return;

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
  }, [logFocusLoss, attemptId, onFocusLoss]);

  useEffect(() => {
    if (!enforceFullScreen || !document.documentElement.requestFullscreen) return;
    void document.documentElement.requestFullscreen().catch(() => undefined);
    return () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [enforceFullScreen]);

  return logFocusLoss ? (
    <p className="text-xs text-muted-foreground px-4">{t("integrityNotice")}</p>
  ) : null;
}
