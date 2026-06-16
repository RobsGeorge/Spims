import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateDiscussionBoardSchema } from "@/lib/validation/discussion";
import { getDiscussionBoard, updateDiscussionBoard } from "@/lib/services/discussion";
import { assertOfferingContentAccess } from "@/lib/services/offeringScope";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "discussion.post");
    const board = await getDiscussionBoard(id);
    return NextResponse.json({ board });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "discussion.configure", {
      scopeCheck: async () => {
        await assertOfferingContentAccess(user.id, id, user.roles);
        return true;
      },
    });
    const data = await parseBody(req, updateDiscussionBoardSchema);
    const board = await updateDiscussionBoard(user, id, data, requestContext(req));
    return NextResponse.json({ board });
  } catch (err) {
    return errorResponse(err);
  }
}
