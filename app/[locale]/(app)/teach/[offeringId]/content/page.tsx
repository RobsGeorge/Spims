import { RoleType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getOfferingById } from "@/lib/services/offering";
import { listWeeks } from "@/lib/services/content";
import { assertOfferingContentAccess } from "@/lib/services/offeringScope";
import { ContentEditor } from "@/components/teach/content-editor";

export default async function TeachContentPage({
  params,
}: {
  params: Promise<{ offeringId: string }>;
}) {
  const session = await requireSession();
  const { offeringId } = await params;

  const isAca =
    session.roles.includes(RoleType.ACADEMIC_ADMIN) ||
    session.roles.includes(RoleType.SUPER_ADMIN);

  if (isAca) {
    await authorize(session, "offering.editContent");
  } else {
    await authorize(session, "offering.editContent", {
      scopeCheck: async () => {
        await assertOfferingContentAccess(session.id, offeringId, session.roles);
        return true;
      },
    });
  }

  const [offering, weeks] = await Promise.all([
    getOfferingById(offeringId),
    listWeeks(offeringId),
  ]);

  return (
    <ContentEditor
      offeringId={offeringId}
      courseTitle={`${offering.course.code} — ${offering.course.title}`}
      initialWeeks={weeks.map((w) => ({
        ...w,
        unlockDate: w.unlockDate?.toISOString() ?? null,
      }))}
    />
  );
}
