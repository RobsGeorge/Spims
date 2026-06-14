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

interface Course {
  id: string;
  code: string;
  title: string;
}

interface GradingScheme {
  id: string;
  name: string;
}

interface ProgramCourse {
  courseId: string;
  requirement: "REQUIRED" | "ELECTIVE";
  yearLevel: number | null;
  course: Course;
}

interface Program {
  id: string;
  code: string;
  name: string;
  type: string;
  maxCreditsPerSemester: number;
  maxCoursesPerSemester: number;
  maxSemestersToGraduate: number;
  electiveCreditsRequired: number;
  signatoryName: string | null;
  signatoryTitle: string | null;
  gradingSchemeId: string | null;
  programCourses: ProgramCourse[];
  deletedAt: Date | null;
}

interface RequirementDraft {
  courseId: string;
  requirement: "REQUIRED" | "ELECTIVE";
  yearLevel?: number;
}

export function ProgramsTable({
  programs,
  gradingSchemes,
  courses,
}: {
  programs: Program[];
  gradingSchemes: GradingScheme[];
  courses: Course[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<RequirementDraft[]>([]);
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "DIPLOMA",
    maxCreditsPerSemester: 18,
    maxCoursesPerSemester: 6,
    maxSemestersToGraduate: 8,
    electiveCreditsRequired: 0,
    signatoryName: "",
    signatoryTitle: "",
    gradingSchemeId: "",
  });
  const [error, setError] = useState<string | null>(null);

  function startEditRequirements(program: Program) {
    setEditingId(program.id);
    setRequirements(
      program.programCourses.map((pc) => ({
        courseId: pc.courseId,
        requirement: pc.requirement,
        ...(pc.yearLevel != null && { yearLevel: pc.yearLevel }),
      })),
    );
  }

  function addRequirementRow() {
    const firstCourse = courses[0];
    if (!firstCourse) return;
    setRequirements((prev) => [
      ...prev,
      { courseId: firstCourse.id, requirement: "REQUIRED" as const },
    ]);
  }

  async function handleCreate() {
    setError(null);
    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        gradingSchemeId: form.gradingSchemeId || undefined,
        signatoryName: form.signatoryName || undefined,
        signatoryTitle: form.signatoryTitle || undefined,
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

  async function handleSaveRequirements(programId: string) {
    setError(null);
    const res = await fetch(`/api/programs/${programId}/requirements`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirements }),
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
    await fetch(`/api/programs/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(!creating)} variant={creating ? "outline" : "default"}>
          {creating ? t("common.cancel") : t("programs.addProgram")}
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("programs.addProgram")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("programs.code")}</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("programs.type")}</Label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="DIPLOMA">DIPLOMA</option>
                  <option value="CERTIFICATE">CERTIFICATE</option>
                  <option value="DEGREE">DEGREE</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("programs.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>{t("programs.maxCredits")}</Label>
                <Input type="number" value={form.maxCreditsPerSemester} onChange={(e) => setForm({ ...form, maxCreditsPerSemester: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("programs.maxCourses")}</Label>
                <Input type="number" value={form.maxCoursesPerSemester} onChange={(e) => setForm({ ...form, maxCoursesPerSemester: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("programs.maxSemesters")}</Label>
                <Input type="number" value={form.maxSemestersToGraduate} onChange={(e) => setForm({ ...form, maxSemestersToGraduate: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>{t("programs.electiveCredits")}</Label>
                <Input type="number" value={form.electiveCreditsRequired} onChange={(e) => setForm({ ...form, electiveCreditsRequired: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("programs.signatoryName")}</Label>
                <Input value={form.signatoryName} onChange={(e) => setForm({ ...form, signatoryName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("programs.signatoryTitle")}</Label>
                <Input value={form.signatoryTitle} onChange={(e) => setForm({ ...form, signatoryTitle: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("programs.gradingScheme")}</Label>
              <select
                value={form.gradingSchemeId}
                onChange={(e) => setForm({ ...form, gradingSchemeId: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t("courses.noneSelected")}</option>
                {gradingSchemes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              <th className="px-4 py-3 text-start font-medium">{t("programs.code")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("programs.name")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("programs.type")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("programs.requirements")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((program) => (
              <Fragment key={program.id}>
                <tr key={program.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono">{program.code}</td>
                  <td className="px-4 py-3">{program.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{program.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {program.programCourses.length} {t("programs.requirements").toLowerCase()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => startEditRequirements(program)}>
                        {t("common.edit")}
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/${locale}/admin/translations?entityType=Program&entityId=${program.id}`}>
                          {t("programs.translate")}
                        </Link>
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(program.id)}>
                        {t("common.delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
                {editingId === program.id && (
                  <tr key={`${program.id}-req`} className="border-b bg-muted/20">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="space-y-3">
                        <p className="font-medium">{t("programs.requirements")}</p>
                        {requirements.map((req, index) => (
                          <div key={index} className="flex flex-wrap items-center gap-2">
                            <select
                              value={req.courseId}
                              onChange={(e) =>
                                setRequirements((prev) =>
                                  prev.map((r, i) => (i === index ? { ...r, courseId: e.target.value } : r)),
                                )
                              }
                              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                            >
                              {courses.map((c) => (
                                <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                              ))}
                            </select>
                            <select
                              value={req.requirement}
                              onChange={(e) =>
                                setRequirements((prev) =>
                                  prev.map((r, i) =>
                                    i === index ? { ...r, requirement: e.target.value as "REQUIRED" | "ELECTIVE" } : r,
                                  ),
                                )
                              }
                              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                            >
                              <option value="REQUIRED">{t("programs.required")}</option>
                              <option value="ELECTIVE">{t("programs.elective")}</option>
                            </select>
                            <Input
                              type="number"
                              className="w-20"
                              placeholder={t("programs.yearLevel")}
                              value={req.yearLevel ?? ""}
                              onChange={(e) =>
                                setRequirements((prev) =>
                                  prev.map((r, i) =>
                                    i === index
                                      ? { ...r, yearLevel: e.target.value ? Number(e.target.value) : undefined }
                                      : r,
                                  ),
                                )
                              }
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRequirements((prev) => prev.filter((_, i) => i !== index))}
                            >
                              {t("common.delete")}
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={addRequirementRow}>
                            {t("programs.addRequirement")}
                          </Button>
                          <Button size="sm" onClick={() => handleSaveRequirements(program.id)}>
                            {t("programs.saveRequirements")}
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
        {programs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">{t("programs.noneSelected")}</p>
        )}
      </div>
      {error && editingId && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
