import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getStudentTranscript } from "@/lib/services/grading";
import { errorResponse, AppError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;

    if (id !== user.id) {
      await authorize(user, "transcript.viewAny");
    } else {
      await authorize(user, "transcript.viewOwn");
    }

    const records = await getStudentTranscript(id);
    return NextResponse.json({ records });
  } catch (err) {
    return errorResponse(err);
  }
}
