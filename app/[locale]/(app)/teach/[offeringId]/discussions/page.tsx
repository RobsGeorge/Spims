import { useTranslations } from "next-intl";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getDiscussionBoard } from "@/lib/services/discussion";
import { DiscussionBoardPanel } from "@/components/discussion/discussion-board-panel";

export default async function TeachDiscussionsPage({
  params,
}: {
  params: Promise<{ offeringId: string }>;
}) {
  const t = useTranslations("discussion");
  const session = await requireSession();
  await authorize(session, "discussion.post");
  const { offeringId } = await params;

  const board = await getDiscussionBoard(offeringId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <DiscussionBoardPanel boardId={board.id} />
    </div>
  );
}
