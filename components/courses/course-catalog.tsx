"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InterestButton } from "./interest-button";

interface Course {
  id: string;
  code: string;
  title: string;
  creditHours: number;
  isFree: boolean;
  defaultPriceUsd: number;
  flagged: boolean;
}

export function CourseCatalog({ courses }: { courses: Course[] }) {
  const t = useTranslations();

  if (courses.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{t("courses.empty")}</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Card key={course.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground font-mono">{course.code}</p>
                <CardTitle className="text-base mt-1">{course.title}</CardTitle>
              </div>
              {course.isFree ? (
                <Badge variant="success">{t("courses.free")}</Badge>
              ) : (
                <Badge variant="outline">${(course.defaultPriceUsd / 100).toFixed(2)}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{course.creditHours} cr</span>
            <InterestButton courseId={course.id} initialFlagged={course.flagged} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
