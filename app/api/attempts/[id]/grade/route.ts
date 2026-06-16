import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { gradeAttemptSchema } from "@/lib/validation/assessment";
import { gradeAttemptAnswers } from "@/lib/services/attempt";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "assessment.grade");
    const data = await parseBody(req, gradeAttemptSchema);
    const attempt = await gradeAttemptAnswers(user, id, data.grades, requestContext(req));
    return NextResponse.json({ attempt });
  } catch (err) {
    return errorResponse(err);
  }
}
