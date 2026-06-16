"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function SessionJoinButton({ sessionId }: { sessionId: string }) {
  const t = useTranslations("session");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/join`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? data.error ?? "Join failed");
      window.open(data.joinUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("joinError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button size="sm" onClick={handleJoin} disabled={loading}>
        {loading ? t("joining") : t("joinSession")}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
