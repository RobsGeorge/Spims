import { db } from "@/lib/db";

/** Pick the next round-robin reviewer and bump their lastReviewedAt. */
export async function assignRoundRobinReviewer() {
  const reviewer = await db.user.findFirst({
    where: { isReviewer: true, status: "ACTIVE", deletedAt: null },
    orderBy: [{ lastReviewedAt: "asc" }, { createdAt: "asc" }],
  });
  if (!reviewer) return null;

  await db.user.update({
    where: { id: reviewer.id },
    data: { lastReviewedAt: new Date() },
  });
  return reviewer;
}
