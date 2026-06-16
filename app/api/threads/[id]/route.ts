import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateThreadSchema } from "@/lib/validation/discussion";
import { updateThread } from "@/lib/services/discussion";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "discussion.moderate");
    const data = await parseBody(req, updateThreadSchema);
    const thread = await updateThread(user, id, data, requestContext(req));
    return NextResponse.json({ thread });
  } catch (err) {
    return errorResponse(err);
  }
}
