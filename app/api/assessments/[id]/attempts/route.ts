import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getAssessmentById, assertStudentEnrolled } from "@/lib/services/assessment";
import { startAttempt } from "@/lib/services/attempt";
import { db } from "@/lib/db";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse, AppError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "assessment.take");
    const assessment = await getAssessmentById(id);
    await assertStudentEnrolled(user.id, assessment.offeringId);
    const attempt = await startAttempt(user, id, requestContext(req));
    const full = await db.assessmentAttempt.findUnique({ where: { id: attempt.id } });
    return NextResponse.json({ attempt: full }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
