import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { overrideDiscussionGradesSchema } from "@/lib/validation/discussion";
import { overrideThreadGrades } from "@/lib/services/discussion";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "discussion.grade");
    const data = await parseBody(req, overrideDiscussionGradesSchema);
    const grades = await overrideThreadGrades(user, id, data, requestContext(req));
    return NextResponse.json({ grades });
  } catch (err) {
    return errorResponse(err);
  }
}
