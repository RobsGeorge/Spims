"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function InterestButton({
  courseId,
  initialFlagged,
}: {
  courseId: string;
  initialFlagged: boolean;
}) {
  const t = useTranslations();
  const [flagged, setFlagged] = useState(initialFlagged);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const method = flagged ? "DELETE" : "POST";
    const res = await fetch(`/api/courses/${courseId}/interest`, { method });
    if (res.ok) {
      setFlagged(!flagged);
    }
    setLoading(false);
  }

  return (
    <Button
      size="sm"
      variant={flagged ? "default" : "outline"}
      onClick={toggle}
      disabled={loading}
    >
      {flagged ? t("courses.unflagInterest") : t("courses.flagInterest")}
    </Button>
  );
}
