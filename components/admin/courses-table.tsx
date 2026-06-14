"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Template {
  id: string;
  name: string;
}

interface Prerequisite {
  prerequisiteId: string;
  prerequisite: { id: string; code: string; title: string };
}

interface Course {
  id: string;
  code: string;
  title: string;
  creditHours: number;
  isFree: boolean;
  defaultPriceUsd: number;
  defaultPriceEgp: number;
  deletedAt: Date | null;
  prerequisites?: Prerequisite[];
}

export function CoursesTable({
  courses,
  templates,
  allCourses,
  interestCounts,
}: {
  courses: Course[];
  templates: Template[];
  allCourses: Course[];
  interestCounts: Record<string, number>;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prerequisiteIds, setPrerequisiteIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    code: "",
    title: "",
    creditHours: 3,
    isFree: false,
    isStandalone: false,
    assessmentTemplateId: "",
  });
  const [error, setError] = useState<string | null>(null);

  function startEditPrerequisites(course: Course) {
    setEditingId(course.id);
    setPrerequisiteIds(course.prerequisites?.map((p) => p.prerequisiteId) ?? []);
  }

  async function handleCreate() {
    setError(null);
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        assessmentTemplateId: form.assessmentTemplateId || undefined,
      }),
    });
    if (res.ok) {
      setCreating(false);
      router.refresh();
    } else {
      const err = await res.json() as { message?: string };
      setError(err.message ?? t("common.error"));
    }
  }

  async function handleSavePrerequisites(courseId: string) {
    setError(null);
    const res = await fetch(`/api/courses/${courseId}/prerequisites`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prerequisiteIds }),
    });
    if (res.ok) {
      setEditingId(null);
      router.refresh();
    } else {
      const err = await res.json() as { message?: string };
      setError(err.message ?? t("common.error"));
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/courses/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(!creating)} variant={creating ? "outline" : "default"}>
          {creating ? t("common.cancel") : t("courses.addCourse")}
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("courses.addCourse")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("courses.code")}</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("courses.creditHours")}</Label>
                <Input type="number" value={form.creditHours} onChange={(e) => setForm({ ...form, creditHours: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("courses.title")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} />
                {t("courses.isFree")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isStandalone} onChange={(e) => setForm({ ...form, isStandalone: e.target.checked })} />
                {t("courses.isStandalone")}
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>{t("courses.assessmentTemplate")}</Label>
              <select
                value={form.assessmentTemplateId}
                onChange={(e) => setForm({ ...form, assessmentTemplateId: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t("courses.noneSelected")}</option>
                {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate}>{t("common.save")}</Button>
              <Button variant="outline" onClick={() => setCreating(false)}>{t("common.cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-start font-medium">{t("courses.code")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("courses.title")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("courses.creditHours")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("courses.interestCount")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <Fragment key={course.id}>
                <tr className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono">{course.code}</td>
                  <td className="px-4 py-3">{course.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{course.creditHours} cr</Badge>
                    {course.isFree && <Badge variant="success" className="ms-1">{t("courses.free")}</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{interestCounts[course.id] ?? 0}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => startEditPrerequisites(course)}>
                        {t("common.edit")}
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/${locale}/admin/translations?entityType=Course&entityId=${course.id}`}>
                          {t("courses.translate")}
                        </Link>
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(course.id)}>
                        {t("common.delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
                {editingId === course.id && (
                  <tr className="border-b bg-muted/20">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="space-y-3">
                        <p className="font-medium">{t("courses.prerequisites")}</p>
                        {prerequisiteIds.map((prereqId, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <select
                              value={prereqId}
                              onChange={(e) =>
                                setPrerequisiteIds((prev) =>
                                  prev.map((id, i) => (i === index ? e.target.value : id)),
                                )
                              }
                              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                            >
                              {allCourses
                                .filter((c) => c.id !== course.id)
                                .map((c) => (
                                  <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                                ))}
                            </select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPrerequisiteIds((prev) => prev.filter((_, i) => i !== index))}
                            >
                              {t("common.delete")}
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const candidate = allCourses.find((c) => c.id !== course.id && !prerequisiteIds.includes(c.id));
                              if (candidate) setPrerequisiteIds((prev) => [...prev, candidate.id]);
                            }}
                          >
                            {t("courses.addPrerequisite")}
                          </Button>
                          <Button size="sm" onClick={() => handleSavePrerequisites(course.id)}>
                            {t("courses.savePrerequisites")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            {t("common.cancel")}
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {courses.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">{t("courses.empty")}</p>
        )}
      </div>
      {error && editingId && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
