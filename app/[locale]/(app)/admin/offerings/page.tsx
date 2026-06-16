import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { authorize, can } from "@/lib/auth/authorize";
import { listCourses } from "@/lib/services/course";
import { listSemesters } from "@/lib/services/semester";
import { listOfferings } from "@/lib/services/offering";
import { OfferingsTable } from "@/components/admin/offerings-table";

export default async function AdminOfferingsPage() {
  const t = await getTranslations();
  const session = await requireSession();

  const canManage = can(session, "offering.manage");
  const canSetPricing = can(session, "offering.setPricing");

  if (!canManage && !canSetPricing) {
    await authorize(session, "offering.editContent");
  }

  const [{ items: offerings }, { items: courses }, semesters] = await Promise.all([
    listOfferings(session, { limit: 100 }),
    listCourses({ limit: 200 }),
    canManage ? listSemesters() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("offerings.title")}</h1>
      </div>
      <OfferingsTable
        offerings={offerings.map((o) => ({
          ...o,
          staff: o.staff.map((s) => ({
            userId: s.userId,
            role: s.role,
            user: s.user,
          })),
        }))}
        courses={courses}
        semesters={semesters}
        canManage={canManage}
        canSetPricing={canSetPricing}
      />
    </div>
  );
}
