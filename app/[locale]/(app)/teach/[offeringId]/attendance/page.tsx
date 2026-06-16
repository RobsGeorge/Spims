import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listOfferingSessions } from "@/lib/services/session";
import { AttendancePanel } from "@/components/attendance/attendance-panel";

export default async function TeachAttendancePage({
  params,
}: {
  params: Promise<{ offeringId: string }>;
}) {
  const t = await getTranslations("attendance");
  const session = await requireSession();
  await authorize(session, "attendance.import");
  const { offeringId } = await params;

  const sessions = await listOfferingSessions(offeringId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <AttendancePanel
        offeringId={offeringId}
        sessions={sessions.map((s) => ({
          ...s,
          scheduledStart: s.scheduledStart.toISOString(),
        }))}
      />
    </div>
  );
}
