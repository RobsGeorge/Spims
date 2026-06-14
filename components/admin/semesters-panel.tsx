"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  semesters: Semester[];
}

interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  registrationStart: string;
  registrationEnd: string;
  addDropEndWeek: number;
  lastWithdrawalWeek: number;
  withdrawalRefundPercent: number;
}

export function SemestersPanel({ years: initialYears }: { years: AcademicYear[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [years, setYears] = useState(initialYears);
  const [error, setError] = useState<string | null>(null);
  const [yearForm, setYearForm] = useState({ name: "", startDate: "", endDate: "" });
  const [semesterForm, setSemesterForm] = useState({
    academicYearId: initialYears[0]?.id ?? "",
    name: "",
    startDate: "",
    endDate: "",
    registrationStart: "",
    registrationEnd: "",
    addDropEndWeek: 2,
    lastWithdrawalWeek: 10,
    withdrawalRefundPercent: 50,
  });

  async function createYear() {
    setError(null);
    const res = await fetch("/api/academic-years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(yearForm),
    });
    if (!res.ok) {
      setError(t("semesters.saveFailed"));
      return;
    }
    router.refresh();
    const { year } = (await res.json()) as { year: AcademicYear };
    setYears((prev) => [{ ...year, semesters: [] }, ...prev]);
    setSemesterForm((f) => ({ ...f, academicYearId: year.id }));
    setYearForm({ name: "", startDate: "", endDate: "" });
  }

  async function createSemester() {
    setError(null);
    const res = await fetch("/api/semesters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(semesterForm),
    });
    if (!res.ok) {
      setError(t("semesters.saveFailed"));
      return;
    }
    router.refresh();
    const { semester } = (await res.json()) as { semester: Semester & { academicYearId: string } };
    setYears((prev) =>
      prev.map((y) =>
        y.id === semester.academicYearId
          ? { ...y, semesters: [...y.semesters, semester] }
          : y,
      ),
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{t("semesters.addYear")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>{t("semesters.yearName")}</Label>
            <Input value={yearForm.name} onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })} />
          </div>
          <div>
            <Label>{t("semesters.startDate")}</Label>
            <Input type="date" value={yearForm.startDate} onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })} />
          </div>
          <div>
            <Label>{t("semesters.endDate")}</Label>
            <Input type="date" value={yearForm.endDate} onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })} />
          </div>
          <Button onClick={createYear}>{t("common.save")}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("semesters.addSemester")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t("semesters.academicYear")}</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={semesterForm.academicYearId}
              onChange={(e) => setSemesterForm({ ...semesterForm, academicYearId: e.target.value })}
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t("semesters.name")}</Label>
            <Input value={semesterForm.name} onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })} />
          </div>
          <div>
            <Label>{t("semesters.startDate")}</Label>
            <Input type="date" value={semesterForm.startDate} onChange={(e) => setSemesterForm({ ...semesterForm, startDate: e.target.value })} />
          </div>
          <div>
            <Label>{t("semesters.endDate")}</Label>
            <Input type="date" value={semesterForm.endDate} onChange={(e) => setSemesterForm({ ...semesterForm, endDate: e.target.value })} />
          </div>
          <div>
            <Label>{t("semesters.registrationStart")}</Label>
            <Input type="date" value={semesterForm.registrationStart} onChange={(e) => setSemesterForm({ ...semesterForm, registrationStart: e.target.value })} />
          </div>
          <div>
            <Label>{t("semesters.registrationEnd")}</Label>
            <Input type="date" value={semesterForm.registrationEnd} onChange={(e) => setSemesterForm({ ...semesterForm, registrationEnd: e.target.value })} />
          </div>
          <div>
            <Label>{t("semesters.addDropEndWeek")}</Label>
            <Input type="number" value={semesterForm.addDropEndWeek} onChange={(e) => setSemesterForm({ ...semesterForm, addDropEndWeek: Number(e.target.value) })} />
          </div>
          <div>
            <Label>{t("semesters.lastWithdrawalWeek")}</Label>
            <Input type="number" value={semesterForm.lastWithdrawalWeek} onChange={(e) => setSemesterForm({ ...semesterForm, lastWithdrawalWeek: Number(e.target.value) })} />
          </div>
          <div>
            <Label>{t("semesters.withdrawalRefundPercent")}</Label>
            <Input type="number" value={semesterForm.withdrawalRefundPercent} onChange={(e) => setSemesterForm({ ...semesterForm, withdrawalRefundPercent: Number(e.target.value) })} />
          </div>
          <Button onClick={createSemester}>{t("common.save")}</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {years.map((year) => (
          <Card key={year.id}>
            <CardHeader>
              <CardTitle>{year.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {year.semesters.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("semesters.noneYet")}</p>
              ) : (
                <ul className="space-y-2">
                  {year.semesters.map((s) => (
                    <li key={s.id} className="text-sm border rounded-md p-3">
                      <strong>{s.name}</strong> — {t("semesters.registrationWindow")}:{" "}
                      {new Date(s.registrationStart).toLocaleDateString()} –{" "}
                      {new Date(s.registrationEnd).toLocaleDateString()}; {t("semesters.addDropEndWeek")}: {s.addDropEndWeek};{" "}
                      {t("semesters.refund")}: {s.withdrawalRefundPercent}%
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
