import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { saveAnswerSchema } from "@/lib/validation/assessment";
import { saveAttemptAnswer } from "@/lib/services/attempt";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "assessment.take");
    const data = await parseBody(req, saveAnswerSchema);
    const answer = await saveAttemptAnswer(user, id, data, requestContext(req));
    return NextResponse.json({ answer });
  } catch (err) {
    return errorResponse(err);
  }
}
