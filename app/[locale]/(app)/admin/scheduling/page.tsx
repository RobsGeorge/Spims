import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listAllSessions } from "@/lib/services/session";
import { listOfferings } from "@/lib/services/offering";
import { LiveSessionCalendar } from "@/components/sessions/live-session-calendar";

export default async function AdminSchedulingPage() {
  const t = await getTranslations("session");
  const session = await requireSession();
  await authorize(session, "session.schedule");

  const [sessions, { items: offerings }] = await Promise.all([
    listAllSessions(),
    listOfferings(session, { limit: 100 }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("schedulerTitle")}</h1>
      <LiveSessionCalendar
        initialSessions={sessions.map((s) => ({
          ...s,
          scheduledStart: s.scheduledStart.toISOString(),
        }))}
        offerings={offerings.map((o) => ({
          id: o.id,
          label: `${o.course.code} — ${o.course.title}`,
        }))}
      />
    </div>
  );
}
