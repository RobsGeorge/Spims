"use client";

import Link from "next/link";
import { useState } from "react";
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

interface Semester {
  id: string;
  name: string;
}

interface Offering {
  id: string;
  mode: string;
  status: string;
  seatCapacity: number | null;
  attendanceThresholdPercent: number;
  course: Course;
  semester: Semester | null;
  staff: Array<{ userId: string; role: string; user: { firstName: string; lastName: string } }>;
  _count?: { weeks: number };
}

export function OfferingsTable({
  offerings: initialOfferings,
  courses,
  semesters,
  canManage,
  canSetPricing,
}: {
  offerings: Offering[];
  courses: Course[];
  semesters: Semester[];
  canManage: boolean;
  canSetPricing: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [offerings, setOfferings] = useState(initialOfferings);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    courseId: courses[0]?.id ?? "",
    mode: "COHORT",
    semesterId: semesters[0]?.id ?? "",
    seatCapacity: "",
    attendanceThresholdPercent: 60,
  });
  const [cloneTargetId, setCloneTargetId] = useState("");
  const [cloneSourceId, setCloneSourceId] = useState("");
  const [staffOfferingId, setStaffOfferingId] = useState("");
  const [staffUserId, setStaffUserId] = useState("");
  const [staffRole, setStaffRole] = useState("INSTRUCTOR");
  const [pricingOfferingId, setPricingOfferingId] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [priceEgp, setPriceEgp] = useState("");

  async function createOffering() {
    setError(null);
    const res = await fetch("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: form.courseId,
        mode: form.mode,
        semesterId: form.mode === "COHORT" ? form.semesterId : undefined,
        seatCapacity: form.seatCapacity ? Number(form.seatCapacity) : undefined,
        attendanceThresholdPercent: form.attendanceThresholdPercent,
      }),
    });
    if (!res.ok) {
      setError(t("offerings.saveFailed"));
      return;
    }
    router.refresh();
    const { offering } = (await res.json()) as { offering: Offering };
    setOfferings((prev) => [offering, ...prev]);
  }

  async function cloneContent() {
    setError(null);
    const res = await fetch(`/api/offerings/${cloneTargetId}/clone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceOfferingId: cloneSourceId }),
    });
    if (!res.ok) {
      setError(t("offerings.cloneFailed"));
      return;
    }
    router.refresh();
  }

  async function assignStaff() {
    setError(null);
    const res = await fetch(`/api/offerings/${staffOfferingId}/staff`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staff: [{ userId: staffUserId, role: staffRole }],
      }),
    });
    if (!res.ok) {
      setError(t("offerings.staffFailed"));
      return;
    }
    router.refresh();
  }

  async function savePricing() {
    setError(null);
    const res = await fetch(`/api/offerings/${pricingOfferingId}/pricing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceUsdOverride: priceUsd ? Math.round(Number(priceUsd) * 100) : null,
        priceEgpOverride: priceEgp ? Math.round(Number(priceEgp) * 100) : null,
      }),
    });
    if (!res.ok) {
      setError(t("offerings.pricingFailed"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>{t("offerings.addOffering")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>{t("courses.code")}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("offerings.mode")}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
              >
                <option value="COHORT">{t("offerings.cohort")}</option>
                <option value="SELF_PACED">{t("offerings.selfPaced")}</option>
              </select>
            </div>
            {form.mode === "COHORT" && (
              <div>
                <Label>{t("offerings.semester")}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.semesterId}
                  onChange={(e) => setForm({ ...form, semesterId: e.target.value })}
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label>{t("offerings.seatCapacity")}</Label>
              <Input value={form.seatCapacity} onChange={(e) => setForm({ ...form, seatCapacity: e.target.value })} />
            </div>
            <div>
              <Label>{t("offerings.attendanceThreshold")}</Label>
              <Input type="number" value={form.attendanceThresholdPercent} onChange={(e) => setForm({ ...form, attendanceThresholdPercent: Number(e.target.value) })} />
            </div>
            <Button onClick={createOffering}>{t("common.save")}</Button>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader><CardTitle>{t("offerings.clone")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>{t("offerings.targetOffering")}</Label>
              <Input value={cloneTargetId} onChange={(e) => setCloneTargetId(e.target.value)} />
            </div>
            <div>
              <Label>{t("offerings.sourceOffering")}</Label>
              <Input value={cloneSourceId} onChange={(e) => setCloneSourceId(e.target.value)} />
            </div>
            <Button onClick={cloneContent}>{t("offerings.clone")}</Button>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader><CardTitle>{t("offerings.assignStaff")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>{t("offerings.offeringId")}</Label>
              <Input value={staffOfferingId} onChange={(e) => setStaffOfferingId(e.target.value)} />
            </div>
            <div>
              <Label>{t("offerings.staffUserId")}</Label>
              <Input value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)} />
            </div>
            <div>
              <Label>{t("offerings.staffRole")}</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={staffRole} onChange={(e) => setStaffRole(e.target.value)}>
                <option value="INSTRUCTOR">{t("offerings.instructor")}</option>
                <option value="TA">{t("offerings.ta")}</option>
              </select>
            </div>
            <Button onClick={assignStaff}>{t("common.save")}</Button>
          </CardContent>
        </Card>
      )}

      {canSetPricing && (
        <Card>
          <CardHeader><CardTitle>{t("offerings.pricing")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>{t("offerings.offeringId")}</Label>
              <Input value={pricingOfferingId} onChange={(e) => setPricingOfferingId(e.target.value)} />
            </div>
            <div>
              <Label>{t("offerings.priceUsd")}</Label>
              <Input value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} placeholder="99.00" />
            </div>
            <div>
              <Label>{t("offerings.priceEgp")}</Label>
              <Input value={priceEgp} onChange={(e) => setPriceEgp(e.target.value)} placeholder="500.00" />
            </div>
            <Button onClick={savePricing}>{t("common.save")}</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {offerings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("offerings.noneYet")}</p>
        ) : (
          offerings.map((o) => (
            <Card key={o.id}>
              <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{o.course.code} — {o.course.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {o.mode} · {o.status}
                    {o.semester ? ` · ${o.semester.name}` : ""}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{t("offerings.weeks")}: {o._count?.weeks ?? 0}</Badge>
                    <Badge variant="outline">{t("offerings.attendanceThreshold")}: {o.attendanceThresholdPercent}%</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/${locale}/courses/${o.id}/preview`}>
                    <Button variant="outline" size="sm">{t("offerings.preview")}</Button>
                  </Link>
                  <Link href={`/${locale}/teach/${o.id}/content`}>
                    <Button size="sm">{t("offerings.editContent")}</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
