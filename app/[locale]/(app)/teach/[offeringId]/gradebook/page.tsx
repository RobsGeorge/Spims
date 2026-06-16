import { RoleType } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { requireAppSession } from "@/lib/auth/session";
import { authorize, can } from "@/lib/auth/authorize";
import { getOfferingGradebook } from "@/lib/services/gradebook";
import { GradebookPanel } from "@/components/gradebook/gradebook-panel";

export default async function TeachGradebookPage({
  params,
}: {
  params: Promise<{ offeringId: string }>;
}) {
  const t = await getTranslations("gradebook");
  const session = await requireAppSession();
  await authorize(session, "gradebook.enterGrades");
  const { offeringId } = await params;

  const rows = await getOfferingGradebook(offeringId, false);
  const canLock = can(session, "grade.lock");
  const canReopen =
    session.roles.includes(RoleType.ACADEMIC_ADMIN) ||
    session.roles.includes(RoleType.SUPER_ADMIN);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <GradebookPanel
        offeringId={offeringId}
        initialRows={rows}
        canLock={canLock}
        canReopen={canReopen}
      />
    </div>
  );
}
