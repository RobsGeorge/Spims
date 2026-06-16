import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { enqueueJob } from "@/lib/jobs/queue";
import { db } from "@/lib/db";
import { errorResponse, AppError } from "@/lib/errors";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "assessment.grade");
    const attempt = await db.assessmentAttempt.findUnique({ where: { id } });
    if (!attempt) throw AppError.notFound("Attempt");
    await enqueueJob("ai-essay-grade", { attemptId: id });
    return NextResponse.json({ queued: true });
  } catch (err) {
    return errorResponse(err);
  }
}
