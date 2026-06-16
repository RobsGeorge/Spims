import { getTranslations } from "next-intl/server";
import { requireAppSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getDiscussionBoard } from "@/lib/services/discussion";
import { DiscussionBoardPanel } from "@/components/discussion/discussion-board-panel";

export default async function TeachDiscussionsPage({
  params,
}: {
  params: Promise<{ offeringId: string }>;
}) {
  const t = await getTranslations("discussion");
  const session = await requireAppSession();
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
